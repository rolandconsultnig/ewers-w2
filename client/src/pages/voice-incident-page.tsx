import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Mic, AlertTriangle, MapPin, Loader2, Play, List, Volume2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const voiceIncidentSchema = z.object({
  location: z.string().min(3, "Location is required"),
  region: z.string().min(2, "Region is required"),
  state: z.string().optional(),
  lga: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.enum(["violence", "protest", "natural_disaster", "economic", "political", "sgbv", "conflict", "terrorism", "kidnapping", "infrastructure"]),
});

type VoiceIncidentFormValues = z.infer<typeof voiceIncidentSchema>;

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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

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

  const form = useForm<VoiceIncidentFormValues>({
    resolver: zodResolver(voiceIncidentSchema),
    defaultValues: {
      location: "",
      region: "North Central",
      state: "",
      lga: "",
      severity: "medium",
      category: "conflict",
    },
  });

  const submitVoiceIncidentMutation = useMutation({
    mutationFn: async (data: VoiceIncidentFormValues & { audioFile: Blob }) => {
      const formData = new FormData();
      
      // Add audio file
      formData.append('audio', data.audioFile, 'voice-incident.webm');
      
      // Add form fields
      formData.append('location', data.location);
      formData.append('region', data.region);
      if (data.state) formData.append('state', data.state);
      if (data.lga) formData.append('lga', data.lga);
      formData.append('severity', data.severity);
      formData.append('category', data.category);

      const response = await fetch('/api/incidents/voice', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit voice incident');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Voice Incident Submitted",
        description: `Your incident has been recorded and transcribed. Confidence: ${data.transcription.confidence}%`,
      });
      
      // Reset form and audio
      form.reset();
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
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
    toast({
      title: "Recording Saved",
      description: `Audio recorded successfully (${duration}s). Fill in the details and submit.`,
    });
  };

  const onSubmit = (data: VoiceIncidentFormValues) => {
    if (!audioBlob) {
      toast({
        title: "No Audio Recording",
        description: "Please record audio before submitting",
        variant: "destructive",
      });
      return;
    }

    submitVoiceIncidentMutation.mutate({
      ...data,
      audioFile: audioBlob,
    });
  };

  return (
    <MainLayout title="Voice Incident Reporting">
      <div className="container mx-auto p-6 max-w-4xl">
        <Tabs defaultValue="report">
          <TabsList className="mb-4">
            <TabsTrigger value="report">Report New</TabsTrigger>
            <TabsTrigger value="list">Voice Incidents ({voiceIncidents.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="report">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Mic className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">Report Incident by Voice</CardTitle>
                <CardDescription>
                  Record your incident report and we'll automatically transcribe it
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Recording Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <div className="text-center mb-4">
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

            {/* Form Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Step 2: Provide Location Details</h3>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Wuse Market, Abuja" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Region</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="North Central">North Central</SelectItem>
                              <SelectItem value="North East">North East</SelectItem>
                              <SelectItem value="North West">North West</SelectItem>
                              <SelectItem value="South East">South East</SelectItem>
                              <SelectItem value="South South">South South</SelectItem>
                              <SelectItem value="South West">South West</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., FCT" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lga"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LGA (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Abuja Municipal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Severity
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select severity" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="violence">Violence</SelectItem>
                              <SelectItem value="protest">Protest</SelectItem>
                              <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                              <SelectItem value="economic">Economic</SelectItem>
                              <SelectItem value="political">Political</SelectItem>
                              <SelectItem value="sgbv">SGBV</SelectItem>
                              <SelectItem value="conflict">Conflict</SelectItem>
                              <SelectItem value="terrorism">Terrorism</SelectItem>
                              <SelectItem value="kidnapping">Kidnapping</SelectItem>
                              <SelectItem value="infrastructure">Infrastructure</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={!audioBlob || submitVoiceIncidentMutation.isPending}
                      className="flex-1"
                    >
                      {submitVoiceIncidentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Submit Voice Report'
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
                </form>
              </Form>
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Record your incident report using the voice recorder</li>
                <li>Our AI will automatically transcribe your audio</li>
                <li>Fill in the location and severity details</li>
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
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{inc.description}</p>
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
                        {inc.audioRecordingUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (playingId === inc.id) {
                                setPlayingId(null);
                                return;
                              }
                              setPlayingId(inc.id);
                              const audio = new Audio(window.location.origin + inc.audioRecordingUrl);
                              audio.onended = () => setPlayingId(null);
                              audio.play();
                            }}
                          >
                            {playingId === inc.id ? (
                              <Volume2 className="h-4 w-4 animate-pulse" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      {inc.audioTranscription && (
                        <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Transcription</p>
                          <p>{inc.audioTranscription}</p>
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
