import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearch } from "wouter";
import { useI18n } from "@/contexts/I18nContext";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

// Import components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, FileText, MapPin, AlertTriangle, User, Mic, MicOff, ImagePlus, Crosshair } from "lucide-react";

// Import the IPCR logo
import ipcr_logo from "@assets/Institute-For-Peace-And-Conflict-Resolution.jpg";
import { NIGERIA_REGIONS, NIGERIA_REGION_STATES } from "@/lib/nigeria-regions";

// Public incident report: only incident details required; contact and actor info optional
const publicIncidentSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Please provide a short description (at least 10 characters)"),
  location: z.string().min(2, "Location is required (e.g. landmark or general area)"),
  town: z.string().min(1, "Town or community is required"),
  incidentOccurredAt: z.string().min(1, "Please select date and time of the incident"),
  region: z.string().min(2, "Please select a region"),
  state: z.string().optional(),
  lga: z.string().optional(),
  category: z.enum([
    "violence",
    "protest",
    "political",
    "economic",
    "natural_disaster",
    "sgbv",
    "conflict",
  ]),
  actorType: z.enum(["state", "non-state", "skip"]).optional(),
  actorName: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Please provide a valid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
})
  .refine(
    (d) => {
      const l = (d.latitude ?? "").trim();
      const g = (d.longitude ?? "").trim();
      if (!l && !g) return true;
      if (!l || !g) return false;
      const la = Number(l);
      const ln = Number(g);
      return Number.isFinite(la) && Number.isFinite(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
    },
    { message: "Enter valid latitude and longitude, or leave both empty", path: ["longitude"] },
  );

type PublicIncidentFormValues = z.infer<typeof publicIncidentSchema>;

export default function ReportIncidentPage() {
  const { toast } = useToast();
  const { language } = useI18n();
  const searchString = useSearch();

  // Initialize form
  const form = useForm<PublicIncidentFormValues>({
    resolver: zodResolver(publicIncidentSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      town: "",
      incidentOccurredAt: "",
      region: "North Central",
      state: "",
      lga: "",
      category: "conflict",
      actorType: undefined,
      actorName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      latitude: "",
      longitude: "",
    },
  });

  const [mediaFiles, setMediaFiles] = React.useState<File[]>([]);

  // Mutation for submitting the incident (no login or personal details required)
  const reportIncidentMutation = useMutation({
    mutationFn: async (payload: { data: PublicIncidentFormValues; files: File[] }) => {
      const { data, files } = payload;
      const actorType = data.actorType && data.actorType !== "skip" ? data.actorType : undefined;
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const qlat = params.get("lat");
      const qlng = params.get("lng");
      const latFromQuery = qlat != null ? Number(qlat) : NaN;
      const lngFromQuery = qlng != null ? Number(qlng) : NaN;
      const latFromForm = (data.latitude ?? "").trim() ? Number(data.latitude) : NaN;
      const lngFromForm = (data.longitude ?? "").trim() ? Number(data.longitude) : NaN;
      const latn = Number.isFinite(latFromForm) ? latFromForm : latFromQuery;
      const lngn = Number.isFinite(lngFromForm) ? lngFromForm : lngFromQuery;

      const baseFields = {
        title: data.title,
        description: data.description,
        location: data.location,
        town: data.town,
        incidentOccurredAt: data.incidentOccurredAt,
        region: data.region,
        state: data.state || undefined,
        lga: data.lga || undefined,
        category: data.category,
        actorType: actorType,
        actorName: (data.actorName || "").trim(),
        contactName: (data.contactName || "").trim(),
        contactEmail: (data.contactEmail && data.contactEmail.trim()) || "",
        contactPhone: (data.contactPhone || "").trim(),
        ...(Number.isFinite(latn) && Number.isFinite(lngn) ? { latitude: latn, longitude: lngn } : {}),
      };

      if (files.length > 0) {
        const fd = new FormData();
        Object.entries(baseFields).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          fd.append(k, String(v));
        });
        files.forEach((f) => fd.append("media", f));
        const res = await fetch("/api/public/incidents", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            typeof err?.error === "string" ? err.error : Array.isArray(err?.error) ? "Validation failed" : res.statusText || "Failed to submit",
          );
        }
        return await res.json();
      }

      const res = await fetch("/api/public/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...baseFields,
          ...(Number.isFinite(latn) && Number.isFinite(lngn) ? { lat: latn, lng: lngn } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || res.statusText || "Failed to submit");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Incident Reported",
        description: "Thank you for your report. Officials will review it shortly.",
      });
      form.reset({
        title: "",
        description: "",
        location: "",
        town: "",
        incidentOccurredAt: "",
        region: "North Central",
        state: "",
        lga: "",
        category: "conflict",
        actorType: undefined,
        actorName: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        latitude: "",
        longitude: "",
      });
      setMediaFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/public/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      // Show success state
      setIsSubmitSuccess(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit report",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  // State to track if form has been successfully submitted
  const [isSubmitSuccess, setIsSubmitSuccess] = React.useState(false);

  function onSubmit(data: PublicIncidentFormValues) {
    reportIncidentMutation.mutate({ data, files: mediaFiles });
  }

  const nigeriaRegions = [...NIGERIA_REGIONS];
  const nigeriaRegionStates = NIGERIA_REGION_STATES;

  React.useEffect(() => {
    const params = new URLSearchParams(searchString);
    const lat = params.get("lat");
    const lng = params.get("lng");
    if (lat && lng) {
      const label = `Map location (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
      form.setValue("location", label, { shouldDirty: true });
      form.setValue("latitude", lat, { shouldDirty: true });
      form.setValue("longitude", lng, { shouldDirty: true });
    }
  }, [searchString, form]);

  const selectedRegion = form.watch("region");
  const selectedState = form.watch("state");

  React.useEffect(() => {
    const allowedStates = nigeriaRegionStates[selectedRegion] ?? [];
    if (selectedState && !allowedStates.includes(selectedState)) {
      form.setValue("state", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedRegion, selectedState, form]);

  // Prevent stale LGA when state changes.
  React.useEffect(() => {
    form.setValue("lga", "", { shouldDirty: true, shouldValidate: true });
  }, [selectedState, form]);

  const { data: lgaOptions = [], isLoading: loadingLgaOptions } = useQuery<string[]>({
    queryKey: ["/api/public/lga-options", selectedState],
    enabled: typeof selectedState === "string" && selectedState.trim().length > 0,
    queryFn: async () => {
      const state = selectedState ?? "";
      const res = await fetch(`/api/public/lga-options?state=${encodeURIComponent(state)}`);
      if (!res.ok) throw new Error("Failed to load LGA options");
      return (await res.json()) as string[];
    },
  });

  const recognitionLocale = React.useMemo(() => {
    if (language === "ig") return "ig-NG";
    if (language === "ha") return "ha-NG";
    if (language === "yo") return "yo-NG";
    return "en-NG";
  }, [language]);

  const speech = useSpeechRecognition({
    lang: recognitionLocale,
    onFinalResult: (text) => {
      const current = form.getValues("description") ?? "";
      const next = current ? `${current.trim()} ${text}` : text;
      form.setValue("description", next, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-2">
            <img src={ipcr_logo} alt="IPCR Logo" className="h-16 w-16" />
            <div>
              <h1 className="text-xl font-bold text-blue-600">Institute For Peace And Conflict Resolution</h1>
              <p className="text-sm text-gray-500">Early Warning & Early Response System</p>
            </div>
          </div>
          <Link href="/">
            <Button variant="ghost" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              <span>Back to Home</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          {!isSubmitSuccess ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Report an Incident</h1>
                <p className="text-gray-600 max-w-xl mx-auto">
                  You can report quickly with just what happened and where. No account or personal details required—only add contact info if you want follow-up.
                </p>
                <p className="mt-3 text-sm">
                  <Link href="/report-by-voice" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    <Mic className="h-4 w-4" /> Or report by voice
                  </Link>
                </p>
              </div>

              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-sky-500 text-white">
                  <CardTitle>Incident Report Form</CardTitle>
                  <CardDescription className="text-white opacity-90">
                    Only the fields below are required. You can submit without giving your name or contact.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Incident Details
                        </h3>

                        <FormField
                          control={form.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Incident Title</FormLabel>
                              <FormControl>
                                <Input placeholder="E.g., Armed Conflict in Benue State" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between gap-3">
                                <FormLabel>Description</FormLabel>
                                <Button
                                  type="button"
                                  variant={speech.isListening ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => (speech.isListening ? speech.stop() : speech.start())}
                                  disabled={!speech.isSupported}
                                  className="flex items-center gap-2"
                                >
                                  {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                  {speech.isListening ? "Stop" : "Voice"}
                                </Button>
                              </div>
                              <FormControl>
                                <Textarea 
                                  placeholder="Provide details about what happened, who was involved, and the impact" 
                                  className="min-h-32"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Include details like time, number of people affected, and any immediate needs
                              </FormDescription>
                              {speech.isListening && speech.interimTranscript && (
                                <div className="text-sm text-muted-foreground">
                                  {speech.interimTranscript}
                                </div>
                              )}
                              {!speech.isSupported && (
                                <div className="text-sm text-muted-foreground">
                                  Voice dictation is not supported in this browser.
                                </div>
                              )}
                              {!!speech.error && (
                                <div className="text-sm text-destructive">
                                  Voice input error: {speech.error}
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Landmark, road, or general area" {...field} />
                              </FormControl>
                              <FormDescription>Where it happened (can include a map-picked point).</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="incidentOccurredAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Time and date of incident</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="region"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Region</FormLabel>
                                <Select 
                                  onValueChange={field.onChange} 
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select region" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {nigeriaRegions.map((region) => (
                                      <SelectItem key={region} value={region}>
                                        {region}
                                      </SelectItem>
                                    ))}
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
                                <FormLabel>State</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a state" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {(nigeriaRegionStates[selectedRegion] ?? []).map((state) => (
                                      <SelectItem key={state} value={state}>
                                        {state}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="lga"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LGA</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value ?? ""}
                                  disabled={!selectedState || loadingLgaOptions}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={selectedState ? "Select an LGA" : "Select a state first"} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {lgaOptions.map((lga) => (
                                      <SelectItem key={lga} value={lga}>
                                        {lga}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="town"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Town / community</FormLabel>
                                <FormControl>
                                  <Input placeholder="Town or community name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Type of Conflict/Incident</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="conflict">General Conflict</SelectItem>
                                  <SelectItem value="violence">Violence</SelectItem>
                                  <SelectItem value="sgbv">Sexual and Gender-Based Violence</SelectItem>
                                  <SelectItem value="protest">Protest</SelectItem>
                                  <SelectItem value="political">Political</SelectItem>
                                  <SelectItem value="economic">Economic</SelectItem>
                                  <SelectItem value="natural_disaster">Natural Disaster</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50/50 p-4 space-y-4">
                          <h3 className="text-sm font-medium flex items-center gap-2 text-sky-900">
                            <MapPin className="h-4 w-4" />
                            Optional: GPS (web only)
                          </h3>
                          <p className="text-xs text-sky-800/80">
                            If you know coordinates, enter them below. Opening this page from a map link may fill them automatically.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="latitude"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Latitude</FormLabel>
                                  <FormControl>
                                    <Input inputMode="decimal" placeholder="e.g. 9.0765" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="longitude"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Longitude</FormLabel>
                                  <FormControl>
                                    <Input inputMode="decimal" placeholder="e.g. 7.3986" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              if (!navigator.geolocation) {
                                toast({ title: "Not supported", description: "Your browser cannot read location.", variant: "destructive" });
                                return;
                              }
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  form.setValue("latitude", String(pos.coords.latitude), { shouldValidate: true });
                                  form.setValue("longitude", String(pos.coords.longitude), { shouldValidate: true });
                                  toast({ title: "Location captured", description: "Coordinates filled from your device." });
                                },
                                () =>
                                  toast({
                                    title: "Location denied",
                                    description: "Allow location or enter coordinates manually.",
                                    variant: "destructive",
                                  }),
                              );
                            }}
                          >
                            <Crosshair className="h-4 w-4" />
                            Use my current location
                          </Button>
                        </div>

                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-4 space-y-3">
                          <h3 className="text-sm font-medium flex items-center gap-2">
                            <ImagePlus className="h-4 w-4" />
                            Optional: photos or short video
                          </h3>
                          <p className="text-xs text-muted-foreground">Up to 5 files, images or video only.</p>
                          <Input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="cursor-pointer"
                            onChange={(e) => {
                              const list = e.target.files ? Array.from(e.target.files) : [];
                              setMediaFiles(list.slice(0, 5));
                            }}
                          />
                          {mediaFiles.length > 0 && (
                            <ul className="text-xs text-muted-foreground list-disc pl-4">
                              {mediaFiles.map((f) => (
                                <li key={f.name + f.size}>{f.name}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <h3 className="text-lg font-medium flex items-center gap-2 mb-1">
                            <User className="h-5 w-5 text-gray-400" />
                            Optional: Who was involved?
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Only if you know and want to specify—not required to submit.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="actorType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Actor type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value ?? "skip"}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Skip (optional)" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="skip">Skip (optional)</SelectItem>
                                      <SelectItem value="state">State (Government, Military, etc.)</SelectItem>
                                      <SelectItem value="non-state">Non-state (Group, Community, etc.)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="actorName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Actor name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Actor name (optional)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <h3 className="text-lg font-medium flex items-center gap-2 mb-1">
                            <FileText className="h-5 w-5 text-gray-400" />
                            Optional: Your contact (for follow-up only)
                          </h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Leave blank to report anonymously. We only use this if officials need to contact you.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="contactName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Your name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Your name (optional)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="contactPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Phone number (optional)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="mt-4">
                            <FormField
                              control={form.control}
                              name="contactEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="Email (optional)" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button 
                          type="submit" 
                          className="w-full md:w-auto"
                          disabled={reportIncidentMutation.isPending}
                        >
                          {reportIncidentMutation.isPending ? "Submitting..." : "Submit Report"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="shadow-lg text-center">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle>Thank You for Your Report</CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-6">
                <div className="mb-6 flex justify-center">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-green-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Report Submitted Successfully</h2>
                <p className="text-gray-600 max-w-md mx-auto mb-6">
                  Your incident report has been received. Officials will review the information and take appropriate action.
                  Thank you for contributing to peace and security in Nigeria.
                </p>
                <div className="border-t border-gray-100 pt-6 mt-6">
                  <p className="text-sm text-gray-500 mb-4">Report reference number: {Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}</p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/">
                  <Button variant="outline">Return to Home</Button>
                </Link>
                <Button onClick={() => setIsSubmitSuccess(false)}>Submit Another Report</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} Institute for Peace and Conflict Resolution. All rights reserved.</p>
          <p className="mt-2">Your reports help build a more peaceful Nigeria. Thank you for your contribution.</p>
        </div>
      </footer>
    </div>
  );
}