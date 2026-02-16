import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/contexts/SocketContext";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { MessageCircle, Plus, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Conversation = { id: number; type: string; title: string | null; incidentId: number | null; createdAt: string };
type Message = { id: number; body: string; senderId: number; createdAt: string; sender?: { fullName?: string; username?: string } };

export default function ChatPage() {
  const { user } = useAuth();
  const { joinConversation, leaveConversation, onNewMessage } = useSocket();
  const queryClient = useQueryClient();
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newParticipantIds, setNewParticipantIds] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    enabled: createOpen,
  });

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedConvo) throw new Error("No conversation");
      const res = await apiRequest("POST", `/api/conversations/${selectedConvo.id}/messages`, { body });
      return res.json();
    },
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", {
        type: "chat",
        title: newTitle || "New Chat",
        participantIds: newParticipantIds,
      });
      return res.json();
    },
    onSuccess: () => {
      setCreateOpen(false);
      setNewTitle("");
      setNewParticipantIds([]);
      refetchConvos();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedConvo) return;
    joinConversation(selectedConvo.id);
    const unsub = onNewMessage((msg: any) => {
      if (msg?.conversationId === selectedConvo.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo.id}/messages`] });
      }
    });
    return () => {
      leaveConversation(selectedConvo.id);
      unsub();
    };
  }, [selectedConvo?.id, joinConversation, leaveConversation, onNewMessage, queryClient]);

  const chatConvos = conversations.filter((c) => c.type === "chat");

  return (
    <MainLayout title="Chat">
      <div className="flex h-[calc(100vh-8rem)]">
        <div className="w-72 border-r flex flex-col">
          <div className="p-3 border-b flex justify-between items-center">
            <h2 className="font-semibold">Conversations</h2>
            <Button size="icon" variant="ghost" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatConvos.map((c) => (
              <div
                key={c.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 ${selectedConvo?.id === c.id ? "bg-muted" : ""}`}
                onClick={() => setSelectedConvo(c)}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{c.title || `Chat #${c.id}`}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          {selectedConvo ? (
            <>
              <div className="p-3 border-b">
                <h3 className="font-medium">{selectedConvo.title || `Chat #${selectedConvo.id}`}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        m.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-xs opacity-80 mb-1">
                        {m.sender?.fullName || m.sender?.username || "Unknown"}
                      </p>
                      <p className="text-sm">{m.body}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(m.createdAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (newMessage.trim()) sendMutation.mutate(newMessage.trim());
                    }
                  }}
                />
                <Button
                  onClick={() => newMessage.trim() && sendMutation.mutate(newMessage.trim())}
                  disabled={!newMessage.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Select a conversation or create a new one
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Chat title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Add participants</label>
              <Select
                onValueChange={(v) => {
                  const id = parseInt(v);
                  if (id && !newParticipantIds.includes(id)) setNewParticipantIds((p) => [...p, id]);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u: any) => u.id !== user?.id)
                    .map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.fullName || u.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {newParticipantIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newParticipantIds.map((id) => {
                    const u = users.find((x: any) => x.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-sm"
                      >
                        {u?.fullName || u?.username}
                        <button
                          onClick={() => setNewParticipantIds((p) => p.filter((x) => x !== id))}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
