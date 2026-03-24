import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  CalendarDays, 
  ChevronDown, 
  FileDown, 
  Loader2, 
  MapPin, 
  Share2, 
  Bot,
  TrendingUp, 
  Calendar as CalendarIcon,
  FileBarChart,
  PanelLeftOpen,
  Flag
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Incident } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import jsPDF from "jspdf";

export default function AiPredictionPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("conflict-forecast");
  const [selectedRegion, setSelectedRegion] = useState("north-east");
  const [predictionTimeline, setPredictionTimeline] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [showResults, setShowResults] = useState(false);
  const [forecastData, setForecastData] = useState<Record<string, unknown> | null>(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState([75]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>("");
  const [escalationResult, setEscalationResult] = useState<{
    incidentId: number;
    region: string | null;
    currentSeverity: string;
    escalationRisk: "low" | "medium" | "high";
    probability: number;
    timeWindowDays: number;
    keyDrivers: string[];
    recommendedActions: string[];
  } | null>(null);
  const [isEscalationLoading, setIsEscalationLoading] = useState(false);
  const [piRegion, setPiRegion] = useState<string>("Nigeria");
  const [piDays, setPiDays] = useState<number>(90);
  const [isPiLoading, setIsPiLoading] = useState(false);
  const [piResult, setPiResult] = useState<{
    summary: { totalOpportunities: number; highPriorityOpportunities: number; optimalWindows: number; affectedRegions: string[] };
    opportunities: Array<{
      id: string;
      title: string;
      description: string;
      region: string;
      confidence: number;
      priority: string;
      timeWindow: { start: string | Date; end: string | Date; optimal: string | Date };
      successProbability: number;
    }>;
  } | null>(null);

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });

  const sortedIncidents = useMemo(
    () =>
      incidents
        .slice()
        .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime())
        .slice(0, 50),
    [incidents]
  );

  const regionOptions = [
    { value: "north-east", label: "North East Nigeria" },
    { value: "north-west", label: "North West Nigeria" },
    { value: "north-central", label: "North Central Nigeria" },
    { value: "south-west", label: "South West Nigeria" },
    { value: "south-east", label: "South East Nigeria" },
    { value: "south-south", label: "South South Nigeria" },
  ];

  const peaceRegionOptions = [
    { value: "Nigeria", label: "Nigeria (National)" },
    { value: "North Central", label: "North Central" },
    { value: "North East", label: "North East" },
    { value: "North West", label: "North West" },
    { value: "South East", label: "South East" },
    { value: "South South", label: "South South" },
    { value: "South West", label: "South West" },
  ];

  const handleGenerateForecast = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai/predict", {
        region: selectedRegion,
        timeline: predictionTimeline,
        startDate: startDate ? startDate.toISOString() : undefined,
      });
      const data = (await res.json()) as Record<string, unknown>;
      setShowResults(true);
      setForecastData(data);
      toast({
        title: "Forecast generated",
        description: "Conflict event forecast is ready. Review predicted events and contributing factors below.",
      });
    } catch (e) {
      toast({
        title: "Forecast failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forecastPayload = forecastData?.forecast as Record<string, unknown> | undefined;
  const forecastSummary = (forecastPayload?.summary as Record<string, unknown>) || {};
  const rawPredictedEvents = useMemo(() => {
    const list = forecastPayload?.predictedEvents;
    return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
  }, [forecastPayload]);
  const predictedEvents = useMemo(() => {
    const minP = confidenceThreshold[0] ?? 0;
    return rawPredictedEvents.filter((e) => {
      const p = typeof e.probability === "number" ? e.probability : 100;
      return p >= minP;
    });
  }, [rawPredictedEvents, confidenceThreshold]);
  const contributingFactors = useMemo(() => {
    const list = forecastPayload?.contributingFactors;
    return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
  }, [forecastPayload]);

  const regionLabel = regionOptions.find((r) => r.value === selectedRegion)?.label ?? selectedRegion;

  const riskBadgeClass = (level: string) => {
    const x = (level || "").toLowerCase();
    if (x === "critical" || x === "high") return "bg-red-100 text-red-800";
    if (x === "medium") return "bg-amber-100 text-amber-800";
    return "bg-blue-100 text-blue-800";
  };

  const handleExportForecastPdf = () => {
    if (!forecastData || !forecastPayload) {
      toast({ title: "Nothing to export", description: "Generate a forecast first.", variant: "destructive" });
      return;
    }
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toISOString().slice(0, 10);
      let y = 18;
      doc.setFontSize(15);
      doc.text("EWERS — Conflict Event Forecast", 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Region: ${regionLabel}`, 14, y);
      y += 5;
      doc.text(`Timeline: ${predictionTimeline} days · Generated: ${String(forecastData.generatedAt || dateStr)}`, 14, y);
      y += 8;
      const risk = String(forecastSummary.riskLevel ?? "—");
      const conf = typeof forecastSummary.confidence === "number" ? `${forecastSummary.confidence}%` : "—";
      doc.text(`Risk level: ${risk} · Model confidence: ${conf}`, 14, y);
      y += 10;
      if (forecastSummary.rationale) {
        const lines = doc.splitTextToSize(String(forecastSummary.rationale), 180);
        doc.text(lines, 14, y);
        y += lines.length * 5 + 6;
      }
      doc.setFontSize(12);
      doc.text("Predicted events", 14, y);
      y += 8;
      doc.setFontSize(10);
      for (const ev of predictedEvents.length ? predictedEvents : rawPredictedEvents) {
        const block = [
          String(ev.type ?? "Event"),
          `Severity: ${String(ev.severity ?? "—")} · Window: ${String(ev.windowDays ?? "—")} days · P: ${String(ev.probability ?? "—")}%`,
          String(ev.locationHint ? `Location: ${ev.locationHint}` : ""),
          String(ev.rationale ?? ""),
        ].filter(Boolean);
        for (const line of block) {
          const parts = doc.splitTextToSize(line, 180);
          doc.text(parts, 14, y);
          y += parts.length * 5;
          if (y > 270) {
            doc.addPage();
            y = 16;
          }
        }
        y += 4;
      }
      y += 4;
      doc.setFontSize(12);
      doc.text("Contributing factors", 14, y);
      y += 8;
      doc.setFontSize(10);
      for (const f of contributingFactors) {
        const line = `${String(f.factor ?? "Factor")} — ${String(f.weight ?? "—")}%${f.rationale ? ` · ${f.rationale}` : ""}`;
        const parts = doc.splitTextToSize(line, 180);
        doc.text(parts, 14, y);
        y += parts.length * 5;
        if (y > 270) {
          doc.addPage();
          y = 16;
        }
      }
      doc.save(`conflict-forecast-${selectedRegion}-${dateStr}.pdf`);
      toast({ title: "PDF exported", description: "Forecast report downloaded." });
    } catch (e) {
      toast({
        title: "Export failed",
        description: e instanceof Error ? e.message : "Could not create PDF",
        variant: "destructive",
      });
    }
  };

  const handleShareForecast = async () => {
    if (!forecastData || !forecastPayload) {
      toast({ title: "Nothing to share", description: "Generate a forecast first.", variant: "destructive" });
      return;
    }
    const lines = [
      `Conflict forecast — ${regionLabel}`,
      `Timeline: ${predictionTimeline} days`,
      `Risk: ${String(forecastSummary.riskLevel ?? "—")} · Confidence: ${typeof forecastSummary.confidence === "number" ? forecastSummary.confidence + "%" : "—"}`,
      forecastSummary.rationale ? `Summary: ${forecastSummary.rationale}` : "",
      ...rawPredictedEvents.map(
        (e) =>
          `• ${String(e.type ?? "Event")} (${String(e.severity ?? "?")}, ${String(e.probability ?? "?")}%) — ${String(e.locationHint ?? "")}`,
      ),
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: `Forecast: ${regionLabel}`, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard", description: "Forecast summary copied. Paste into email or chat." });
        return;
      }
      toast({ title: "Shared", description: "Forecast summary shared." });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard", description: "Share was cancelled; summary copied instead." });
      } catch {
        toast({ title: "Share failed", variant: "destructive" });
      }
    }
  };

  const handleCreateForecastAlert = async () => {
    if (!forecastData || !forecastPayload) {
      toast({ title: "Nothing to alert", description: "Generate a forecast first.", variant: "destructive" });
      return;
    }
    const risk = String(forecastSummary.riskLevel || "medium").toLowerCase();
    const severity =
      risk === "critical" ? "critical" : risk === "high" ? "high" : risk === "low" ? "low" : "medium";
    const descParts = [
      `Automated conflict event forecast (${predictionTimeline} days) for ${regionLabel}.`,
      typeof forecastSummary.confidence === "number" ? `Model confidence: ${forecastSummary.confidence}%.` : "",
      forecastSummary.rationale ? `Rationale: ${forecastSummary.rationale}` : "",
      predictedEvents.length
        ? `Highlighted risks: ${predictedEvents.map((e) => e.type).join("; ")}.`
        : "",
      `Generated at ${String(forecastData.generatedAt || new Date().toISOString())}.`,
    ].filter(Boolean);
    try {
      await apiRequest("POST", "/api/alerts", {
        title: `Predictive forecast: ${regionLabel} (${predictionTimeline}d)`,
        description: descParts.join("\n\n"),
        severity,
        status: "active",
        source: "automated",
        category: "security",
        region: regionLabel,
        location: regionLabel,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: "Alert created",
        description: "Forecast summary was posted as an active alert.",
      });
      setLocation("/alerts");
    } catch (e) {
      toast({
        title: "Could not create alert",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRunEscalationPrediction = async () => {
    if (!selectedIncidentId) {
      toast({ title: "Select an incident", description: "Please choose an incident first.", variant: "destructive" });
      return;
    }
    setIsEscalationLoading(true);
    setEscalationResult(null);
    try {
      const incidentId = parseInt(selectedIncidentId, 10);
      const res = await fetch("/api/ai/escalation-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ incidentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to run escalation prediction");
      setEscalationResult(data.prediction);
    } catch (e) {
      toast({
        title: "Escalation prediction failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsEscalationLoading(false);
    }
  };

  const handleRunPeaceIndicators = async () => {
    setIsPiLoading(true);
    setPiResult(null);
    try {
      const res = await fetch("/api/ai/peace-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timeframeDays: piDays, region: piRegion === "Nigeria" ? undefined : piRegion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to run peace indicators analysis");
      setPiResult({
        summary: data.summary,
        opportunities: (data.opportunities || []).slice(0, 10),
      });
    } catch (e) {
      toast({
        title: "Peace indicators failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsPiLoading(false);
    }
  };
  
  return (
    <MainLayout title="AI Predictive Models">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Predictive Models</h1>
        <p className="text-gray-500 mt-1">
          Use AI to forecast conflict events, escalation probabilities, and peace opportunities
        </p>
      </div>
      
      <Tabs
        defaultValue="conflict-forecast"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 w-[500px]">
          <TabsTrigger value="conflict-forecast">Conflict Forecast</TabsTrigger>
          <TabsTrigger value="escalation-prediction">Escalation Prediction</TabsTrigger>
          <TabsTrigger value="peace-indicators">Peace Indicators</TabsTrigger>
        </TabsList>
        
        <TabsContent value="conflict-forecast" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="h-5 w-5 mr-2 text-blue-500" />
                  Conflict Event Forecasting
                </CardTitle>
                <CardDescription>
                  Predict potential conflict events and incidents in specific regions using historic data and AI modeling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Region</label>
                      <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {regionOptions.map((region) => (
                            <SelectItem key={region.value} value={region.value}>
                              {region.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prediction Timeline</label>
                      <Select value={predictionTimeline} onValueChange={setPredictionTimeline}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Next 7 days</SelectItem>
                          <SelectItem value="30">Next 30 days</SelectItem>
                          <SelectItem value="90">Next 90 days</SelectItem>
                          <SelectItem value="180">Next 6 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Starting Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : "Select a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Confidence Threshold (%)</label>
                      <span className="text-sm text-blue-600 font-medium">{confidenceThreshold[0]}%</span>
                    </div>
                    <Slider
                      value={confidenceThreshold}
                      onValueChange={setConfidenceThreshold}
                      max={100}
                      min={0}
                      step={5}
                      className="py-4"
                    />
                    <p className="text-xs text-gray-500">Hide predicted events below this probability</p>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      className="w-full" 
                      onClick={handleGenerateForecast}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Forecast...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Generate Conflict Forecast
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {showResults && forecastData && (
                    <div className="mt-6 space-y-4 border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <h3 className="text-xl font-semibold">
                          {regionLabel} — {predictionTimeline} day forecast
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={riskBadgeClass(String(forecastSummary.riskLevel ?? "medium"))}>
                            {(String(forecastSummary.riskLevel ?? "medium")).replace(/^\w/, (c) => c.toUpperCase())} risk
                          </Badge>
                          <Badge variant="outline">
                            {typeof forecastSummary.confidence === "number"
                              ? `${Math.round(forecastSummary.confidence)}% confidence`
                              : "Confidence n/a"}
                          </Badge>
                          {forecastPayload?.generatedBy && (
                            <Badge variant="secondary" className="capitalize">
                              {String(forecastPayload.generatedBy)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {forecastSummary.rationale && (
                        <p className="text-sm text-muted-foreground border-l-2 border-blue-300 pl-3">
                          {String(forecastSummary.rationale)}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Predicted events</h4>
                          <div className="space-y-3">
                            {predictedEvents.length === 0 && rawPredictedEvents.length > 0 && (
                              <p className="text-sm text-amber-700">
                                No events meet the {confidenceThreshold[0]}% threshold. Lower the threshold or review raw
                                output in the exported report.
                              </p>
                            )}
                            {predictedEvents.map((ev, idx) => (
                              <div key={idx} className="border rounded-md p-3">
                                <div className="flex justify-between gap-2 flex-wrap">
                                  <p className="font-medium">{String(ev.type ?? "Event")}</p>
                                  <Badge className={riskBadgeClass(String(ev.severity ?? "medium"))}>
                                    {String(ev.severity ?? "—")}
                                  </Badge>
                                </div>
                                {ev.rationale && (
                                  <p className="text-sm text-gray-600 mt-1">{String(ev.rationale)}</p>
                                )}
                                <div className="flex flex-wrap items-center mt-2 text-xs text-gray-500 gap-x-3 gap-y-1">
                                  {ev.locationHint && (
                                    <span className="flex items-center">
                                      <MapPin className="h-3 w-3 mr-1 shrink-0" />
                                      {String(ev.locationHint)}
                                    </span>
                                  )}
                                  {ev.windowDays != null && (
                                    <span className="flex items-center">
                                      <CalendarDays className="h-3 w-3 mr-1 shrink-0" />
                                      Within {String(ev.windowDays)} days
                                    </span>
                                  )}
                                  {typeof ev.probability === "number" && (
                                    <span className="font-medium text-gray-700">{ev.probability}% probability</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {rawPredictedEvents.length === 0 && (
                              <p className="text-sm text-gray-500">No predicted events returned for this run.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Contributing factors</h4>
                          <div className="space-y-3">
                            {contributingFactors.map((f, idx) => {
                              const w = typeof f.weight === "number" ? f.weight : 0;
                              const bar =
                                w >= 75 ? "bg-red-500" : w >= 50 ? "bg-amber-500" : "bg-blue-500";
                              return (
                                <div key={idx} className="flex items-center justify-between gap-2">
                                  <div className="flex items-center min-w-0">
                                    <div className={`w-2 h-8 ${bar} rounded-sm mr-3 shrink-0`} />
                                    <div className="min-w-0">
                                      <p className="font-medium truncate">{String(f.factor ?? "Factor")}</p>
                                      {f.rationale && (
                                        <p className="text-xs text-gray-500 line-clamp-2">{String(f.rationale)}</p>
                                      )}
                                      {f.category && !f.rationale && (
                                        <p className="text-xs text-gray-500">{String(f.category)}</p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-medium shrink-0">{Math.round(w)}%</span>
                                </div>
                              );
                            })}
                            {contributingFactors.length === 0 && (
                              <p className="text-sm text-gray-500">No contributing factors in this response.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm" type="button" onClick={handleExportForecastPdf}>
                          <FileDown className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                        <Button variant="outline" size="sm" type="button" onClick={handleShareForecast}>
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                        <Button size="sm" type="button" onClick={handleCreateForecastAlert}>
                          Create Alert
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <FileBarChart className="h-5 w-5 mr-2 text-blue-500" />
                    Model Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-md p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium">Overall Accuracy</h3>
                        <span className="text-lg font-bold text-blue-700">76%</span>
                      </div>
                      <p className="text-xs text-gray-600">Based on validation against historical conflict data</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Location accuracy</span>
                        <span className="font-medium">82%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Time accuracy</span>
                        <span className="font-medium">71%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Event type accuracy</span>
                        <span className="font-medium">68%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Severity accuracy</span>
                        <span className="font-medium">74%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <PanelLeftOpen className="h-5 w-5 mr-2 text-blue-500" />
                    Data Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <BarChart className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm">Historical incidents</span>
                      </div>
                      <Badge className="text-xs">4,287</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Flag className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm">Risk indicators</span>
                      </div>
                      <Badge className="text-xs">1,542</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm">Geospatial data</span>
                      </div>
                      <Badge className="text-xs">36 regions</Badge>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <Share2 className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm">Social media data</span>
                      </div>
                      <Badge className="text-xs">2.3M posts</Badge>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="w-full">
                    View All Sources
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="escalation-prediction">
          <Card>
            <CardHeader>
              <CardTitle>Escalation Prediction</CardTitle>
              <CardDescription>
                Predict escalation risk for a specific incident based on severity and regional risk indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-sm font-medium mb-1">Select incident</h3>
                  <Select
                    value={selectedIncidentId}
                    onValueChange={setSelectedIncidentId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an incident" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {sortedIncidents.map((inc) => (
                        <SelectItem key={inc.id} value={String(inc.id)}>
                          {inc.title.length > 40 ? `${inc.title.slice(0, 40)}…` : inc.title}{" "}
                          {inc.region ? `(${inc.region})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Showing the most recent incidents. Use the Incident Review or Dashboard to manage incidents.
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleRunEscalationPrediction}
                    disabled={isEscalationLoading || !sortedIncidents.length}
                  >
                    {isEscalationLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running prediction...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Predict Escalation
                      </>
                    )}
                  </Button>
                </div>

                <div className="md:col-span-2">
                  {escalationResult ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">Escalation Risk Assessment</h3>
                          <p className="text-sm text-gray-500">
                            Incident ID {escalationResult.incidentId}
                            {escalationResult.region ? ` • ${escalationResult.region}` : ""} • Current severity:{" "}
                            <span className="font-semibold capitalize">{escalationResult.currentSeverity}</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            className={
                              escalationResult.escalationRisk === "high"
                                ? "bg-red-100 text-red-800"
                                : escalationResult.escalationRisk === "medium"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {escalationResult.escalationRisk.toUpperCase()} RISK
                          </Badge>
                          <Badge variant="outline">
                            {escalationResult.probability}% probability • {escalationResult.timeWindowDays} day window
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Key Drivers</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {escalationResult.keyDrivers.map((d, idx) => (
                              <p key={idx} className="text-sm text-gray-700">
                                • {d}
                              </p>
                            ))}
                            {escalationResult.keyDrivers.length === 0 && (
                              <p className="text-sm text-gray-500">No specific drivers identified.</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Recommended Actions</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {escalationResult.recommendedActions.map((a, idx) => (
                              <p key={idx} className="text-sm text-gray-700">
                                • {a}
                              </p>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center text-gray-500 text-sm">
                      Select an incident and run the model to see escalation predictions.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="peace-indicators">
          <Card>
            <CardHeader>
              <CardTitle>Peace Opportunity Indicators</CardTitle>
              <CardDescription>
                Predict windows of opportunity for peace initiatives and conflict resolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region</label>
                    <Select value={piRegion} onValueChange={setPiRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {peaceRegionOptions.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Analysis window (days)</label>
                    <Select value={String(piDays)} onValueChange={(v) => setPiDays(parseInt(v, 10) || 90)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      onClick={handleRunPeaceIndicators}
                      disabled={isPiLoading}
                    >
                      {isPiLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Bot className="mr-2 h-4 w-4" />
                          Run Peace Indicators
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {piResult && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-gray-500">Total opportunities</p>
                          <p className="text-2xl font-semibold mt-1">{piResult.summary.totalOpportunities}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-gray-500">High/critical priority</p>
                          <p className="text-2xl font-semibold mt-1">
                            {piResult.summary.highPriorityOpportunities}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-gray-500">Optimal windows (≤ 30 days)</p>
                          <p className="text-2xl font-semibold mt-1">{piResult.summary.optimalWindows}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-gray-500">Regions covered</p>
                          <p className="text-2xl font-semibold mt-1">
                            {piResult.summary.affectedRegions.length}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-3">
                      {piResult.opportunities.map((opp) => (
                        <Card key={opp.id}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start gap-3">
                              <div>
                                <CardTitle className="text-base">{opp.title}</CardTitle>
                                <p className="text-xs text-gray-500 mt-1">
                                  {opp.region} • success probability {Math.round(opp.successProbability)}%
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  className={
                                    opp.priority === "critical"
                                      ? "bg-red-100 text-red-800"
                                      : opp.priority === "high"
                                      ? "bg-amber-100 text-amber-800"
                                      : opp.priority === "medium"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                  }
                                >
                                  {opp.priority.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">
                                  {Math.round(opp.confidence)}% confidence
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-gray-700">{opp.description}</p>
                            <p className="text-xs text-gray-500">
                              Window:{" "}
                              {new Date(opp.timeWindow.start).toLocaleDateString()} –{" "}
                              {new Date(opp.timeWindow.end).toLocaleDateString()} • Optimal:{" "}
                              {new Date(opp.timeWindow.optimal).toLocaleDateString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                      {piResult.opportunities.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No peace opportunities were identified for this window and region.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}