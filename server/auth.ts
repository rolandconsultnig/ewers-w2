import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import express, { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { getPermissionsForRole } from "./role-permissions";
import { getEffectivePermissionIdsForUser, isDepartmentId } from "@shared/department-access";
import { db } from "./db";
import { passwordResetTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "ewers-jwt-secret";
const JWT_EXPIRES = (process.env.JWT_EXPIRES || "7d") as jwt.SignOptions["expiresIn"];
const activeSessionByUserId = new Map<number, string>();
const activeTokenVersionByUserId = new Map<number, number>();

function getOrCreateTokenVersion(userId: number): number {
  const current = activeTokenVersionByUserId.get(userId);
  if (typeof current === "number") return current;
  activeTokenVersionByUserId.set(userId, 1);
  return 1;
}

function rotateTokenVersion(userId: number): number {
  const next = (activeTokenVersionByUserId.get(userId) ?? 0) + 1;
  activeTokenVersionByUserId.set(userId, next);
  return next;
}

export function generateJWT(user: SelectUser, tokenVersion?: number): string {
  const sessionVersion = tokenVersion ?? getOrCreateTokenVersion(user.id);
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, securityLevel: user.securityLevel, sessionVersion },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyJWT(token: string): { id: number; username: string; role: string; securityLevel: number; sessionVersion?: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; securityLevel: number };
    return decoded;
  } catch {
    return null;
  }
}

export type SafeUser = Omit<SelectUser, "password"> & {
  password?: never;
  effectivePermissions: string[];
};

/** Return user for API responses: strip password; include department-scoped effectivePermissions. */
export function toSafeUser(user: SelectUser): SafeUser {
  const { password: _p, ...rest } = user;
  const effectivePermissions = getEffectivePermissionIdsForUser(user);
  return { ...rest, effectivePermissions };
}

// RBAC: Super Admin (7), Supervisor (5+), Field Agent (1-4)
export function requireRole(allowedRoles: string[], minSecurityLevel?: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = req.user as SelectUser | undefined;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    const hasRole = allowedRoles.includes(user.role) || (user.role === "admin" && allowedRoles.includes("super_admin"));
    const hasLevel = minSecurityLevel == null || user.securityLevel >= minSecurityLevel;
    if (!hasRole || !hasLevel) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

/** Feature permission after role + department scope. Admin bypasses department. */
export function hasPermission(user: SelectUser | undefined, permissionId: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const effective = getEffectivePermissionIdsForUser(user);
  return effective.includes(permissionId);
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored || !stored.includes(".")) return false;
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    if (hashedBuf.length !== suppliedBuf.length) return false;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch {
    return false;
  }
}

