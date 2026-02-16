import { useState } from "react";
import { useLocation } from "wouter";
import { Search, Menu, Bell, Mic, Volume2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useVoiceA11y } from "@/contexts/VoiceA11yContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

interface TopbarProps {
  openMobileMenu: () => void;
  title: string;
}

export default function Topbar({ openMobileMenu, title }: TopbarProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [hasNotifications, setHasNotifications] = useState(true);
  const {
    isVoiceControlEnabled,
    setIsVoiceControlEnabled,
    isReadAloudEnabled,
    setIsReadAloudEnabled,
  } = useVoiceA11y();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/notifications/${id}/read`);
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/notifications/read-all");
      if (!res.ok) throw new Error("Failed to mark all as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const recent = notifications.slice(0, 8);

  return (
    <header className="bg-gradient-to-r from-green-700 to-green-600 border-b border-red-600/30 shadow-sm">
      <div className="flex justify-between h-16 px-4 md:px-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden p-2 text-white/90 hover:text-white hover:bg-white/10"
            onClick={openMobileMenu}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="ml-2 md:ml-0 text-xl font-semibold text-white">{title}</h1>
        </div>
        <div className="flex items-center space-x-3">
          {!!user && (
            <>
              <Button
                variant="outline"
                size="icon"
                className={`rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 ${
                  isVoiceControlEnabled ? "ring-2 ring-red-500" : ""
                }`}
                onClick={() => setIsVoiceControlEnabled(!isVoiceControlEnabled)}
                aria-pressed={isVoiceControlEnabled}
                aria-label={isVoiceControlEnabled ? "Disable voice control" : "Enable voice control"}
                title={isVoiceControlEnabled ? "Voice control: ON" : "Voice control: OFF"}
              >
                <Mic className="h-5 w-5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className={`rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 ${
                  isReadAloudEnabled ? "ring-2 ring-red-500" : ""
                }`}
                onClick={() => setIsReadAloudEnabled(!isReadAloudEnabled)}
                aria-pressed={isReadAloudEnabled}
                aria-label={isReadAloudEnabled ? "Disable read aloud" : "Enable read aloud"}
                title={isReadAloudEnabled ? "Read aloud: ON" : "Read aloud: OFF"}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </>
          )}

          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={() => setLocation("/search")}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full bg-white/10 hover:bg-white/20 text-white border-white/20 relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-green-700"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[340px]">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending || unreadCount === 0}
                  >
                    Mark all read
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {recent.length === 0 ? (
                  <div className="px-2 py-6 text-sm text-muted-foreground text-center">No notifications yet</div>
                ) : (
                  recent.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className={n.isRead ? "" : "bg-emerald-50/40"}
                      onSelect={(e) => {
                        e.preventDefault();
                        if (!n.isRead) markAsReadMutation.mutate(n.id);
                      }}
                    >
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-medium leading-snug line-clamp-1">{n.title}</div>
                          {!n.isRead ? <span className="mt-1 h-2 w-2 rounded-full bg-red-500" /> : null}
                        </div>
                        <div className="text-xs text-muted-foreground leading-snug line-clamp-2">{n.message}</div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setHasNotifications(false);
                  }}
                  className="text-muted-foreground"
                >
                  Dismiss indicator
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="md:hidden">
            <Avatar>
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-white">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
