import { ChangeEvent, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Mic, Loader2, List, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

type VoiceIncident = {
  id: number;
  title: string;
  description: string;
  location?: string;
  severity: string;
  status: string;
  reportedAt?: string;
  audioRecordingUrl?: string;
  audioTranscription?: string;
  transcriptionConfidence?: number;
};

export default function VoiceIncidentPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [audioBlob, setAudioBlob] = useState<Blob | File | null>(null);
  const [retranscribingId, setRetranscribingId] = useState<number | null>(null);

  const { data: voiceIncidents = [], refetch: refetchVoice } = useQuery<VoiceIncident[]>({
    queryKey: ["/api/incidents/voice"],
    queryFn: async () => {
      const res = await fetch("/api/incidents/voice", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const [audioDuration, setAudioDuration] = useState(0);
  const [showRecorder, setShowRecorder] = useState(false);
  const sanitizeVisibleText = (value?: string | null): string => {
    if (!value) return "";
    const lower = value.toLowerCase();
    if (
      lower.includes("openai") ||
      lower.includes("deepseek") ||
      lower.includes("api key") ||
      lower.includes("not configured") ||
      lower.includes("[transcription unavailable") ||
      lower.includes("[transcription failed")
    ) {
      return "[Transcription unavailable]";
    }
    return value;
  };
  const sanitizeUserError = (value?: string | null): string => {
    if (!value) return "Unable to complete this action right now. Please try again.";
    const lower = value.toLowerCase();
    if (lower.includes("openai") || lower.includes("deepseek") || lower.includes("api key")) {
      return "Unable to complete this action right now. Please try again.";
    }
    return value;
  };
  const getBlobFilename = (blob: Blob): string => {
    const mime = blob.type?.toLowerCase() || "";
    if (mime.includes("webm")) return "voice-incident.webm";
    if (mime.includes("wav")) return "voice-incident.wav";
    if (mime.includes("mpeg") || mime.includes("mp3")) return "voice-incident.mp3";
    if (mime.includes("mp4") || mime.includes("m4a")) return "voice-incident.m4a";
    if (mime.includes("ogg")) return "voice-incident.ogg";
    return "voice-incident.webm";
  };

  const submitVoiceIncidentMutation = useMutation({
    mutationFn: async (data: { audioFile: Blob | File }) => {
      const formData = new FormData();
      
      // Add audio file (preserve original filename when available for better format detection)
      if (data.audioFile instanceof File) {
        formData.append('audio', data.audioFile, data.audioFile.name);
      } else {
        formData.append('audio', data.audioFile, getBlobFilename(data.audioFile));
      }
      
      // Add form fields
      const response = await fetch('/api/incidents/voice', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const rawBody = await response.text();
        let message = 'Failed to submit voice incident';
        try {
          const parsed = JSON.parse(rawBody);
          const details = parsed?.details ? `: ${parsed.details}` : "";
          message = `${parsed?.error || message}${details}`;
        } catch {
          if (rawBody?.trim()) {
            message = `${message}: ${rawBody.trim()}`;
          }
        }
        throw new Error(message);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Voice Incident Submitted",
        description: `Your incident has been recorded and transcribed. Confidence: ${data.transcription.confidence}%`,
      });
      
      // Reset form and audio
      setAudioBlob(null);
      setShowRecorder(false);
      
      // Redirect to incident review or dashboard
      refetchVoice();
      setTimeout(() => {
        setLocation('/incident-review');
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: sanitizeUserError(error.message),
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
      setShowRecorder(false);
    toast({
      title: "Recording Saved",
        description: `Audio recorded successfully (${duration}s). Submit your voice report below.`,
    });
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAudioBlob(file);
    setAudioDuration(0);
    setShowRecorder(false);

    toast({
      title: "Audio file attached",
      description: "Your audio file is ready. Submit your voice report below.",
    });
  };

  const onSubmit = () => {
    if (!audioBlob) {
      toast({
        title: "No Audio Recording",
        description: "Please record audio before submitting",
        variant: "destructive",
      });
      return;
    }

    submitVoiceIncidentMutation.mutate({ audioFile: audioBlob });
  };

  return (
    <MainLayout title="Voice Incident Reporting">
      <div className="container mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6">
        <Tabs defaultValue="report">
          <TabsList className="mb-4 flex flex-wrap gap-2">
            <TabsTrigger value="report">Report New</TabsTrigger>
            <TabsTrigger value="list">Voice Incidents ({voiceIncidents.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="report">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Mic className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl">Report Incident by Voice</CardTitle>
                <CardDescription>
                  Record your incident report and we'll automatically transcribe it
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Recording Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 bg-gray-50 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Step 1: Record Your Report</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button below to start recording. Speak clearly and describe the incident in detail.
                </p>
              </div>

              {!showRecorder && !audioBlob && (
                <div className="text-center">
                  <Button
                    type="button"
                    onClick={() => setShowRecorder(true)}
                    size="lg"
                    className="gap-2"
                  >
                    <Mic className="h-5 w-5" />
                    Start Voice Recording
                  </Button>
                </div>
              )}

              {showRecorder && (
                <VoiceRecorder
                  onRecordingComplete={handleRecordingComplete}
                  onRecordingStart={() => {
                    toast({
                      title: "Recording Started",
                      description: "Speak clearly to describe the incident",
                    });
                  }}
                />
              )}

              {/* Mobile-friendly fallback: upload an existing audio file */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold mb-2">Alternative: Upload audio from your phone</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  If recording does not start on your device, you can use your phone&apos;s voice recorder and upload the file here.
                </p>
                <Input
                  type="file"
                  accept="audio/*"
                  capture="user"
                  onChange={handleFileUpload}
                />
              </div>

              {audioBlob && !showRecorder && (
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="font-medium">Audio Recorded ({audioDuration}s)</span>
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAudioBlob(null);
                        setShowRecorder(true);
                      }}
                    >
                      Record Again
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={!audioBlob || submitVoiceIncidentMutation.isPending}
                  className="flex-1"
                >
                  {submitVoiceIncidentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Submit Voice Report"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/dashboard')}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Record your incident report using the voice recorder</li>
                <li>Our AI will automatically transcribe your audio</li>
                <li>Submit immediately after recording or uploading audio</li>
                <li>Submit - your report will appear on the dashboard for review</li>
                <li>The original audio is saved for verification purposes</li>
              </ol>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Voice-Reported Incidents
                </CardTitle>
                <CardDescription>Play audio and view transcriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {voiceIncidents.map((inc) => (
                    <div key={inc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{inc.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{sanitizeVisibleText(inc.description)}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{inc.severity}</Badge>
                            <Badge variant="secondary">{inc.status}</Badge>
                            {inc.location && <span className="text-xs text-muted-foreground">{inc.location}</span>}
                          </div>
                          {inc.reportedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(inc.reportedAt), "MMM d, yyyy HH:mm")}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={retranscribingId === inc.id}
                          className="shrink-0 gap-1"
                          onClick={async () => {
                            setRetranscribingId(inc.id);
                            try {
                              const res = await apiRequest("POST", `/api/incidents/${inc.id}/retranscribe`, {});
                              await res.json();
                              toast({ title: inc.audioTranscription ? "Transcription updated" : "Transcription generated" });
                              await refetchVoice();
                            } catch (e) {
                              toast({
                                title: "Transcription failed",
                                description: e instanceof Error ? sanitizeUserError(e.message) : "Try again",
                                variant: "destructive",
                              });
                            } finally {
                              setRetranscribingId(null);
                            }
                          }}
                        >
                          <RefreshCw className={`h-4 w-4 ${retranscribingId === inc.id ? "animate-spin" : ""}`} />
                          {inc.audioTranscription ? "Re-transcribe" : "Transcribe"}
                        </Button>
                      </div>
                      <audio
                        controls
                        className="w-full max-w-md mt-3"
                        src={`/api/incidents/${inc.id}/audio`}
                        preload="metadata"
                      />
                      {inc.audioTranscription && (
                        <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Transcription</p>
                          <p>{sanitizeVisibleText(inc.audioTranscription)}</p>
                          {inc.transcriptionConfidence != null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Confidence: {inc.transcriptionConfidence}%
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {voiceIncidents.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No voice incidents yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
