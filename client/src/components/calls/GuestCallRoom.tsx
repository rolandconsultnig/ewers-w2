import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { PhoneOff, Loader2 } from "lucide-react";

const STUN_SERVERS = ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];

function getPeerKey(userId: number | undefined, guestParticipantId?: number): string {
  if (guestParticipantId != null) return `guest-${guestParticipantId}`;
  if (userId == null) return "unknown";
  return `user-${userId}`;
}

export function GuestCallRoom({
  callId,
  callType,
  guestToken,
  participantId,
  displayName,
}: {
  callId: number;
  callType: string;
  guestToken: string;
  participantId: number;
  displayName: string;
}) {
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "waiting">("connecting");
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remotePeers, setRemotePeers] = useState<{ id: string; label: string }[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const getOrCreatePc = useCallback(
    (peerKey: string, isVideo: boolean): RTCPeerConnection => {
      let pc = pcMapRef.current.get(peerKey);
      if (pc) return pc;
      pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVERS }] });
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => pc!.addTrack(track, localStreamRef.current!));
      }
      pc.onicecandidate = (e) => {
        if (!e.candidate || !socketRef.current) return;
        if (peerKey.startsWith("guest-")) {
          const toGuestId = parseInt(peerKey.replace("guest-", ""), 10);
          socketRef.current.emit("call:ice", { callId, candidate: e.candidate, toGuestParticipantId: toGuestId });
        } else {
          const toUserId = parseInt(peerKey.replace("user-", ""), 10);
          socketRef.current.emit("call:ice", { callId, candidate: e.candidate, toUserId });
        }
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (!stream) return;
        setRemoteStreams((prev) => new Map(prev).set(peerKey, stream));
        setRemotePeers((prev) => {
          if (prev.some((p) => p.id === peerKey)) return prev;
          return [...prev, { id: peerKey, label: peerKey.startsWith("user-") ? `User ${peerKey.replace("user-", "")}` : peerKey }];
        });
        setCallStatus("connected");
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setCallStatus("connected");
      };
      pcMapRef.current.set(peerKey, pc);
      return pc;
    },
    []
  );

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/socket.io",
      auth: { guestToken },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("call:join", callId);
    });

    const isVideo = callType === "video";

    const setupLocal = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideo });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    };

    const unsubOffer = (cb: (data: unknown) => void) => {
      socket.on("call:offer", cb);
      return () => socket.off("call:offer", cb);
    };
    const unsubAnswer = (cb: (data: unknown) => void) => {
      socket.on("call:answer", cb);
      return () => socket.off("call:answer", cb);
    };
    const unsubIce = (cb: (data: unknown) => void) => {
      socket.on("call:ice", cb);
      return () => socket.off("call:ice", cb);
    };

    const off1 = unsubOffer((data: any) => {
      if (data.callId !== callId) return;
      const toMe = (data.toUserId == null && data.toGuestParticipantId == null) || data.toGuestParticipantId === participantId;
      if (!toMe) return;
      const fromKey = getPeerKey(data.fromUserId, data.fromGuestParticipantId);
      const pc = getOrCreatePc(fromKey, isVideo);
      pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        .then(async () => {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (data.fromUserId != null) socket.emit("call:answer", { callId, answer, toUserId: data.fromUserId });
          else if (data.fromGuestParticipantId != null) socket.emit("call:answer", { callId, answer, toGuestParticipantId: data.fromGuestParticipantId });
          else socket.emit("call:answer", { callId, answer });
        })
        .catch(console.error);
    });

    const off2 = unsubAnswer((data: any) => {
      if (data.callId !== callId) return;
      const fromKey = getPeerKey(data.fromUserId, data.fromGuestParticipantId);
      const pc = pcMapRef.current.get(fromKey);
      if (!pc) return;
      pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(console.error);
      setCallStatus("connected");
    });

    const off3 = unsubIce((data: any) => {
      if (data.callId !== callId) return;
      const toMe = (data.toUserId == null && data.toGuestParticipantId == null) || data.toGuestParticipantId === participantId;
      if (!toMe) return;
      const fromKey = getPeerKey(data.fromUserId, data.fromGuestParticipantId);
      const pc = pcMapRef.current.get(fromKey);
      if (!pc || !data.candidate) return;
      pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(console.error);
    });

    setupLocal()
      .then(() => {
        socket.emit("call:request-offer", callId);
        socket.emit("call:participant-joined", { callId });
        setCallStatus("waiting");
      })
      .catch(console.error);

    return () => {
      off1();
      off2();
      off3();
      socket.emit("call:leave", callId);
      socket.disconnect();
      socketRef.current = null;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      pcMapRef.current.forEach((pc) => pc.close());
      pcMapRef.current.clear();
      setRemoteStreams(new Map());
    };
  }, [callId, callType, guestToken, participantId]);

  const handleEndCall = async () => {
    try {
      await fetch(`/api/calls/${callId}/leave-guest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${guestToken}` },
      });
    } catch (_) {}
    window.location.href = `/calls/join/${callId}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">In call as {displayName}</h1>
        <span className="text-sm text-muted-foreground">
          {callStatus === "connecting" && "Connecting..."}
          {callStatus === "waiting" && "Waiting for others..."}
          {callStatus === "connected" && "Connected"}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        {callType === "video" && (
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
      <div className="mt-4 flex justify-center">
        <Button variant="destructive" onClick={handleEndCall}>
          <PhoneOff className="h-4 w-4 mr-2" />
          Leave call
        </Button>
      </div>
    </div>
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
