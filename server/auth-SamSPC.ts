import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import express, { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
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
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

function toSafeUser(user: SelectUser) {
  const { password: _password, ...safe } = user as any;
  return safe as Omit<SelectUser, "password">;
}

export function generateJWT(user: SelectUser): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, securityLevel: user.securityLevel },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyJWT(token: string): { id: number; username: string; role: string; securityLevel: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; securityLevel: number };
    return decoded;
  } catch {
    return null;
  }
}

export function signCallGuestToken(payload: { callId: number; participantId: number; displayName: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyCallGuestToken(token: string): { callId: number; participantId: number; displayName: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { callId: number; participantId: number; displayName: string };
    return decoded;
  } catch {
    return null;
  }
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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // In production, cookie.secure=true so browser only sends cookie over HTTPS.
  // If your app is behind HTTP (no SSL), set COOKIE_SECURE=false in .env so login/session work.
  const cookieSecure = process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production';
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'ewers-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: cookieSecure,
      sameSite: 'lax',
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // JWT auth fallback - if no session user, try Bearer token
  app.use(async (req, res, next) => {
    if (req.user) return next();
    const auth = req.headers.authorization;
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) {
      const payload = verifyJWT(token);
      if (payload) {
        const user = await storage.getUser(payload.id);
        if (user && user.active !== false) req.user = user;
      }
    }
    next();
  });

  // Ensure isAuthenticated works for both session and JWT (req.user presence)
  app.use((req, _res, next) => {
    const orig = req.isAuthenticated.bind(req);
    (req as any).isAuthenticated = function (): boolean {
      return !!req.user || orig();
    };
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
      async (payload: { id: number }, done) => {
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
    
    // Users with security clearance level 5 or higher can create new users
    const currentUser = req.user as SelectUser;
    if (currentUser.securityLevel < 5 && currentUser.role !== 'admin') {
      return res.status(403).json({ error: "Creating users requires security clearance level 5 or higher" });
    }
    
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const newUser = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password || 'password123'),
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
    if (currentUser.securityLevel < 5 && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
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
        return res.status(500).json({ error: info?.message || "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const token = generateJWT(user);
        res.status(200).json({ user: toSafeUser(user), token });
      });
    })(req, res, next);
  };

  app.post("/api/login", loginHandler);
  app.post("/api/auth/login", loginHandler);

  app.post("/api/auth/jwt", passport.authenticate("local", { session: false }), (req, res) => {
    const user = req.user as SelectUser;
    const token = generateJWT(user);
    res.status(200).json({ token, expiresIn: JWT_EXPIRES });
  });

  const clearSessionCookie = (res: express.Response) => {
    const opts: { path: string; httpOnly?: boolean; sameSite?: boolean | 'lax'; secure?: boolean } = { path: '/' };
    if (sessionSettings.cookie) {
      opts.httpOnly = true;
      opts.sameSite = sessionSettings.cookie.sameSite as 'lax';
      if (sessionSettings.cookie.secure) opts.secure = true;
    }
    res.clearCookie('connect.sid', opts);
  };

  const handleLogout = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      clearSessionCookie(res);
      const s = req.session as express.Session & { destroy?: (cb: (err?: Error) => void) => void };
      if (s && typeof s.destroy === "function") {
        s.destroy((destroyErr) => {
          if (destroyErr) return next(destroyErr);
          res.sendStatus(200);
        });
      } else {
        res.sendStatus(200);
      }
    });
  };

  app.post("/api/logout", handleLogout);
  app.post("/api/auth/logout", handleLogout);

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
    const { password, username, role, securityLevel, ...allowed } = req.body;
    const updateData: Partial<SelectUser> = {
      fullName: allowed.fullName,
      department: allowed.department,
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
    
    // Users with security clearance level 5 or higher can access user management
    const user = req.user as SelectUser;
    if (user.securityLevel < 5 && user.role !== 'admin') {
      return res.status(403).json({ error: "User management requires security clearance level 5 or higher" });
    }
    
    try {
      const users = await storage.getAllUsers();
      res.json(users);
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
