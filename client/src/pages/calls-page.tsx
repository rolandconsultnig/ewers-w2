import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/contexts/SocketContext";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Video, Phone, PhoneOff, Loader2, Users, Copy, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

function getPeerKey(userId: number | undefined, guestParticipantId?: number): string {
  if (guestParticipantId != null) return `guest-${guestParticipantId}`;
  if (userId == null) return "unknown";
  return `user-${userId}`;
}

export default function CallsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const {
    joinCall,
    leaveCall,
    emitCallOffer,
    emitCallAnswer,
    emitCallIce,
    onCallOffer,
    onCallAnswer,
    onCallIce,
    requestCallOffer,
    onCallRequestOffer,
    emitCallParticipantJoined,
    onCallParticipantJoined,
  } = useSocket();
  const [startCallOpen, setStartCallOpen] = useState(false);
  const [joinCallOpen, setJoinCallOpen] = useState(false);
  const [joinCallId, setJoinCallId] = useState("");
  const [callType, setCallType] = useState<"voice" | "video">("video");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [activeCall, setActiveCall] = useState<{ id: number; type: string; isInitiator: boolean } | null>(null);
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "waiting" | null>(null);
  const [remotePeers, setRemotePeers] = useState<{ id: string; label: string }[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const initiatorPcRef = useRef<RTCPeerConnection | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      return res.json();
    },
    enabled: !!user && startCallOpen,
  });

  const { data: activeCalls = [], refetch: refetchCalls } = useQuery({
    queryKey: ["/api/calls"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/calls");
      return res.json();
    },
    enabled: !!user && !activeCall,
  });

  const startCallMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calls", {
        type: callType,
        conversationId: conversationId || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setStartCallOpen(false);
      setActiveCall({ id: data.id, type: data.type, isInitiator: true });
      setCallStatus("connecting");
    },
  });

  const joinCallMutation = useMutation({
    mutationFn: async () => {
      const id = parseInt(joinCallId);
      if (isNaN(id)) throw new Error("Invalid call ID");
      const res = await apiRequest("POST", `/api/calls/${id}/join`);
      const data = await res.json();
      return { id: data.id, type: data.type };
    },
    onSuccess: (data) => {
      setJoinCallOpen(false);
      setJoinCallId("");
      setActiveCall({ id: data.id, type: data.type || "video", isInitiator: false });
      setCallStatus("connecting");
    },
  });

  const endCallMutation = useMutation({
    mutationFn: async () => {
      if (!activeCall) return;
      await apiRequest("POST", `/api/calls/${activeCall.id}/end`);
    },
    onSuccess: () => {
      setActiveCall(null);
      setCallStatus(null);
      setRemotePeers([]);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      pcMapRef.current.forEach((pc) => pc.close());
      pcMapRef.current.clear();
      setRemoteStreams(new Map());
      initiatorPcRef.current?.close();
      initiatorPcRef.current = null;
      refetchCalls();
    },
  });

  const getOrCreatePc = useCallback(
    (peerKey: string, callId: number, isVideo: boolean): RTCPeerConnection => {
      let pc = pcMapRef.current.get(peerKey);
      if (pc) return pc;
      if (peerKey === "initial" && initiatorPcRef.current) return initiatorPcRef.current;
      pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVERS }] });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => pc!.addTrack(track, localStreamRef.current!));
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          if (peerKey === "initial") {
            emitCallIce(callId, e.candidate);
          } else if (peerKey.startsWith("guest-")) {
            const toGuestId = parseInt(peerKey.replace("guest-", ""), 10);
            if (!isNaN(toGuestId)) emitCallIce(callId, e.candidate, undefined, toGuestId);
            else emitCallIce(callId, e.candidate);
          } else {
            const toUserId = parseInt(peerKey.replace("user-", ""), 10);
            if (!isNaN(toUserId)) emitCallIce(callId, e.candidate, toUserId);
            else emitCallIce(callId, e.candidate);
          }
        }
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (!stream) return;
        setRemoteStreams((prev) => new Map(prev).set(peerKey, stream));
        setRemotePeers((prev) => {
          if (prev.some((p) => p.id === peerKey)) return prev;
          return [...prev, { id: peerKey, label: peerKey.startsWith("user-") ? `Participant ${peerKey.replace("user-", "")}` : peerKey }];
        });
        setCallStatus("connected");
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setCallStatus("connected");
        else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") setCallStatus("connecting");
      };
      if (peerKey === "initial") initiatorPcRef.current = pc;
      else pcMapRef.current.set(peerKey, pc);
      return pc;
    },
    [emitCallIce]
  );

  const assignInitiatorPcToPeer = useCallback((peerKey: string) => {
    const pc = initiatorPcRef.current;
    if (!pc || peerKey === "initial") return;
    initiatorPcRef.current = null;
    pcMapRef.current.set(peerKey, pc);
  }, []);

  useEffect(() => {
    if (!activeCall) return;
    const callId = activeCall.id;
    const isVideo = activeCall.type === "video";
    const isInitiator = activeCall.isInitiator;
    const myUserId = user?.id;

    joinCall(callId);

    const setupLocalStream = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    };

    const unsubOffer = onCallOffer((data: { callId: number; offer: RTCSessionDescriptionInit; fromUserId?: number; fromGuestParticipantId?: number; toUserId?: number; toGuestParticipantId?: number }) => {
      if (data.callId !== callId) return;
      const fromKey = getPeerKey(data.fromUserId, data.fromGuestParticipantId);
      const isForMe = (data.toUserId == null && data.toGuestParticipantId == null) || data.toUserId === myUserId;
      if (!isForMe) return;
      const pc = getOrCreatePc(fromKey, callId, isVideo);
      pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(async () => {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (data.fromUserId != null) emitCallAnswer(callId, answer, data.fromUserId);
          else if (data.fromGuestParticipantId != null) emitCallAnswer(callId, answer, undefined, data.fromGuestParticipantId);
          else emitCallAnswer(callId, answer);
        })
        .catch(console.error);
    });

    const unsubAnswer = onCallAnswer((data: { callId: number; answer: RTCSessionDescriptionInit; fromUserId?: number; fromGuestParticipantId?: number }) => {
      if (data.callId !== callId) return;
      const fromKey = getPeerKey(data.fromUserId, data.fromGuestParticipantId);
      let pc = pcMapRef.current.get(fromKey) ?? initiatorPcRef.current;
      if (!pc) return;
      if (isInitiator && initiatorPcRef.current === pc) assignInitiatorPcToPeer(fromKey);
      pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(console.error);
      setCallStatus("connected");
    });

    const unsubIce = onCallIce((data: { callId: number; candidate: RTCIceCandidateInit; fromUserId?: number; fromGuestParticipantId?: number; toUserId?: number; toGuestParticipantId?: number }) => {
      if (data.callId !== callId) return;
      const isForMe = (data.toUserId == null && data.toGuestParticipantId == null) || data.toUserId === myUserId;
      if (!isForMe) return;
      const fromKey = getPeerKey(data.fromUserId, data.fromGuestParticipantId);
      const pc = pcMapRef.current.get(fromKey) ?? initiatorPcRef.current;
      if (!pc || !data.candidate) return;
      pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
    });

    const unsubRequest = onCallRequestOffer((data: { callId: number; fromUserId?: number; fromGuestParticipantId?: number; fromGuestDisplayName?: string }) => {
      if (data.callId !== callId) return;
      const fromKey = getPeerKey(data.fromUserId, data.fromGuestParticipantId);
      const pc = getOrCreatePc(fromKey, callId, isVideo);
      pc.createOffer()
        .then(async (offer) => {
          await pc.setLocalDescription(offer);
          if (data.fromUserId != null) emitCallOffer(callId, offer, data.fromUserId);
          else if (data.fromGuestParticipantId != null) emitCallOffer(callId, offer, undefined, data.fromGuestParticipantId);
          else emitCallOffer(callId, offer);
        })
        .catch(console.error);
    });

    const unsubParticipantJoined = onCallParticipantJoined((data: { callId: number; userId?: number; guestParticipantId?: number; guestDisplayName?: string }) => {
      if (data.callId !== callId) return;
      const key = getPeerKey(data.userId, data.guestParticipantId);
      const label = data.guestDisplayName ?? (data.userId != null ? `User ${data.userId}` : key);
      setRemotePeers((prev) => {
        if (prev.some((p) => p.id === key)) return prev;
        return [...prev, { id: key, label }];
      });
    });

    setupLocalStream()
      .then(() => {
        if (isInitiator) {
          const pc = getOrCreatePc("initial", callId, isVideo);
          pc.createOffer()
            .then(async (offer) => {
              await pc.setLocalDescription(offer);
              emitCallOffer(callId, offer);
              setCallStatus("waiting");
            })
            .catch(console.error);
        } else {
          requestCallOffer(callId);
          emitCallParticipantJoined(callId);
        }
      })
      .catch((err) => {
        console.error("WebRTC setup failed:", err);
        toast({ title: "Media access failed", description: err.message, variant: "destructive" });
        setCallStatus(null);
      });

    return () => {
      leaveCall(callId);
      unsubOffer();
      unsubAnswer();
      unsubIce();
      unsubRequest();
      unsubParticipantJoined();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      pcMapRef.current.forEach((pc) => pc.close());
      pcMapRef.current.clear();
      setRemoteStreams(new Map());
      initiatorPcRef.current?.close();
      initiatorPcRef.current = null;
    };
  }, [activeCall?.id, activeCall?.isInitiator, activeCall?.type]);

  const inviteLink = activeCall
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/calls/join/${activeCall.id}`
    : "";
  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Invite link copied", description: "Share this link for others to join (including non-users)." });
    }
  };
  const copyCallId = () => {
    if (activeCall) {
      navigator.clipboard.writeText(String(activeCall.id));
      toast({ title: "Call ID copied" });
    }
  };

  return (
    <MainLayout title="Voice & Video Calls">
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-6 w-6" />
              Voice & Video Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Start a 1:1 or group voice/video call. Share the invite link with anyone—including people who don’t have an account—to join the call.
            </p>

            {activeCall ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCall.type === "video" && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">You</p>
                      <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full rounded-lg border bg-muted aspect-video object-cover"
                      />
                    </div>
                  )}
                  {Array.from(remoteStreams.entries()).map(([peerKey, stream]) => (
                    <div key={peerKey} className="space-y-2">
                      <p className="text-sm font-medium">{remotePeers.find((p) => p.id === peerKey)?.label ?? peerKey}</p>
                      <RemoteVideo stream={stream} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Call ID: {activeCall.id}</span>
                    <Button variant="ghost" size="icon" onClick={copyCallId} title="Copy Call ID">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyInviteLink} className="gap-1">
                      <Link2 className="h-4 w-4" />
                      Copy invite link
                    </Button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {callStatus === "connecting" && "Connecting..."}
                    {callStatus === "waiting" && "Waiting for others..."}
                    {callStatus === "connected" && "Connected"}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => endCallMutation.mutate()}
                  disabled={endCallMutation.isPending}
                >
                  {endCallMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                  End Call
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => setStartCallOpen(true)} className="flex-1" size="lg">
                    <Video className="h-5 w-5 mr-2" />
                    Start Call
                  </Button>
                  <Button variant="outline" onClick={() => setJoinCallOpen(true)} className="flex-1" size="lg">
                    <Phone className="h-5 w-5 mr-2" />
                    Join Call
                  </Button>
                </div>
                {activeCalls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Active calls</p>
                    <div className="flex flex-wrap gap-2">
                      {activeCalls.map((c: { id: number; type: string }) => (
                        <Button
                          key={c.id}
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setJoinCallId(String(c.id));
                            setJoinCallOpen(true);
                          }}
                        >
                          Join call #{c.id} ({c.type})
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setLocation("/chat")}>
                    <Users className="h-4 w-4 mr-2" />
                    Open Chat
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={startCallOpen} onOpenChange={setStartCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Call type</label>
              <Select value={callType} onValueChange={(v: "voice" | "video") => setCallType(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voice">Voice</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Link to conversation (optional)</label>
              <Select
                value={conversationId ? String(conversationId) : "none"}
                onValueChange={(v) => setConversationId(v === "none" ? null : parseInt(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {conversations.map((c: { id: number; title?: string }) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.title || `Conversation #${c.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartCallOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => startCallMutation.mutate()} disabled={startCallMutation.isPending}>
              {startCallMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Start Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={joinCallOpen} onOpenChange={setJoinCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Call ID</label>
              <Input
                placeholder="Enter call ID"
                type="number"
                value={joinCallId}
                onChange={(e) => setJoinCallId(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ask the host for the Call ID, or use the invite link: /calls/join/[ID]
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinCallOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => joinCallMutation.mutate()}
              disabled={!joinCallId.trim() || joinCallMutation.isPending}
            >
              {joinCallMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Join
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="w-full rounded-lg border bg-muted aspect-video object-cover"
    />
  );
}
