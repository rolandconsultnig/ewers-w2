import { useState, useEffect, useRef, useCallback } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/contexts/SocketContext";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Plus, Send, Loader2, Search, MoreVertical, Pencil, Trash2, Users, Circle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Conversation = {
  id: number;
  type: string;
  title: string | null;
  incidentId: number | null;
  createdAt: string;
  lastMessage?: { id: number; body: string; createdAt: string; senderId: number } | null;
  unreadCount?: number;
};

type Message = {
  id: number;
  body: string;
  senderId: number;
  createdAt: string;
  editedAt?: string | null;
  sender?: { id: number; fullName?: string; username?: string } | null;
};

const TYPING_DEBOUNCE_MS = 400;
const TYPING_TIMEOUT_MS = 3000;

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    joinConversation,
    leaveConversation,
    onNewMessage,
    emitTypingStart,
    emitTypingStop,
    onTyping,
    onTypingStop,
    socket,
    onlineUsers,
  } = useSocket();
  const queryClient = useQueryClient();
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newParticipantIds, setNewParticipantIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addParticipantsOpen, setAddParticipantsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, { userId: number; username: string }>>(new Map());
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
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

  const { data: participants = [] } = useQuery({
    queryKey: selectedConvo ? [`/api/conversations/${selectedConvo.id}/participants`] : ["none"],
    queryFn: async () => {
      if (!selectedConvo) return [];
      const res = await apiRequest("GET", `/api/conversations/${selectedConvo.id}/participants`);
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
    enabled: !!user,
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
      refetchConvos();
      emitTypingStop(selectedConvo!.id);
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

  const markReadMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      await apiRequest("PUT", `/api/conversations/${conversationId}/read`);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}/messages`] });
    },
  });

  const editMessageMutation = useMutation({
    mutationFn: async ({ msgId, body }: { msgId: number; body: string }) => {
      if (!selectedConvo) throw new Error("No conversation");
      const res = await apiRequest("PATCH", `/api/conversations/${selectedConvo.id}/messages/${msgId}`, { body });
      return res.json();
    },
    onSuccess: () => {
      setEditingMessageId(null);
      setEditBody("");
      refetchMessages();
      refetchConvos();
    },
    onError: (e: Error) => toast({ title: "Edit failed", description: e.message, variant: "destructive" }),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (msgId: number) => {
      if (!selectedConvo) throw new Error("No conversation");
      await apiRequest("DELETE", `/api/conversations/${selectedConvo.id}/messages/${msgId}`);
    },
    onSuccess: () => {
      refetchMessages();
      refetchConvos();
      toast({ title: "Message deleted" });
    },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const addParticipantMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (!selectedConvo) throw new Error("No conversation");
      await apiRequest("POST", `/api/conversations/${selectedConvo.id}/participants`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo!.id}/participants`] });
      refetchConvos();
      toast({ title: "Participant added" });
    },
    onError: (e: Error) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedConvo) return;
    markReadMutation.mutate(selectedConvo.id);
    joinConversation(selectedConvo.id);
    const unsubNewMessage = onNewMessage((msg: any) => {
      if (msg?.conversationId === selectedConvo.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo.id}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    });
    const unsubTyping = onTyping((data) => {
      if (data.conversationId === selectedConvo.id && data.userId !== user?.id) {
        setTypingUsers((prev) => new Map(prev).set(data.userId, { userId: data.userId, username: data.username }));
      }
    });
    const unsubTypingStop = onTypingStop((data) => {
      if (data.conversationId === selectedConvo.id) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    });
    return () => {
      leaveConversation(selectedConvo.id);
      unsubNewMessage();
      unsubTyping();
      unsubTypingStop();
    };
  }, [selectedConvo?.id, joinConversation, leaveConversation, onNewMessage, onTyping, onTypingStop, queryClient]);

  useEffect(() => {
    if (!socket || !selectedConvo) return;
    const onUpdated = (payload: any) => {
      if (payload?.conversationId === selectedConvo.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo.id}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    };
    const onDeleted = (payload: any) => {
      if (payload?.conversationId === selectedConvo.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo.id}/messages`] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    };
    socket.on("message-updated", onUpdated);
    socket.on("message-deleted", onDeleted);
    return () => {
      socket.off("message-updated", onUpdated);
      socket.off("message-deleted", onDeleted);
    };
  }, [socket, selectedConvo?.id, queryClient]);

  const handleTyping = useCallback(() => {
    if (!selectedConvo) return;
    emitTypingStart(selectedConvo.id);
    typingSentRef.current = true;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(selectedConvo.id);
      typingTimeoutRef.current = null;
    }, TYPING_TIMEOUT_MS);
  }, [selectedConvo, emitTypingStart, emitTypingStop]);

  const chatConvos = conversations.filter((c) => c.type === "chat");
  const filteredConvos = searchQuery.trim()
    ? chatConvos.filter(
        (c) =>
          (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.lastMessage?.body || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chatConvos;

  const participantIds = (participants as { userId: number }[]).map((p) => p.userId);
  const usersToAdd = (users as { id: number; fullName?: string; username?: string }[]).filter(
    (u) => u.id !== user?.id && !participantIds.includes(u.id)
  );

  const otherUsers = (users as { id: number; fullName?: string; username?: string }[]).filter(
    (u) => u.id !== user?.id
  );
  const onlineUserIds = new Set(onlineUsers.map((o) => o.userId));

  const handleStartChatWithUser = (targetUser: { id: number; fullName?: string; username?: string }) => {
    setNewParticipantIds([targetUser.id]);
    setNewTitle(targetUser.fullName || targetUser.username || "");
    setCreateOpen(true);
  };

  return (
    <MainLayout title="Chat">
      <div className="flex h-[calc(100vh-8rem)]">
        <div className="w-80 border-r flex flex-col bg-muted/20">
          <div className="p-3 border-b flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Conversations</h2>
              <Button size="icon" variant="ghost" onClick={() => setCreateOpen(true)} title="New chat">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery ? "No conversations match your search." : "No conversations yet. Start a new chat."}
              </div>
            ) : (
              filteredConvos.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b border-muted/50 ${selectedConvo?.id === c.id ? "bg-muted" : ""}`}
                  onClick={() => setSelectedConvo(c)}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {(c.title || `#${c.id}`).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">{c.title || `Chat #${c.id}`}</span>
                        {c.unreadCount! > 0 && (
                          <span className="shrink-0 rounded-full bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {c.lastMessage.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.lastMessage
                          ? formatDistanceToNow(new Date(c.lastMessage.createdAt), { addSuffix: true })
                          : format(new Date(c.createdAt), "MMM d")}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {selectedConvo ? (
            <>
              <div className="p-3 border-b flex items-center justify-between bg-background">
                <div>
                  <h3 className="font-medium">{selectedConvo.title || `Chat #${selectedConvo.id}`}</h3>
                  <p className="text-xs text-muted-foreground">
                    {(participants as { user?: { fullName?: string; username?: string } }[]).length > 0
                      ? (participants as { user?: { fullName?: string; username?: string } }[])
                          .map((p) => p.user?.fullName || p.user?.username)
                          .filter(Boolean)
                          .join(", ")
                      : "Just you"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddParticipantsOpen(true)}
                  title="Add participants"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No messages yet. Say hello!
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div className="group flex items-end gap-1 max-w-[75%]">
                      {m.senderId !== user?.id && (
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {(m.sender?.fullName || m.sender?.username || "?").slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          m.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        } ${editingMessageId === m.id ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                      >
                        {editingMessageId === m.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              className="bg-background text-foreground h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editBody.trim()) editMessageMutation.mutate({ msgId: m.id, body: editBody.trim() });
                                }
                                if (e.key === "Escape") {
                                  setEditingMessageId(null);
                                  setEditBody("");
                                }
                              }}
                            />
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditBody("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => editBody.trim() && editMessageMutation.mutate({ msgId: m.id, body: editBody.trim() })}
                                disabled={!editBody.trim() || editMessageMutation.isPending}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs opacity-80 mb-1">
                              {m.sender?.fullName || m.sender?.username || "Unknown"}
                            </p>
                            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs opacity-70">
                                {format(new Date(m.createdAt), "HH:mm")}
                                {m.editedAt && " (edited)"}
                              </p>
                              {m.senderId === user?.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-70 hover:opacity-100 -mr-1">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingMessageId(m.id);
                                        setEditBody(m.body);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => deleteMessageMutation.mutate(m.id)}
                                    >
                                      <Trash2 className="h-3 w-3 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {typingUsers.size > 0 && (
                  <div className="flex justify-start">
                    <p className="text-xs text-muted-foreground italic">
                      {Array.from(typingUsers.values())
                        .map((t) => t.username)
                        .join(", ")}{" "}
                      {typingUsers.size === 1 ? "is" : "are"} typing...
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t flex gap-2 bg-background">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
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
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/10">
              <Card className="max-w-sm">
                <CardContent className="pt-6 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">Select a conversation or create a new one</p>
                  <p className="text-sm mt-1">Use the + button to start a chat with your team.</p>
                  <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New chat
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="w-64 border-l flex flex-col bg-muted/20 shrink-0">
          <div className="p-3 border-b">
            <h2 className="font-semibold text-sm">People</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {onlineUserIds.size} online
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {otherUsers.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">No other users</div>
            ) : (
              otherUsers.map((u) => {
                const isOnline = onlineUserIds.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 border-b border-muted/50 text-left"
                    onClick={() => handleStartChatWithUser(u)}
                  >
                    <Avatar className="h-8 w-8 shrink-0 relative">
                      <AvatarFallback className="text-xs">
                        {(u.fullName || u.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                      {isOnline && (
                        <span
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"
                          title="Online"
                        />
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{u.fullName || u.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {isOnline ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Circle className="h-2 w-2 fill-current" />
                            Online
                          </span>
                        ) : (
                          "Offline"
                        )}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
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
                  {(users as { id: number; fullName?: string; username?: string }[])
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.fullName || u.username}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {newParticipantIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newParticipantIds.map((id) => {
                    const u = (users as { id: number; fullName?: string; username?: string }[]).find((x) => x.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-sm"
                      >
                        {u?.fullName || u?.username}
                        <button
                          type="button"
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

      <Dialog open={addParticipantsOpen} onOpenChange={setAddParticipantsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {usersToAdd.length === 0 ? (
              <p className="text-sm text-muted-foreground">All users are already in this chat.</p>
            ) : (
              usersToAdd.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span>{u.fullName || u.username}</span>
                  <Button
                    size="sm"
                    onClick={() => addParticipantMutation.mutate(u.id)}
                    disabled={addParticipantMutation.isPending}
                  >
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
