import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";

interface OnlineUser {
  userId: number;
  username: string;
}

export interface TypingUser {
  conversationId: number;
  userId: number;
  username: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: unknown;
  onlineUsers: OnlineUser[];
  joinConversation: (conversationId: number) => void;
  leaveConversation: (conversationId: number) => void;
  onNewMessage: (cb: (msg: unknown) => void) => () => void;
  emitTypingStart: (conversationId: number) => void;
  emitTypingStop: (conversationId: number) => void;
  onTyping: (cb: (data: TypingUser) => void) => () => void;
  onTypingStop: (cb: (data: { conversationId: number; userId: number }) => void) => () => void;
  joinCall: (callId: number) => void;
  leaveCall: (callId: number) => void;
  emitCallOffer: (callId: number, offer: RTCSessionDescriptionInit) => void;
  emitCallAnswer: (callId: number, answer: RTCSessionDescriptionInit) => void;
  emitCallIce: (callId: number, candidate: RTCIceCandidateInit) => void;
  onCallOffer: (cb: (data: { callId: number; offer: RTCSessionDescriptionInit }) => void) => () => void;
  onCallAnswer: (cb: (data: { callId: number; answer: RTCSessionDescriptionInit }) => void) => () => void;
  onCallIce: (cb: (data: { callId: number; candidate: RTCIceCandidateInit }) => void) => () => void;
  requestCallOffer: (callId: number) => void;
  onCallRequestOffer: (cb: (data: { callId: number }) => void) => () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  lastMessage: null,
  onlineUsers: [],
  joinConversation: () => {},
  leaveConversation: () => {},
  onNewMessage: () => () => {},
  emitTypingStart: () => {},
  emitTypingStop: () => {},
  onTyping: () => () => {},
  onTypingStop: () => () => {},
  joinCall: () => {},
  leaveCall: () => {},
  emitCallOffer: () => {},
  emitCallAnswer: () => {},
  emitCallIce: () => {},
  onCallOffer: () => () => {},
  onCallAnswer: () => () => {},
  onCallIce: () => () => {},
  requestCallOffer: () => {},
  onCallRequestOffer: () => () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const joinConversation = useCallback((conversationId: number) => {
    socket?.emit("join-conversation", conversationId);
  }, [socket]);

  const leaveConversation = useCallback((conversationId: number) => {
    socket?.emit("leave-conversation", conversationId);
  }, [socket]);

  const onNewMessage = useCallback((cb: (msg: unknown) => void) => {
    if (!socket) return () => {};
    socket.on("new-message", cb);
    return () => socket.off("new-message", cb);
  }, [socket]);

  const emitTypingStart = useCallback((conversationId: number) => {
    socket?.emit("chat:typing-start", conversationId);
  }, [socket]);
  const emitTypingStop = useCallback((conversationId: number) => {
    socket?.emit("chat:typing-stop", conversationId);
  }, [socket]);
  const onTyping = useCallback((cb: (data: TypingUser) => void) => {
    if (!socket) return () => {};
    socket.on("chat:typing", cb);
    return () => socket.off("chat:typing", cb);
  }, [socket]);
  const onTypingStop = useCallback((cb: (data: { conversationId: number; userId: number }) => void) => {
    if (!socket) return () => {};
    socket.on("chat:typing-stop", cb);
    return () => socket.off("chat:typing-stop", cb);
  }, [socket]);

  const joinCall = useCallback((callId: number) => socket?.emit("call:join", callId), [socket]);
  const leaveCall = useCallback((callId: number) => socket?.emit("call:leave", callId), [socket]);
  const emitCallOffer = useCallback((callId: number, offer: RTCSessionDescriptionInit) => socket?.emit("call:offer", { callId, offer }), [socket]);
  const emitCallAnswer = useCallback((callId: number, answer: RTCSessionDescriptionInit) => socket?.emit("call:answer", { callId, answer }), [socket]);
  const emitCallIce = useCallback((callId: number, candidate: RTCIceCandidateInit) => socket?.emit("call:ice", { callId, candidate }), [socket]);
  const onCallOffer = useCallback((cb: (data: { callId: number; offer: RTCSessionDescriptionInit }) => void) => {
    if (!socket) return () => {};
    socket.on("call:offer", cb);
    return () => socket.off("call:offer", cb);
  }, [socket]);
  const onCallAnswer = useCallback((cb: (data: { callId: number; answer: RTCSessionDescriptionInit }) => void) => {
    if (!socket) return () => {};
    socket.on("call:answer", cb);
    return () => socket.off("call:answer", cb);
  }, [socket]);
  const onCallIce = useCallback((cb: (data: { callId: number; candidate: RTCIceCandidateInit }) => void) => {
    if (!socket) return () => {};
    socket.on("call:ice", cb);
    return () => socket.off("call:ice", cb);
  }, [socket]);
  const requestCallOffer = useCallback((callId: number) => socket?.emit("call:request-offer", callId), [socket]);
  const onCallRequestOffer = useCallback((cb: (data: { callId: number }) => void) => {
    if (!socket) return () => {};
    socket.on("call:request-offer", cb);
    return () => socket.off("call:request-offer", cb);
  }, [socket]);

  useEffect(() => {
    const socketUrl = window.location.origin;
    const s = io(socketUrl, {
      path: "/socket.io",
      auth: user
        ? { userId: user.id, username: user.username }
        : {},
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));
    s.on("connect_error", () => {
      setIsConnected(false);
    });
    s.on("alerts", (data) => setLastMessage({ type: "alerts", data }));
    s.on("new-alert", (data) => setLastMessage({ type: "new-alert", data }));
    s.on("updated-alert", (data) => setLastMessage({ type: "updated-alert", data }));
    s.on("online-users", (users: OnlineUser[]) => setOnlineUsers(users));

    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [user?.id, user?.username]);

  return (
    <SocketContext.Provider value={{
      socket, isConnected, lastMessage, onlineUsers,
      joinConversation, leaveConversation, onNewMessage,
      emitTypingStart, emitTypingStop, onTyping, onTypingStop,
      joinCall, leaveCall, emitCallOffer, emitCallAnswer, emitCallIce,
      onCallOffer, onCallAnswer, onCallIce,
      requestCallOffer, onCallRequestOffer,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
