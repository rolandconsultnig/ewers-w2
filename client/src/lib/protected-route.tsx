import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { resolveRoutePermission } from "@shared/permissions";
import { userHasEffectivePermission } from "@shared/department-access";
import type { User } from "@shared/schema";

function canAccessRoutePath(user: User, path: string): boolean {
  const perm = resolveRoutePermission(path);
  if (!perm) return true;
  return userHasEffectivePermission(user, perm);
}

export function ProtectedRoute({
  path,
  component: Component,
  allowPublicAccess = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  allowPublicAccess?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user && !allowPublicAccess) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (user && !allowPublicAccess && !canAccessRoutePath(user, path)) {
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

export function RoleProtectedRoute({
  path,
  component: Component,
  allowedRoles,
  minSecurityLevel,
}: {
  path: string;
  component: () => React.JSX.Element;
  allowedRoles: string[];
  minSecurityLevel?: number;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (user.active === false) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  const hasRole = allowedRoles.includes(user.role);
  const hasLevel = minSecurityLevel == null || (user.securityLevel ?? 0) >= minSecurityLevel;

  if (!hasRole || !hasLevel) {
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  if (!canAccessRoutePath(user, path)) {
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
