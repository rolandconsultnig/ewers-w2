import { useState, useEffect, useRef } from "react";
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
import { Video, Phone, PhoneOff, Loader2, Users, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STUN_SERVERS = [
  "stun:stun.l.google.com:19302",
  "stun:stun1.l.google.com:19302",
];

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
  } = useSocket();
  const [startCallOpen, setStartCallOpen] = useState(false);
  const [joinCallOpen, setJoinCallOpen] = useState(false);
  const [joinCallId, setJoinCallId] = useState("");
  const [callType, setCallType] = useState<"voice" | "video">("video");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [activeCall, setActiveCall] = useState<{ id: number; type: string; isInitiator: boolean } | null>(null);
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "waiting" | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      return res.json();
    },
    enabled: !!user && startCallOpen,
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
      await apiRequest("POST", `/api/calls/${id}/join`);
      return { id };
    },
    onSuccess: (data) => {
      setJoinCallOpen(false);
      setJoinCallId("");
      setActiveCall({ id: data.id, type: "video", isInitiator: false });
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    },
  });

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  useEffect(() => {
    if (!activeCall) return;
    const callId = activeCall.id;
    const isVideo = activeCall.type === "video";
    const isInitiator = activeCall.isInitiator;

    joinCall(callId);

    const setupPeerConnection = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: STUN_SERVERS }],
      });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        setCallStatus("connected");
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) emitCallIce(callId, e.candidate);
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setCallStatus("connecting");
        } else if (pc.connectionState === "connected") {
          setCallStatus("connected");
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emitCallOffer(callId, offer);
        setCallStatus("waiting");
      } else {
        requestCallOffer(callId);
      }
    };

    const unsubOffer = onCallOffer((data) => {
      if (data.callId !== callId) return;
      const pc = pcRef.current;
      if (!pc || isInitiator) return;
      pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(async () => {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emitCallAnswer(callId, answer);
        })
        .catch(console.error);
    });

    const unsubAnswer = onCallAnswer((data) => {
      if (data.callId !== callId) return;
      const pc = pcRef.current;
      if (!pc || !isInitiator) return;
      pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(console.error);
      setCallStatus("connected");
    });

    const unsubIce = onCallIce((data) => {
      if (data.callId !== callId) return;
      const pc = pcRef.current;
      if (!pc || !data.candidate) return;
      pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
    });

    const unsubRequest = onCallRequestOffer((data) => {
      if (data.callId !== callId) return;
      const pc = pcRef.current;
      if (!pc || !isInitiator) return;
      const offer = pc.localDescription;
      if (offer) emitCallOffer(callId, offer);
    });

    setupPeerConnection().catch((err) => {
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
      cleanup();
    };
  }, [activeCall?.id, activeCall?.isInitiator, activeCall?.type]);

  const copyCallId = () => {
    if (activeCall) {
      navigator.clipboard.writeText(String(activeCall.id));
      toast({ title: "Call ID copied" });
    }
  };

  return (
    <MainLayout title="Voice & Video Calls">
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-6 w-6" />
              Voice & Video Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Start a voice or video call with your team. Share the Call ID with others to let them join.
              Call sessions are tracked and can be linked to conversations.
            </p>

            {activeCall ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {activeCall.type === "video" && (
                    <div className="flex-1 min-w-[200px] space-y-2">
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
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <p className="text-sm font-medium">Remote</p>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg border bg-muted aspect-video object-cover"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Call ID: {activeCall.id}
                    </span>
                    <Button variant="ghost" size="icon" onClick={copyCallId}>
                      <Copy className="h-4 w-4" />
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
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLocation("/chat")}>
                <Users className="h-4 w-4 mr-2" />
                Open Chat
              </Button>
            </div>
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
                  {conversations.map((c: any) => (
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
                Ask the call host for the Call ID to join
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
