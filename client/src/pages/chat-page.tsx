import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useLocation } from "wouter";
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
import {
  MessageCircle,
  Plus,
  Send,
  Loader2,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  Circle,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  Mic,
  MapPin,
  Phone,
  Video,
} from "lucide-react";
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
  const [, setLocation] = useLocation();
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
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newIsGroup, setNewIsGroup] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        type: newIsGroup && isAdminUser ? "group" : "chat",
        title: newTitle || "New Chat",
        participantIds: newParticipantIds,
      });
      return res.json();
    },
    onSuccess: () => {
      setCreateOpen(false);
      setNewTitle("");
      setNewParticipantIds([]);
      setNewIsGroup(false);
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

  const messagesWithDayBreaks = useMemo(() => {
    const out: Array<{ kind: "day"; label: string } | { kind: "msg"; msg: Message }> = [];
    let lastDayKey: string | null = null;
    for (const item of messages) {
      const d = new Date(item.createdAt);
      const dayKey = format(d, "yyyy-MM-dd");
      if (dayKey !== lastDayKey) {
        out.push({ kind: "day", label: format(d, "EEE, MMM d") });
        lastDayKey = dayKey;
      }
      out.push({ kind: "msg", msg: item });
    }
    return out;
  }, [messages]);

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
  const groupConvos = conversations.filter((c) => c.type === "group");
  const filteredConvos = searchQuery.trim()
    ? conversations.filter(
        (c) =>
          (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.lastMessage?.body || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const participantIds = (participants as { userId: number }[]).map((p) => p.userId);
  const usersToAdd = (users as { id: number; fullName?: string; username?: string }[]).filter(
    (u) => u.id !== user?.id && !participantIds.includes(u.id)
  );

  const otherUsers = (users as { id: number; fullName?: string; username?: string }[]).filter(
    (u) => u.id !== user?.id
  );
  const onlineUserIds = new Set(onlineUsers.map((o) => o.userId));
  const isAdminUser = !!user && (user.role === "admin" || (user as any).securityLevel >= 5);

  // Compute WhatsApp-style message status for the current user
  const computeMessageStatus = (m: Message) => {
    if (!user || !selectedConvo) return null;
    if (m.senderId !== user.id) return null;

    // Delivered: we assume server accepted, so at least single check
    // Read: any other participant has lastReadAt after message createdAt
    const others = (participants as { userId: number; lastReadAt?: string | null }[]).filter(
      (p) => p.userId !== user.id
    );
    if (others.length === 0) {
      return "sent";
    }
    const createdAt = new Date(m.createdAt).getTime();
    const anyRead = others.some((p) => {
      if (!p.lastReadAt) return false;
      return new Date(p.lastReadAt as any).getTime() >= createdAt;
    });
    return anyRead ? "read" : "delivered";
  };

  const handleStartChatWithUser = (targetUser: { id: number; fullName?: string; username?: string }) => {
    setNewParticipantIds([targetUser.id]);
    setNewTitle(targetUser.fullName || targetUser.username || "");
    setNewIsGroup(false);
    setCreateOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedConvo) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/conversations/${selectedConvo.id}/attachments`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to upload attachment");
      }
      await res.json();
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo.id}/messages`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVoiceNote = useCallback(async () => {
    if (!selectedConvo) return;
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size === 0) return;
        setIsUploading(true);
        try {
          const file = new File([blob], "voice.webm", { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch(`/api/conversations/${selectedConvo.id}/attachments`, {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          if (!res.ok) throw new Error("Upload failed");
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo.id}/messages`] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        } catch (err: any) {
          toast({ title: "Voice note failed", description: err?.message, variant: "destructive" });
        } finally {
          setIsUploading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      toast({ title: "Microphone access needed", description: err?.message, variant: "destructive" });
    }
  }, [selectedConvo, isRecording, queryClient, toast]);

  useEffect(() => {
    if (!isRecording) return;
    const rec = mediaRecorderRef.current;
    return () => {
      if (rec?.state === "recording") rec.stop();
    };
  }, [isRecording]);

  const handleShareLocation = useCallback(() => {
    if (!selectedConvo) return;
    if (!navigator.geolocation) {
      toast({ title: "Location not supported", variant: "destructive" });
      return;
    }
    toast({ title: "Getting location..." });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const body = `__LOCATION__::${latitude}::${longitude}`;
        try {
          await apiRequest("POST", `/api/conversations/${selectedConvo.id}/messages`, { body });
          queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConvo.id}/messages`] });
          queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
          toast({ title: "Location shared" });
        } catch (e: any) {
          toast({ title: "Failed to share location", description: e?.message, variant: "destructive" });
        }
      },
      () => toast({ title: "Could not get location", variant: "destructive" }),
      { enableHighAccuracy: true }
    );
  }, [selectedConvo, queryClient, toast]);

  return (
    <MainLayout title="Chat">
      {/* WhatsApp Web–style full height dark layout */}
      <div className="flex h-[calc(100vh-8rem)] bg-[#0a1014]">
        {/* Left: chat list pane */}
        <div className="w-80 border-r border-[#202c33] flex flex-col bg-[#111b21] text-slate-100">
          {/* List header */}
          <div className="px-3 py-2 border-b border-[#202c33] flex items-center justify-between bg-[#202c33]">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-600 text-xs text-white">
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm">Chats</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-[#2a3942]" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2 border-b border-[#202c33] bg-[#111b21]">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-semibold flex items-center gap-1 text-xs uppercase tracking-wide text-slate-400">
                <MessageCircle className="h-3 w-3" />
                Conversations
              </h2>
              {isAdminUser && (
                <span className="text-[10px] text-emerald-400 font-medium">Admin</span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 bg-[#202c33] border-transparent text-xs text-slate-100 placeholder:text-slate-500 rounded-lg"
              />
            </div>
          </div>

          {/* Chat list (groups shown first, then direct chats) */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvos.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                {searchQuery ? "No conversations match your search." : "No conversations yet. Start a new chat."}
              </div>
            ) : (
              filteredConvos.map((c) => (
                <div
                  key={c.id}
                  className={`px-3 py-2 cursor-pointer border-b border-[#202c33] transition-colors ${
                    selectedConvo?.id === c.id ? "bg-[#202c33]" : "bg-[#111b21] hover:bg-[#202c33]"
                  }`}
                  onClick={() => setSelectedConvo(c)}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs bg-[#202c33] text-slate-100">
                        {(c.title || `#${c.id}`).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate text-sm">
                          {c.title || (c.type === "group" ? `Group #${c.id}` : `Chat #${c.id}`)}
                        </span>
                        {c.unreadCount! > 0 && (
                          <span className="shrink-0 rounded-full bg-emerald-500 text-white text-[10px] px-1.5 py-0.5">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {c.lastMessage.body}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                        {c.type}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
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

        {/* Middle: active conversation pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0b141a]">
          {selectedConvo ? (
            <>
              {/* Chat header */}
              <div className="px-4 py-2 border-b border-[#202c33] flex items-center justify-between bg-[#202c33] text-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-[#111b21]">
                      {(selectedConvo.title || `#${selectedConvo.id}`).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {selectedConvo.title || `Chat #${selectedConvo.id}`}
                    </h3>
                    <p className="text-[11px] text-slate-300 truncate">
                    {(participants as { user?: { fullName?: string; username?: string } }[]).length > 0
                      ? (participants as { user?: { fullName?: string; username?: string } }[])
                          .map((p) => p.user?.fullName || p.user?.username)
                          .filter(Boolean)
                          .join(", ")
                        : "Just you"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-300 hover:bg-[#111b21] hover:text-slate-100"
                    title="Start voice call"
                    onClick={() => setLocation(`/calls?conversationId=${selectedConvo.id}&type=voice`)}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-300 hover:bg-[#111b21] hover:text-slate-100"
                    title="Start video call"
                    onClick={() => setLocation(`/calls?conversationId=${selectedConvo.id}&type=video`)}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAddParticipantsOpen(true)}
                    title="Add participants"
                    className="text-slate-300 hover:bg-[#111b21] hover:text-slate-100"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[radial-gradient(circle_at_top,_#111b21,_#0b141a)]">
                {messages.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-8">
                    No messages yet. Say hello!
                  </div>
                )}
                {messagesWithDayBreaks.map((item: { kind: "day"; label: string } | { kind: "msg"; msg: Message }, idx: number) =>
                  item.kind === "day" ? (
                    <div key={`day-${idx}`} className="flex justify-center py-2">
                      <div className="px-3 py-1 rounded-full bg-black/30 text-slate-200 text-[11px] tracking-wide">
                        {item.label}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={item.msg.id}
                      className={`flex ${item.msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    >
                      <div className="group flex items-end gap-1 max-w-[78%]">
                        {item.msg.senderId !== user?.id && (
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[10px] bg-[#202c33] text-slate-100">
                              {(item.msg.sender?.fullName || item.msg.sender?.username || "?").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`relative rounded-2xl px-3 py-2 shadow-sm ${
                            item.msg.senderId === user?.id
                              ? "bg-[#005c4b] text-emerald-50 rounded-br-sm"
                              : "bg-[#202c33] text-slate-100 rounded-bl-sm"
                          } ${editingMessageId === item.msg.id ? "ring-2 ring-offset-2 ring-emerald-500" : ""}`}
                        >
                        {editingMessageId === item.msg.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              className="bg-background text-foreground h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editBody.trim()) editMessageMutation.mutate({ msgId: item.msg.id, body: editBody.trim() });
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
                                onClick={() => editBody.trim() && editMessageMutation.mutate({ msgId: item.msg.id, body: editBody.trim() })}
                                disabled={!editBody.trim() || editMessageMutation.isPending}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-[11px] opacity-80 mb-1">
                              {item.msg.sender?.fullName || item.msg.sender?.username || "Unknown"}
                            </p>
                            {/* Render replies, voice, location, and attachments in a WhatsApp-like way */}
                            {item.msg.body.startsWith("__VOICE__::") ? (
                              (() => {
                                const parts = item.msg.body.split("::");
                                const url = parts[1];
                                return (
                                  <div className="space-y-1">
                                    <audio controls src={url} className="max-w-[220px] h-9" preload="metadata" />
                                    <p className="text-[10px] text-muted-foreground">Voice note</p>
                                  </div>
                                );
                              })()
                            ) : item.msg.body.startsWith("__LOCATION__::") ? (
                              (() => {
                                const parts = item.msg.body.split("::");
                                const lat = parts[1];
                                const lng = parts[2];
                                const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                                return (
                                  <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs underline text-emerald-300 hover:text-emerald-200"
                                  >
                                    📍 Location: {lat}, {lng}
                                  </a>
                                );
                              })()
                            ) : item.msg.body.startsWith("__FILE__::") ? (
                              (() => {
                                const parts = item.msg.body.split("::");
                                const url = parts[1];
                                const name = parts[2] || "Attachment";
                                const isImage = /\.(png|jpe?g|gif|webp)$/i.test(url || "");
                                return (
                                  <div className="space-y-1">
                                    {isImage && (
                                      <a href={url} target="_blank" rel="noreferrer">
                                        <img
                                          src={url}
                                          alt={name}
                                          className="max-w-[220px] max-h-[180px] rounded-lg border border-black/10 bg-black/10 object-cover"
                                        />
                                      </a>
                                    )}
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs underline break-all"
                                    >
                                      {name}
                                    </a>
                                  </div>
                                );
                              })()
                            ) : item.msg.body.startsWith("↩️ ") ? (
                              (() => {
                                const [quotePart, restPart] = item.msg.body.split("\n\n", 2);
                                return (
                                  <div className="space-y-1">
                                    <div className="border-l-2 border-emerald-300/80 pl-2 pr-1 py-1 bg-black/5 rounded-sm text-[10px] opacity-90">
                                      {quotePart.replace(/^↩️\s*/, "")}
                                    </div>
                                    {restPart && (
                                      <p className="text-sm whitespace-pre-wrap break-words">{restPart}</p>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <p className="text-sm whitespace-pre-wrap break-words">{item.msg.body}</p>
                            )}
                            <div className="flex items-center justify-between gap-2 mt-1 text-[11px] opacity-80">
                              <span>
                                {format(new Date(item.msg.createdAt), "HH:mm")}
                                {item.msg.editedAt && " (edited)"}
                              </span>
                              <span className="flex items-center gap-1">
                                {item.msg.senderId === user?.id && (
                                  <>
                                    {(() => {
                                      const status = computeMessageStatus(item.msg);
                                      if (status === "read") {
                                        return <CheckCheck className="h-3 w-3 text-sky-300" />;
                                      }
                                      if (status === "delivered") {
                                        return <CheckCheck className="h-3 w-3" />;
                                      }
                                      if (status === "sent") {
                                        return <Check className="h-3 w-3" />;
                                      }
                                      return null;
                                    })()}
                                  </>
                                )}
                                {item.msg.senderId === user?.id && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-70 hover:opacity-100 -mr-1"
                                      >
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setReplyTo(item.msg);
                                        }}
                                      >
                                        Reply
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingMessageId(item.msg.id);
                                          setEditBody(item.msg.body);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => deleteMessageMutation.mutate(item.msg.id)}
                                      >
                                        <Trash2 className="h-3 w-3 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                )}
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

              {/* Composer */}
              <div className="px-4 py-2 border-t border-[#202c33] bg-[#202c33]">
                {replyTo && (
                  <div className="mb-2 px-3 py-1.5 rounded-lg bg-white border border-emerald-100 text-xs flex items-start justify-between">
                    <div className="mr-2">
                      <p className="font-medium text-emerald-700">
                        Replying to {replyTo.sender?.fullName || replyTo.sender?.username || "message"}
                      </p>
                      <p className="line-clamp-2 text-muted-foreground">{replyTo.body}</p>
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive text-xs"
                      onClick={() => setReplyTo(null)}
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" size="icon" className="text-slate-300 hover:bg-[#111b21]">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-300 hover:bg-[#111b21]"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      title="Document or image"
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf,.doc,.docx,text/plain,audio/*"
                      onChange={handleFileChange}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={isRecording ? "text-red-400 bg-red-500/20" : "text-slate-300 hover:bg-[#111b21]"}
                    onClick={handleVoiceNote}
                    disabled={isUploading}
                    title={isRecording ? "Stop recording" : "Voice note"}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-300 hover:bg-[#111b21]"
                    onClick={handleShareLocation}
                    disabled={isUploading}
                    title="Share location"
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
                  <Input
                    placeholder="Type a message"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (newMessage.trim()) {
                          const payload = replyTo
                            ? `↩️ ${replyTo.sender?.fullName || replyTo.sender?.username || "Message"}: ${
                                replyTo.body
                              }\n\n${newMessage.trim()}`
                            : newMessage.trim();
                          sendMutation.mutate(payload);
                          setReplyTo(null);
                        }
                      }
                    }}
                    className="flex-1 bg-[#111b21] border-transparent text-slate-100 placeholder:text-slate-500 text-sm rounded-lg"
                  />
                  <Button
                    onClick={() => {
                      if (!newMessage.trim()) return;
                      const payload = replyTo
                        ? `↩️ ${replyTo.sender?.fullName || replyTo.sender?.username || "Message"}: ${
                            replyTo.body
                          }\n\n${newMessage.trim()}`
                        : newMessage.trim();
                      sendMutation.mutate(payload);
                      setReplyTo(null);
                    }}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    className="rounded-full h-9 w-9 p-0 flex items-center justify-center bg-emerald-500 hover:bg-emerald-400 text-white"
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 bg-[#0b141a]">
              <Card className="max-w-sm bg-[#111b21] border-[#202c33] text-slate-100">
                <CardContent className="pt-6 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-slate-500 mb-3" />
                  <p className="font-medium text-sm">Select a conversation or start a new one</p>
                  <p className="text-xs mt-1 text-slate-400">Use the + button above to open a chat.</p>
                  <Button className="mt-4 bg-emerald-500 hover:bg-emerald-400" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New chat
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right: people/online users pane */}
        <div className="w-64 border-l border-[#202c33] flex flex-col bg-[#111b21] text-slate-100 shrink-0">
          <div className="px-3 py-2 border-b border-[#202c33]">
            <h2 className="font-semibold text-xs uppercase tracking-wide text-slate-400">People</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {onlineUserIds.size} online
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {otherUsers.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">No other users</div>
            ) : (
              otherUsers.map((u) => {
                const isOnline = onlineUserIds.has(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#202c33] border-b border-[#202c33] text-left"
                    onClick={() => handleStartChatWithUser(u)}
                  >
                    <Avatar className="h-8 w-8 shrink-0 relative">
                      <AvatarFallback className="text-xs bg-[#202c33]">
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
                      <p className="text-[11px] text-slate-500">
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
                    placeholder="Chat or group name"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="mt-1"
                  />
            </div>

                {isAdminUser && (
                  <div>
                    <label className="text-sm font-medium">Conversation type</label>
                    <div className="mt-1 flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="convType"
                          checked={!newIsGroup}
                          onChange={() => setNewIsGroup(false)}
                        />
                        <span>Direct chat</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="convType"
                          checked={newIsGroup}
                          onChange={() => setNewIsGroup(true)}
                        />
                        <span>Group chat</span>
                      </label>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Only admins can create formal groups. Groups can have many members.
                    </p>
                  </div>
                )}
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
