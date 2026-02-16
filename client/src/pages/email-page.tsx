import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Inbox, Send, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Conversation = { id: number; type: string; title: string | null; incidentId: number | null; createdBy: number; createdAt: string };
type Message = { id: number; body: string; senderId: number; createdAt: string; sender?: { fullName?: string; username?: string } };

export default function EmailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [emailTab, setEmailTab] = useState<"inbox" | "sent">("inbox");
  const [toIds, setToIds] = useState<number[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: conversations = [], refetch: refetchConvos } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: selectedConvo ? [`/api/conversations/${selectedConvo.id}/messages`] : ["none"],
    queryFn: async () => {
      if (!selectedConvo) return [];
      const res = await apiRequest("GET", `/api/conversations/${selectedConvo.id}/messages`);
      return res.json();
    },
    enabled: !!selectedConvo,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
    enabled: composeOpen,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", {
        type: "email",
        title: subject || "No subject",
        participantIds: toIds,
      });
      const convo = await res.json();
      if (body.trim()) {
        await apiRequest("POST", `/api/conversations/${convo.id}/messages`, { body: body.trim() });
      }
      return convo;
    },
    onSuccess: (data) => {
      setComposeOpen(false);
      setToIds([]);
      setSubject("");
      setBody("");
      refetchConvos();
      setSelectedConvo(data);
    },
  });

  const emailConvos = conversations.filter((c) => c.type === "email");
  const inboxConvos = emailConvos.filter((c) => c.createdBy !== user?.id);
  const sentConvos = emailConvos.filter((c) => c.createdBy === user?.id);
  const displayedConvos = emailTab === "inbox" ? inboxConvos : sentConvos;

  const markAsRead = useMutation({
    mutationFn: async (convoId: number) => {
      await apiRequest("PUT", `/api/conversations/${convoId}/read`);
    },
  });

  useEffect(() => {
    if (selectedConvo && selectedConvo.type === "email") {
      markAsRead.mutate(selectedConvo.id);
    }
  }, [selectedConvo?.id, selectedConvo?.type]);

  return (
    <MainLayout title="Internal Email">
      <div className="flex h-[calc(100vh-8rem)]">
        <div className="w-72 border-r flex flex-col">
          <div className="p-3 border-b flex justify-between items-center">
            <h2 className="font-semibold">Internal Email</h2>
            <Button size="icon" variant="ghost" onClick={() => setComposeOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex border-b">
            <button
              className={`flex-1 py-2 text-sm font-medium ${emailTab === "inbox" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => setEmailTab("inbox")}
            >
              <Inbox className="h-4 w-4 inline mr-1" />
              Inbox ({inboxConvos.length})
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${emailTab === "sent" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
              onClick={() => setEmailTab("sent")}
            >
              <Send className="h-4 w-4 inline mr-1" />
              Sent ({sentConvos.length})
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {displayedConvos.map((c) => (
              <div
                key={c.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 ${selectedConvo?.id === c.id ? "bg-muted" : ""}`}
                onClick={() => setSelectedConvo(c)}
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{c.title || `Message #${c.id}`}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(c.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            ))}
            {displayedConvos.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {emailTab === "inbox" ? "No emails in inbox" : "No sent emails"}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedConvo ? (
            <>
              <div className="p-3 border-b">
                <h3 className="font-medium">{selectedConvo.title || `Message #${selectedConvo.id}`}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      From: {m.sender?.fullName || m.sender?.username} • {format(new Date(m.createdAt), "HH:mm, MMM d")}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a message or compose a new one
            </div>
          )}
        </div>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">To</label>
              <Select
                onValueChange={(v) => {
                  const id = parseInt(v);
                  if (id && !toIds.includes(id)) setToIds((p) => [...p, id]);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u: any) => u.id !== user?.id)
                    .map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.fullName || u.username} ({u.email || "no email"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {toIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {toIds.map((id) => {
                    const u = users.find((x: any) => x.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-sm"
                      >
                        {u?.fullName || u?.username}
                        <button
                          onClick={() => setToIds((p) => p.filter((x) => x !== id))}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Write your message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={toIds.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
