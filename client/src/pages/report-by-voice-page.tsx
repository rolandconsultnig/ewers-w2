import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Mic, MapPin, Loader2 } from "lucide-react";
import ipcr_logo from "@assets/Institute-For-Peace-And-Conflict-Resolution.jpg";

const schema = z.object({
  location: z.string().min(2, "Location is required"),
  region: z.string().min(2, "Region is required"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.enum([
    "violence",
    "protest",
    "natural_disaster",
    "economic",
    "political",
    "sgbv",
    "conflict",
    "terrorism",
    "kidnapping",
    "infrastructure",
  ]),
});

type FormValues = z.infer<typeof schema>;

export default function ReportByVoicePage() {
  const { toast } = useToast();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [showRecorder, setShowRecorder] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      location: "",
      region: "North Central",
      severity: "medium",
      category: "conflict",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormValues & { audioFile: Blob }) => {
      const formData = new FormData();
      formData.append("audio", data.audioFile, "voice-report.webm");
      formData.append("location", data.location);
      formData.append("region", data.region);
      formData.append("severity", data.severity);
      formData.append("category", data.category);

      const res = await fetch("/api/incidents/public/voice", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || res.statusText || "Submission failed");
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Report submitted",
        description: "Thank you. Your voice report has been received and will be reviewed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/public/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      setSuccess(true);
      form.reset();
      setAudioBlob(null);
      setShowRecorder(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
    toast({
      title: "Recording saved",
      description: `Audio recorded (${duration}s). Add location details and submit.`,
    });
  };

  const onSubmit = (data: FormValues) => {
    if (!audioBlob) {
      toast({
        title: "No recording",
        description: "Please record your report first.",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate({ ...data, audioFile: audioBlob });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
        <header className="bg-white shadow-sm py-4">
          <div className="container mx-auto flex justify-between items-center px-4">
            <div className="flex items-center space-x-2">
              <img src={ipcr_logo} alt="IPCR" className="h-16 w-16" />
              <div>
                <h1 className="text-xl font-bold text-blue-600">IPCR</h1>
                <p className="text-sm text-gray-500">Early Warning & Early Response System</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft size={16} /> Back to Home
              </Button>
            </Link>
          </div>
        </header>
        <div className="container mx-auto py-16 px-4 max-w-lg text-center">
          <Card className="shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <CardTitle>Thank you</CardTitle>
              <CardDescription className="text-white/90">
                Your voice report has been submitted successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 pb-6">
              <p className="text-gray-600 mb-6">
                Officials will review it. No account or personal details were required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button variant="outline">Return to Home</Button>
                </Link>
                <Button
                  onClick={() => {
                    setSuccess(false);
                    setAudioBlob(null);
                  }}
                >
                  Submit another report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-2">
            <img src={ipcr_logo} alt="IPCR" className="h-16 w-16" />
            <div>
              <h1 className="text-xl font-bold text-blue-600">Institute For Peace And Conflict Resolution</h1>
              <p className="text-sm text-gray-500">Report by Voice</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft size={16} /> Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto py-10 px-4 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Incident by Voice</h1>
          <p className="text-gray-600">
            Record your report—no account or personal details required. We’ll transcribe it and forward it for review.
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-sky-500 text-white">
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-6 w-6" />
              Record & submit
            </CardTitle>
            <CardDescription className="text-white/90">
              Step 1: Record. Step 2: Add location and type. Step 3: Submit.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">Step 1: Record your report</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Speak clearly and describe what happened. You can record again before submitting.
              </p>
              {!showRecorder && !audioBlob && (
                <Button type="button" onClick={() => setShowRecorder(true)} size="lg" className="gap-2">
                  <Mic className="h-5 w-5" /> Start recording
                </Button>
              )}
              {showRecorder && (
                <VoiceRecorder
                  onRecordingComplete={handleRecordingComplete}
                  onRecordingStart={() => toast({ title: "Recording started", description: "Speak clearly." })}
                />
              )}
              {audioBlob && !showRecorder && (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                    Recorded ({audioDuration}s)
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAudioBlob(null);
                      setShowRecorder(true);
                    }}
                  >
                    Record again
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Step 2: Where did it happen?
              </h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. town or area" {...field} />
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                              <SelectItem value="Federal Capital Territory">FCT</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Severity</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="conflict">Conflict</SelectItem>
                              <SelectItem value="violence">Violence</SelectItem>
                              <SelectItem value="protest">Protest</SelectItem>
                              <SelectItem value="political">Political</SelectItem>
                              <SelectItem value="sgbv">SGBV</SelectItem>
                              <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                              <SelectItem value="economic">Economic</SelectItem>
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
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={!audioBlob || submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit voice report"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          You can also <Link href="/report-incident">report in writing</Link> without an account.
        </p>
      </div>

      <footer className="bg-gray-100 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} Institute for Peace and Conflict Resolution.</p>
        </div>
      </footer>
    </div>
  );
}
