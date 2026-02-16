import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
  new: "bg-orange-500",
  read: "bg-green-500",
  processed: "bg-green-500",
};

interface SmsItem {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  location: string;
  status: string;
  read: boolean;
}

function inferStatus(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes("urgent") || lower.includes("casualties") || lower.includes("emergency")) return "urgent";
  if (lower.includes("violent") || lower.includes("flooding") || lower.includes("evacuat")) return "high";
  if (lower.includes("protest") || lower.includes("unrest") || lower.includes("confrontation")) return "medium";
  return "low";
}

function inferLocation(content: string): string {
  const states = ["Benue", "Kaduna", "Lagos", "Kano", "Abuja", "Rivers", "Plateau", "Borno", "Adamawa"];
  for (const s of states) {
    if (content.includes(s)) return s;
  }
  return "Nigeria";
}

export function SmsMonitor() {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: incoming = [], isLoading } = useQuery({
    queryKey: ["/api/sms/incoming"],
    queryFn: async () => {
      const res = await fetch("/api/sms/incoming", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const smsData: SmsItem[] = incoming.map((m: { id: number; sender: string; content: string; receivedAt: string; status: string; location?: string }) => ({
    id: m.id,
    sender: m.sender,
    content: m.content,
    timestamp: m.receivedAt,
    location: m.location || inferLocation(m.content),
    status: inferStatus(m.content),
    read: m.status !== "new",
  }));

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sms/incoming/${id}/read`, { method: "PUT", credentials: "include" });
      if (!res.ok) throw new Error("Failed to mark read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sms/incoming"] }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sms/incoming/read-all", { method: "PUT", credentials: "include" });
      if (!res.ok) throw new Error("Failed to mark all read");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/sms/incoming"] }),
  });

  const createAlertMutation = useMutation({
    mutationFn: async (sms: SmsItem) => {
      const severityMap: Record<string, string> = {
        urgent: "critical",
        high: "high",
        medium: "medium",
        low: "low",
      };
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: `SMS: ${sms.content.slice(0, 80)}${sms.content.length > 80 ? "..." : ""}`,
          description: sms.content,
          severity: severityMap[sms.status] || "medium",
          status: "active",
          source: "sms",
          region: "Nigeria",
          location: sms.location,
          escalationLevel: sms.status === "urgent" ? 5 : sms.status === "high" ? 4 : 3,
        }),
      });
      if (!res.ok) throw new Error("Failed to create alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  };

  const markAsRead = (id: number) => markAsReadMutation.mutate(id);
  const markAllAsRead = () => markAllAsReadMutation.mutate();

  const filteredSms = smsData.filter((sms) => {
    const matchesSearch =
      sms.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sms.sender.includes(searchTerm) ||
      sms.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === "all" || sms.status === priorityFilter;
    const matchesReadStatus =
      readFilter === "all" ||
      (readFilter === "unread" && !sms.read) ||
      (readFilter === "read" && sms.read);
    return matchesSearch && matchesPriority && matchesReadStatus;
  });

  const unreadCount = smsData.filter((sms) => !sms.read).length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex justify-between items-center">
          <span>SMS Monitor</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} New
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Monitor SMS alerts from field agents and community sources</CardDescription>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <Label htmlFor="search-sms">Search Messages</Label>
            <Input
              id="search-sms"
              placeholder="Search by content, sender, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <Label htmlFor="priority-filter">Priority</Label>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger id="priority-filter">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-40">
            <Label htmlFor="read-filter">Status</Label>
            <Select value={readFilter} onValueChange={setReadFilter}>
              <SelectTrigger id="read-filter">
                <SelectValue placeholder="All Messages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread Only</SelectItem>
                <SelectItem value="read">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="mt-2 text-right">
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Mark All as Read
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <div className="space-y-4">
            {filteredSms.length > 0 ? (
              filteredSms.map((sms) => (
                <div
                  key={sms.id}
                  className={`p-4 border rounded-lg ${!sms.read ? "bg-accent/5 border-accent/20" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${statusColors[sms.status]}`} />
                      <span className="font-medium text-sm">{sms.sender}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {sms.location}
                      </Badge>
                      {!sms.read && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(sms.timestamp)}</span>
                  </div>
                  <p className="text-sm mb-2">{sms.content}</p>
                  <div className="flex justify-end space-x-2">
                    {!sms.read && (
                      <Button variant="ghost" size="sm" onClick={() => markAsRead(sms.id)}>
                        Mark as Read
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => createAlertMutation.mutate(sms)}
                      disabled={createAlertMutation.isPending}
                    >
                      {createAlertMutation.isPending ? "Creating..." : "Create Alert"}
                    </Button>
                    <Button variant="outline" size="sm">Reply</Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No SMS messages match your filters.
              </div>
            )}
          </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
