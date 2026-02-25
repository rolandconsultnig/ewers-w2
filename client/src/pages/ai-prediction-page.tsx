import { useMemo, useState } from "react";
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

export default function AiPredictionPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("conflict-forecast");
  const [selectedRegion, setSelectedRegion] = useState("north-east");
  const [predictionTimeline, setPredictionTimeline] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [showResults, setShowResults] = useState(false);
  const [forecastData, setForecastData] = useState<Record<string, unknown> | null>(null);
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
  
  const handleGenerateForecast = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ region: selectedRegion, timeline: predictionTimeline }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setShowResults(true);
      setForecastData(data);
      toast({ title: "Forecast Generated", description: "AI predictive model has generated a conflict forecast successfully." });
    } catch (e) {
      toast({ title: "Forecast Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
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
                      <span className="text-sm text-blue-600 font-medium">75%</span>
                    </div>
                    <Slider
                      defaultValue={[75]}
                      max={100}
                      step={5}
                      className="py-4"
                    />
                    <p className="text-xs text-gray-500">Adjust the minimum confidence level for predicted events</p>
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
                  
                  {showResults && (
                    <div className="mt-6 space-y-4 border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold">
                          {regionOptions.find(r => r.value === selectedRegion)?.label} - {predictionTimeline} Day Forecast
                        </h3>
                        <div className="flex gap-2">
                          <Badge className="bg-amber-100 text-amber-800">Medium Risk</Badge>
                          <Badge variant="outline">76% Confidence</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Predicted Events</h4>
                          <div className="space-y-3">
                            <div className="border rounded-md p-3">
                              <div className="flex justify-between">
                                <p className="font-medium">Community Tensions</p>
                                <Badge className="bg-red-100 text-red-800">High</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">Increased likelihood of community tensions over resource competition in Borno region.</p>
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>Borno State</span>
                                <CalendarDays className="h-3 w-3 ml-3 mr-1" />
                                <span>Within 14 days</span>
                              </div>
                            </div>
                            
                            <div className="border rounded-md p-3">
                              <div className="flex justify-between">
                                <p className="font-medium">Infrastructure Attacks</p>
                                <Badge className="bg-amber-100 text-amber-800">Medium</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">Potential for coordinated attacks on critical infrastructure in rural areas.</p>
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>Yobe State</span>
                                <CalendarDays className="h-3 w-3 ml-3 mr-1" />
                                <span>Within 21 days</span>
                              </div>
                            </div>
                            
                            <div className="border rounded-md p-3">
                              <div className="flex justify-between">
                                <p className="font-medium">Armed Group Movement</p>
                                <Badge className="bg-blue-100 text-blue-800">Low</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">Possible movement of non-state armed groups across state borders.</p>
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>Adamawa State</span>
                                <CalendarDays className="h-3 w-3 ml-3 mr-1" />
                                <span>Within 30 days</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Contributing Factors</h4>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-2 h-8 bg-red-500 rounded-sm mr-3"></div>
                                <div>
                                  <p className="font-medium">Resource Scarcity</p>
                                  <p className="text-xs text-gray-500">Limited access to water and arable land</p>
                                </div>
                              </div>
                              <span className="font-medium">85%</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-2 h-8 bg-amber-500 rounded-sm mr-3"></div>
                                <div>
                                  <p className="font-medium">Political Tensions</p>
                                  <p className="text-xs text-gray-500">Upcoming local elections</p>
                                </div>
                              </div>
                              <span className="font-medium">72%</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-2 h-8 bg-amber-500 rounded-sm mr-3"></div>
                                <div>
                                  <p className="font-medium">Civilian Displacement</p>
                                  <p className="text-xs text-gray-500">Internal migration due to insecurity</p>
                                </div>
                              </div>
                              <span className="font-medium">68%</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-2 h-8 bg-blue-500 rounded-sm mr-3"></div>
                                <div>
                                  <p className="font-medium">Economic Factors</p>
                                  <p className="text-xs text-gray-500">Livelihood challenges in communities</p>
                                </div>
                              </div>
                              <span className="font-medium">56%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <FileDown className="h-4 w-4 mr-2" />
                          Export Report
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                        <Button size="sm">
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