export function setupAuth(app: Express) {
  // In production, cookie.secure=true so browser only sends cookie over HTTPS.
  // If your app is behind HTTP (no SSL), set COOKIE_SECURE=false in .env so login/session work.
  const cookieSecure = process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production';
  // In development, use in-memory session by default so app works without a session table.
  // Set USE_PG_SESSION=1 to use Postgres session store in development.
  // Set FORCE_MEMORY_SESSION=1 in production to bypass Postgres session store (e.g. if `session` table fails).
  const forceMemorySession =
    process.env.FORCE_MEMORY_SESSION === "1" || process.env.USE_MEMORY_SESSION === "1";
  const useMemorySession =
    forceMemorySession ||
    (process.env.NODE_ENV === "development" && process.env.USE_PG_SESSION !== "1");
  const sessionStore = useMemorySession ? new session.MemoryStore() : storage.sessionStore;
  if (useMemorySession) {
    console.warn(
      forceMemorySession
        ? "[auth] Using in-memory session store (FORCE_MEMORY_SESSION). Remove after fixing Postgres session store."
        : "[auth] Using in-memory session store (dev). Set USE_PG_SESSION=1 for Postgres.",
    );
  }

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'ewers-secret-key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: cookieSecure,
      sameSite: 'lax',
    }
  };

  app.set("trust proxy", 1);
  // Skip session for Socket.io handshake so /socket.io requests don't hit DB (avoids 500 when store fails)
  app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    const sessionMw = session(sessionSettings);
    sessionMw(req, res, (err: unknown) => {
      if (err) {
        console.warn("[auth] Session error:", err instanceof Error ? err.message : err);
        return next(); // continue without session so /api/user returns null and JWT/login can still work
      }
      next();
    });
  });
  app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    passport.initialize()(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    passport.session()(req, res, (err: unknown) => {
      if (err) {
        console.warn("[auth] Passport session error:", err instanceof Error ? err.message : err);
        return next();
      }
      next();
    });
  });

  // JWT auth fallback - if no session user, try Bearer token (skip for socket.io)
  app.use(async (req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    if (req.user) return next();
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) {
      try {
        const payload = verifyJWT(token);
        if (payload) {
          const activeVersion = activeTokenVersionByUserId.get(payload.id);
          if (typeof activeVersion === "number" && payload.sessionVersion !== activeVersion) {
            return next();
          }
          const user = await storage.getUser(payload.id);
          if (user && user.active !== false) req.user = user;
        }
      } catch (err) {
        return next(err);
      }
    }
    next();
  });

  // Ensure isAuthenticated works for both session and JWT (req.user presence)
  app.use((req, _res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    const orig = req.isAuthenticated.bind(req);
    (req as any).isAuthenticated = function (): boolean {
      return !!req.user || orig();
    };
    next();
  });

  // Enforce one active session per user (latest login wins).
  app.use((req, _res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    const user = req.user as SelectUser | undefined;
    if (!user || !req.sessionID) return next();
    const activeSid = activeSessionByUserId.get(user.id);
    if (!activeSid) {
      activeSessionByUserId.set(user.id, req.sessionID);
      return next();
    }
    if (activeSid !== req.sessionID) {
      req.logout(() => {
        if (req.session) {
          req.session.destroy(() => next());
        } else {
          next();
        }
      });
      return;
    }
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || user.active === false || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err, false, { message: "Authentication error" });
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    if (user && user.active === false) return done(null, false);
    done(null, user);
  });

  // JWT strategy - supports Authorization: Bearer <token>
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET,
      },
      async (
        payload: { id: number },
        done: (error: unknown, user?: SelectUser | false | null, info?: unknown) => void,
      ) => {
        const user = await storage.getUser(payload.id);
        done(null, user || false);
      }
    )
  );

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(toSafeUser(user));
    });
  });
  
  // Add a new endpoint for creating users by administrators/high-clearance users
  app.post("/api/user/create", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Feature permission based access (department + role scoped)
    const currentUser = req.user as SelectUser;
    if (!hasPermission(currentUser, "user_management")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const role = req.body.role || "user";
      const permissions = Array.isArray(req.body.permissions) && req.body.permissions.length > 0
        ? req.body.permissions
        : await getPermissionsForRole(role);
      const deptRaw = req.body.department;
      const deptNorm = typeof deptRaw === "string" ? deptRaw.trim().toLowerCase() : "";
      if (!isDepartmentId(deptNorm)) {
        return res.status(400).json({
          error: "department is required and must be one of: early_warning, election_monitoring, communications, administration",
        });
      }
      const newUser = await storage.createUser({
        ...req.body,
        department: deptNorm,
        password: await hashPassword(req.body.password || "password123"),
        permissions,
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Admin: reset a user's password (hashed)
  app.post("/api/users/:id/reset-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    if (!hasPermission(currentUser, "user_management")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const id = parseInt(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid user id" });

    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await storage.getUser(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    try {
      const hashed = await hashPassword(newPassword);
      const updated = await storage.updateUser(id, { password: hashed });
      res.json({ ok: true, user: { ...updated, password: undefined } });
    } catch (error) {
      console.error("Failed to reset password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Custom callback so failed login returns JSON (production-friendly; avoids empty 401 body)
  const loginHandler = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    passport.authenticate("local", (err: Error | null, user: SelectUser | false, info: { message?: string }) => {
      if (err) {
        console.error("[auth] /api/login strategy error:", err);
        return res.status(500).json({
          error:
            process.env.NODE_ENV === "production"
              ? "Server error during login. Check database connectivity and server logs."
              : err.message || "Authentication error",
        });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("[auth] req.login / session store error:", loginErr);
          return res.status(500).json({
            error:
              process.env.NODE_ENV === "production"
                ? "Could not create session. If using Postgres sessions, ensure the `session` table exists or set FORCE_MEMORY_SESSION=1 temporarily."
                : (loginErr as Error).message,
          });
        }
        try {
          const tokenVersion = rotateTokenVersion(user.id);
          const previousSid = activeSessionByUserId.get(user.id);
          if (previousSid && previousSid !== req.sessionID) {
            storage.sessionStore.destroy(previousSid, () => {});
          }
          if (req.sessionID) {
            activeSessionByUserId.set(user.id, req.sessionID);
          }
          const token = generateJWT(user, tokenVersion);
          res.status(200).json({ user: toSafeUser(user), token });
        } catch (jwtErr) {
          console.error("[auth] JWT sign error:", jwtErr);
          return res.status(500).json({
            error:
              process.env.NODE_ENV === "production"
                ? "Login succeeded but token could not be issued. Check JWT_SECRET / SESSION_SECRET."
                : (jwtErr as Error).message,
          });
        }
      });
    })(req, res, next);
  };

  app.post("/api/login", loginHandler);
  app.post("/api/auth/login", loginHandler);

  app.post("/api/auth/jwt", passport.authenticate("local", { session: false }), (req, res) => {
    const user = req.user as SelectUser;
    const tokenVersion = rotateTokenVersion(user.id);
    const activeSid = activeSessionByUserId.get(user.id);
    if (activeSid) {
      storage.sessionStore.destroy(activeSid, () => {});
      activeSessionByUserId.delete(user.id);
    }
    const token = generateJWT(user, tokenVersion);
    res.status(200).json({ token, expiresIn: JWT_EXPIRES });
  });

  app.post("/api/logout", (req, res, next) => {
    const currentUser = req.user as SelectUser | undefined;
    if (currentUser && req.sessionID && activeSessionByUserId.get(currentUser.id) === req.sessionID) {
      activeSessionByUserId.delete(currentUser.id);
    }
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.post("/api/auth/logout", (req, res, next) => {
    const currentUser = req.user as SelectUser | undefined;
    if (currentUser && req.sessionID && activeSessionByUserId.get(currentUser.id) === req.sessionID) {
      activeSessionByUserId.delete(currentUser.id);
    }
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    // Return 200 with null when not logged in (avoids 401 console noise on auth check)
    if (!req.isAuthenticated()) return res.status(200).json(null);
    res.json(toSafeUser(req.user as SelectUser));
  });

  // API auth aliases
  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.status(200).json(null);
    res.json(toSafeUser(req.user as SelectUser));
  });

  // Profile management - update own profile
  app.get("/api/user/profile", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(toSafeUser(req.user as SelectUser));
  });

  app.put("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as SelectUser;
    const { password, username, role, securityLevel, department: _dept, ...allowed } = req.body;
    const updateData: Partial<SelectUser> = {
      fullName: allowed.fullName,
      position: allowed.position,
      phoneNumber: allowed.phoneNumber,
      email: allowed.email,
      avatar: allowed.avatar,
    };
    if (password && password.length >= 6) {
      updateData.password = await hashPassword(password);
    }
    const updated = await storage.updateUser(currentUser.id, updateData);
    res.json(toSafeUser(updated));
  });

  app.get("/api/user/all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Feature permission based access (department + role scoped)
    const user = req.user as SelectUser;
    if (!hasPermission(user, "user_management")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const users = await storage.getAllUsers();
      const safe = users.map(({ password, ...rest }) => rest);
      res.json(safe);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Forgot password - request reset link
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, username } = req.body;
      const identifier = email || username;
      if (!identifier) {
        return res.status(400).json({ error: "Email or username is required" });
      }

      let user: SelectUser | undefined;
      if (identifier.includes("@")) {
        user = await storage.getUserByEmail(identifier);
      } else {
        user = await storage.getUserByUsername(identifier);
      }

      if (!user) {
        return res.status(200).json({ message: "If an account exists, a reset link has been sent" });
      }

      if (!user.email) {
        return res.status(400).json({ error: "No email on file. Contact your administrator." });
      }

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      const baseUrl = process.env.BASE_URL || req.protocol + "://" + req.get("host");
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      const { sendTemplatedEmail } = await import("./services/email-service");
      await sendTemplatedEmail("password_reset", user.email, {
        resetUrl,
        appName: "IPCR Early Alert Network",
      });

      res.status(200).json({ message: "If an account exists, a reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password - with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Valid token and password (min 6 characters) required" });
      }

      const [resetRow] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));

      if (!resetRow || new Date(resetRow.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(resetRow.userId, { password: hashedPassword });
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetRow.id));

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
}
