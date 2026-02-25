import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Loader2, AlertCircle } from "lucide-react";
import { GuestCallRoom } from "@/components/calls/GuestCallRoom";

export default function CallsJoinPage() {
  const [, params] = useRoute("/calls/join/:callId");
  const callId = params?.callId ? parseInt(params.callId, 10) : null;
  const [displayName, setDisplayName] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [callType, setCallType] = useState<string>("video");
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<"active" | "ended" | "not_found" | null>(null);

  useEffect(() => {
    if (callId == null || isNaN(callId)) {
      setCallStatus("not_found");
      return;
    }
    fetch(`/api/calls/${callId}/public`)
      .then((r) => r.json())
      .then((data: { id?: number; type?: string; status?: string }) => {
        if (!data.id) setCallStatus("not_found");
        else if (data.status !== "active") setCallStatus("ended");
        else setCallStatus("active");
      })
      .catch(() => setCallStatus("not_found"));
  }, [callId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (callId == null || isNaN(callId) || !displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/calls/${callId}/join-guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      setGuestToken(data.guestToken);
      setCallType(data.type || "video");
      setParticipantId(data.participantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join call");
    } finally {
      setLoading(false);
    }
  };

  if (guestToken && callId != null && participantId != null) {
    return (
      <GuestCallRoom
        callId={callId}
        callType={callType}
        guestToken={guestToken}
        participantId={participantId}
        displayName={displayName.trim()}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-6 w-6" />
            Join call
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {callStatus === "not_found" && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              This call doesn’t exist or the link is invalid.
            </div>
          )}
          {callStatus === "ended" && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              This call has ended.
            </div>
          )}
          {callStatus === "active" && (
            <form onSubmit={handleJoin} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You’re joining as a guest. Enter your name to continue.
              </p>
              <div>
                <label className="text-sm font-medium">Your name</label>
                <Input
                  placeholder="e.g. Jane"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="mt-1"
                  maxLength={100}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading || !displayName.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Join call
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
