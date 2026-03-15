import { useState, ReactNode } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Shield, LogOut, Map, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

interface ResponderLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  /** When set (e.g. "Police"), show as agency dashboard title */
  title?: string;
  agencySlug?: string | null;
}

/** Light template layout — white/slate-50, teal accent. */
export default function ResponderLayout({ children, sidebar, title, agencySlug }: ResponderLayoutProps) {
  const { user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const headerTitle = title ?? "Responder Portal";
  const homeHref = agencySlug ? `/responder/agency/${agencySlug}` : "/responder";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      localStorage.removeItem("jwt");
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      window.location.href = "/responder";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="h-14 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between px-4 lg:px-6 shadow-sm">
        <Link href={homeHref} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-800 tracking-tight">{headerTitle}</span>
        </Link>
        <div className="flex items-center gap-3">
          {user && (
            <>
              <span className="hidden sm:inline text-slate-600 text-sm truncate max-w-[140px]">
                {user.fullName || user.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-2"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <aside className="hidden lg:flex w-64 min-w-64 flex-col border-r border-slate-200 bg-white shrink-0 shadow-sm">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-auto bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}

export function ResponderNavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        active
          ? "bg-teal-50 text-teal-700 border border-teal-200"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
      {active && <ChevronRight className="ml-auto h-4 w-4 text-teal-600" />}
    </button>
  );
}

export function ResponderSidebarFooter({ user }: { user: { fullName?: string | null; username: string } }) {
  return (
    <div className="mt-auto border-t border-slate-200 p-3">
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">Signed in as</p>
        <p className="truncate text-sm text-slate-800 font-medium">{user.fullName || user.username}</p>
      </div>
    </div>
  );
}
