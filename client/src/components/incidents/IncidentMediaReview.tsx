import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, RefreshCw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function isVideoUrl(url: string): boolean {
  return /\/videos\//i.test(url) || /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

export type IncidentMediaReviewProps = {
  incidentId: number;
  mediaUrls?: string[] | null;
  audioRecordingUrl?: string | null;
  audioTranscription?: string | null;
  transcriptionConfidence?: number | null;
  coordinates?: unknown;
  reportingMethod?: string | null;
  /** Tighter layout for list cards */
  compact?: boolean;
  onTranscriptionUpdated?: () => void;
};

export function IncidentMediaReview({
  incidentId,
  mediaUrls,
  audioRecordingUrl,
  audioTranscription,
  transcriptionConfidence,
  coordinates,
  reportingMethod,
  compact,
  onTranscriptionUpdated,
}: IncidentMediaReviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localTranscript, setLocalTranscript] = useState(audioTranscription ?? "");

  useEffect(() => {
    setLocalTranscript(audioTranscription ?? "");
  }, [audioTranscription]);

  const transcribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/incidents/${incidentId}/retranscribe`, {});
      return res.json() as Promise<{
        transcription?: { text?: string; confidence?: number };
      }>;
    },
    onSuccess: (data) => {
      const t = data?.transcription?.text ?? "";
      setLocalTranscript(t);
      toast({ title: "Transcription updated", description: t ? "Text refreshed from the recording." : "No text returned." });
      onTranscriptionUpdated?.();
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/pending-review"] });
    },
    onError: (e: Error) => {
      toast({ title: "Transcription failed", description: e.message, variant: "destructive" });
    },
  });

  const c = coordinates as { lat?: number; lng?: number } | undefined;
  const showGeo =
    c != null &&
    typeof c.lat === "number" &&
    typeof c.lng === "number" &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng);

  const urls = (mediaUrls ?? []).filter((u): u is string => typeof u === "string" && u.length > 0);
  const isVoice = reportingMethod === "voice";
  const hasStoredAudio = !!audioRecordingUrl?.trim();
  const audioSrc = hasStoredAudio ? audioRecordingUrl! : `/api/incidents/${incidentId}/audio`;

  if (urls.length === 0 && !showGeo && !isVoice && !hasStoredAudio) {
    return null;
  }

  const gridClass = compact ? "grid grid-cols-2 sm:grid-cols-3 gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 p-3">
      {showGeo && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>
            Latitude {c!.lat!.toFixed(5)}, longitude {c!.lng!.toFixed(5)}
          </span>
        </div>
      )}

      {urls.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">Photos / video</div>
          <div className={gridClass}>
            {urls.map((url) =>
              isVideoUrl(url) ? (
                <video
                  key={url}
                  controls
                  className={compact ? "max-h-32 w-full rounded border object-cover" : "max-h-56 w-full rounded border bg-black"}
                  src={url}
                  preload="metadata"
                />
              ) : (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded border bg-background">
                  <img
                    src={url}
                    alt="Incident attachment"
                    className={compact ? "h-28 w-full object-cover hover:opacity-90" : "max-h-64 w-full object-contain hover:opacity-90"}
                  />
                </a>
              ),
            )}
          </div>
        </div>
      )}

      {(isVoice || hasStoredAudio) && (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Mic className="h-4 w-4" />
            Voice recording
          </div>
          <audio
            controls
            className="w-full max-w-md"
            src={audioSrc}
            preload="metadata"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={transcribeMutation.isPending || !hasStoredAudio}
              onClick={() => transcribeMutation.mutate()}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${transcribeMutation.isPending ? "animate-spin" : ""}`} />
              Transcribe from audio
            </Button>
            {transcriptionConfidence != null && (
              <span className="text-xs text-muted-foreground">Last confidence: {transcriptionConfidence}%</span>
            )}
          </div>
          {localTranscript ? (
            <div className="rounded border bg-background/80 p-2 text-sm whitespace-pre-wrap">{localTranscript}</div>
          ) : (
            <p className="text-xs text-muted-foreground">No transcription yet. Use the button to generate text from the recording.</p>
          )}
        </div>
      )}
    </div>
  );
}
