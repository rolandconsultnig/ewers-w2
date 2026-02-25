import { useState } from "react";
import { Link } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  Sparkles, 
  Brain, 
  Globe, 
  Bot,
  LineChart, 
  Clock, 
  Filter, 
  Download, 
  RefreshCw, 
  AlertTriangle,
  Search,
  Loader2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function AiAnalysisPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("risk-analysis");
  const [region, setRegion] = useState("North East");
  const [riskTimeframeDays, setRiskTimeframeDays] = useState("30");
  const [patternTimeframeDays, setPatternTimeframeDays] = useState("90");
  const [peaceTimeframeDays, setPeaceTimeframeDays] = useState("90");
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [patternResults, setPatternResults] = useState<any>(null);
  const [peaceOpportunities, setPeaceOpportunities] = useState<any>(null);
  const [responseRecommendations, setResponseRecommendations] = useState<any>(null);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
  const [isLoadingPeace, setIsLoadingPeace] = useState(false);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [incidentSearch, setIncidentSearch] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  
  // Fetch data for analysis
  const { 
    data: incidents, 
    isLoading: isLoadingIncidents,
  } = useQuery({
    queryKey: ["/api/incidents"],
  });
  
  const { 
    data: riskIndicators, 
    isLoading: isLoadingIndicators, 
  } = useQuery({
    queryKey: ["/api/risk-indicators"],
  });
  
  // Function to generate AI analysis
  const handleGenerateAnalysis = () => {
    setIsGeneratingAnalysis(true);

    const days = parseInt(riskTimeframeDays, 10);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const prevStartDate = new Date(now);
    prevStartDate.setDate(prevStartDate.getDate() - days * 2);
    const prevEndDate = new Date(now);
    prevEndDate.setDate(prevEndDate.getDate() - days);

    const incidentList: any[] = Array.isArray(incidents) ? incidents : [];
    const indicatorList: any[] = Array.isArray(riskIndicators) ? riskIndicators : [];

    const inRegion = (i: any) => (i.region || "").toLowerCase() === region.toLowerCase();
    const within = (i: any, from: Date, to: Date) => {
      const d = new Date(i.reportedAt);
      return d >= from && d <= to;
    };

    const currentIncidents = incidentList.filter((i) => inRegion(i) && within(i, startDate, now));
    const previousIncidents = incidentList.filter((i) => inRegion(i) && within(i, prevStartDate, prevEndDate));

    const severityWeight = (s: string) => {
      switch ((s || "").toLowerCase()) {
        case "critical":
          return 4;
        case "high":
          return 3;
        case "medium":
          return 2;
        default:
          return 1;
      }
    };

    const weightedScore = currentIncidents.reduce((sum, i) => sum + severityWeight(i.severity), 0);
    const avgScore = currentIncidents.length ? weightedScore / currentIncidents.length : 0;
    const trendDelta = currentIncidents.length - previousIncidents.length;
    const trend = trendDelta > 0 ? "increasing" : trendDelta < 0 ? "decreasing" : "stable";

    const riskLevel = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (avgScore / 4) * 55 +
            Math.min(30, currentIncidents.length * 3) +
            (trend === "increasing" ? 10 : trend === "decreasing" ? -5 : 0)
        )
      )
    );

    const severity = riskLevel >= 80 ? "high" : riskLevel >= 55 ? "medium" : "low";
    const indicatorsConsidered = indicatorList.length;
    const confidenceScore = Math.max(0.55, Math.min(0.95, 0.65 + (currentIncidents.length ? 0.25 : -0.05)));

    const topCategories = currentIncidents
      .reduce((acc: Record<string, number>, i) => {
        const c = (i.category || "Unknown").toString();
        acc[c] = (acc[c] || 0) + 1;
        return acc;
      }, {})
    ;

    const risingSectors = Object.entries(topCategories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    const keyFindings: string[] = [];
    if (currentIncidents.length === 0) {
      keyFindings.push("No incidents recorded in the selected timeframe for this region");
    } else {
      keyFindings.push(`Total incidents in timeframe: ${currentIncidents.length}`);
      keyFindings.push(`Critical/high severity incidents: ${currentIncidents.filter((i) => ["critical", "high"].includes((i.severity || "").toLowerCase())).length}`);
      keyFindings.push(`Trend vs previous period: ${trend}`);
      if (risingSectors.length) keyFindings.push(`Top incident categories: ${risingSectors.join(", ")}`);
    }

    const recommendations: string[] = [];
    if (severity === "high") {
      recommendations.push("Activate rapid response coordination for hotspots in this region");
      recommendations.push("Increase patrols and community engagement in affected LGAs");
      recommendations.push("Prioritize verification and intelligence gathering for high-severity reports");
    } else if (severity === "medium") {
      recommendations.push("Increase monitoring and early warning dissemination to stakeholders");
      recommendations.push("Engage local peace committees to reduce escalation risks");
      recommendations.push("Focus on resolving recurring triggers in top incident categories");
    } else {
      recommendations.push("Maintain routine monitoring and community feedback loops");
      recommendations.push("Support local mediation efforts and preventive outreach");
      recommendations.push("Continue data quality improvements and verification");
    }

    const result = {
      title: `Risk Analysis for ${region} Region of Nigeria`,
      timestamp: new Date().toISOString(),
      severity,
      riskLevel,
      description:
        currentIncidents.length === 0
          ? "No recent incidents were found for the selected timeframe. The risk level reflects limited activity, but continued monitoring is recommended."
          : "This risk score is computed from incident frequency, severity distribution, and trend compared to the previous period.",
      keyFindings,
      recommendations,
      risingSectors,
      improvingSectors: trend === "decreasing" ? ["Incident Frequency", "Severity"] : ["None detected"],
      historicalTrend: trend,
      incidentsAnalyzed: currentIncidents.length,
      indicatorsConsidered,
      confidenceScore,
    };

    setAnalysisResult(result);
    setIsGeneratingAnalysis(false);
    toast({
      title: "Analysis Complete",
      description: "Risk analysis generated from live database incidents.",
    });
  };

  // Pattern Detection handler
  const handlePatternDetection = async () => {
    setIsLoadingPatterns(true);
    try {
      const res = await apiRequest("POST", "/api/ai/detect-patterns", {
        timeframeDays: parseInt(patternTimeframeDays, 10),
      });
      const data = await res.json();
      setPatternResults(data);
      toast({
        title: "Pattern Detection Complete",
        description: `${data.summary.totalPatterns} conflict patterns detected.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to detect patterns. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  // Peace Opportunities handler
  const handlePeaceAnalysis = async () => {
    setIsLoadingPeace(true);
    try {
      const res = await apiRequest("POST", "/api/ai/peace-opportunities", {
        timeframeDays: parseInt(peaceTimeframeDays, 10),
      });
      const data = await res.json();
      setPeaceOpportunities(data);
      toast({
        title: "Peace Analysis Complete",
        description: `${data.summary.totalOpportunities} peace opportunities identified.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze peace opportunities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPeace(false);
    }
  };

  // Response Advisor handler
  const handleResponseAdvisor = async () => {
    setIsLoadingResponse(true);
    try {
      const res = await apiRequest("POST", "/api/ai/response-recommendations", {
        incidentId: selectedIncidentId ?? undefined,
        region,
      });
      const data = await res.json();
      setResponseRecommendations(data);
      toast({
        title: "Response Analysis Complete",
        description: `${data.summary.totalRecommendations} recommendations generated.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingResponse(false);
    }
  };
  
  // Helper function to render a risk badge
  const getRiskBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-amber-100 text-amber-800">Medium Risk</Badge>;
      case "low":
        return <Badge className="bg-blue-100 text-blue-800">Low Risk</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <MainLayout title="AI Analysis">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">AI-Powered Analysis</h1>
        <p className="text-gray-500 mt-1">
          Leverage artificial intelligence to analyze conflict data and generate insights
        </p>
      </div>
      
      <Tabs 
        defaultValue="risk-analysis" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-7 w-full max-w-4xl">
          <TabsTrigger value="risk-analysis">Risk Analysis</TabsTrigger>
          <TabsTrigger value="pattern-detection">Pattern Detection</TabsTrigger>
          <TabsTrigger value="peace-indicators">Peace Indicators</TabsTrigger>
          <TabsTrigger value="response-advisor">Response Advisor</TabsTrigger>
          <TabsTrigger value="incident-analysis">Incident Analysis</TabsTrigger>
          <TabsTrigger value="conflict-nlp">Conflict NLP</TabsTrigger>
          <TabsTrigger value="nlp-utils">NLP Utilities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="risk-analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
                  AI Risk Analysis
                </CardTitle>
                <CardDescription>
                  Generate comprehensive risk analysis for specific regions based on incident data and risk indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Region</label>
                      <Select 
                        value={region} 
                        onValueChange={setRegion}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a region" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="North East">North East Nigeria</SelectItem>
                          <SelectItem value="North West">North West Nigeria</SelectItem>
                          <SelectItem value="North Central">North Central Nigeria</SelectItem>
                          <SelectItem value="South West">South West Nigeria</SelectItem>
                          <SelectItem value="South East">South East Nigeria</SelectItem>
                          <SelectItem value="South South">South South Nigeria</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Timeframe</label>
                      <Select value={riskTimeframeDays} onValueChange={setRiskTimeframeDays}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Last 7 days</SelectItem>
                          <SelectItem value="30">Last 30 days</SelectItem>
                          <SelectItem value="90">Last 90 days</SelectItem>
                          <SelectItem value="180">Last 6 months</SelectItem>
                          <SelectItem value="365">Last 1 year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-500">
                      {isLoadingIncidents || isLoadingIndicators ? 
                        <span className="flex items-center">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Loading data...
                        </span> : 
                          `${Array.isArray(incidents) ? incidents.length : 0} incidents and ${Array.isArray(riskIndicators) ? riskIndicators.length : 0} indicators available for analysis`
                        }
                      </span>
                    </div>
                    
                    <Button onClick={handleGenerateAnalysis} disabled={isGeneratingAnalysis}>
                      {isGeneratingAnalysis ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Analysis
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {analysisResult && (
                    <div className="mt-6 space-y-4 border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-semibold">{analysisResult.title}</h3>
                        <div className="flex items-center gap-2">
                          {getRiskBadge(analysisResult.severity)}
                          <Badge variant="outline" className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(analysisResult.timestamp).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-gray-700">{analysisResult.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Key Findings</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResult.keyFindings.map((finding: string, index: number) => (
                              <li key={index} className="text-gray-700">{finding}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Recommendations</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysisResult.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-gray-700">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Risk Level</p>
                          <p className="text-2xl font-bold text-blue-700">{analysisResult.riskLevel}%</p>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Confidence</p>
                          <p className="text-2xl font-bold text-blue-700">{(analysisResult.confidenceScore * 100).toFixed(0)}%</p>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Incidents</p>
                          <p className="text-2xl font-bold text-blue-700">{analysisResult.incidentsAnalyzed}</p>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-xs text-gray-500">Indicators</p>
                          <p className="text-2xl font-bold text-blue-700">{analysisResult.indicatorsConsidered}</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export PDF
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
                    <Brain className="h-5 w-5 mr-2 text-blue-500" />
                    AI Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-md">
                      <h3 className="font-medium text-sm mb-1 flex items-center">
                        <LineChart className="h-4 w-4 mr-1 text-blue-600" />
                        Trend Analysis
                      </h3>
                      <p className="text-xs text-gray-600">Analyze historical data to identify conflict patterns and trends</p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-md">
                      <h3 className="font-medium text-sm mb-1 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-1 text-blue-600" />
                        Risk Scoring
                      </h3>
                      <p className="text-xs text-gray-600">Quantify risk levels based on multiple factors and indicators</p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-md">
                      <h3 className="font-medium text-sm mb-1 flex items-center">
                        <Globe className="h-4 w-4 mr-1 text-blue-600" />
                        Spatial Analysis
                      </h3>
                      <p className="text-xs text-gray-600">Identify geographic hotspots and conflict clusters</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Analyses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="border rounded-md p-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">North East Analysis</p>
                        <Badge className="bg-amber-100 text-amber-800 text-xs">Medium</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Generated 2 days ago</p>
                    </div>
                    
                    <div className="border rounded-md p-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">South East Analysis</p>
                        <Badge className="bg-red-100 text-red-800 text-xs">High</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Generated 5 days ago</p>
                    </div>
                    
                    <div className="border rounded-md p-2">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm">North Central Analysis</p>
                        <Badge className="bg-blue-100 text-blue-800 text-xs">Low</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Generated 1 week ago</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="w-full">
                    View All Analyses
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="incident-analysis">
          <Card>
            <CardHeader>
              <CardTitle>Incident Analysis</CardTitle>
              <CardDescription>Analyze specific incidents to understand causality and potential escalation factors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    value={incidentSearch}
                    onChange={(e) => setIncidentSearch(e.target.value)}
                    placeholder="Search incidents by title, location, region, or ID..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">Incidents</div>
                    <div className="space-y-2 max-h-[360px] overflow-auto">
                      {(Array.isArray(incidents) ? incidents : [])
                        .filter((i: any) => {
                          const q = incidentSearch.trim().toLowerCase();
                          if (!q) return true;
                          const hay = `${i.id} ${i.title || ""} ${i.location || ""} ${i.region || ""}`.toLowerCase();
                          return hay.includes(q);
                        })
                        .slice(0, 25)
                        .map((i: any) => (
                          <button
                            key={i.id}
                            type="button"
                            onClick={() => {
                              setSelectedIncidentId(i.id);
                              setRegion(i.region || region);
                              setResponseRecommendations(null);
                            }}
                            className={`w-full text-left border rounded-md p-2 hover:bg-gray-50 ${
                              selectedIncidentId === i.id ? "bg-blue-50 border-blue-200" : ""
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <div className="text-sm font-medium">{i.title || `Incident #${i.id}`}</div>
                                <div className="text-xs text-gray-500">{i.location || "Unknown location"} • {i.region || "Unknown region"}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline">#{i.id}</Badge>
                                {getRiskBadge(i.severity || "low")}
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Showing up to 25 results
                    </div>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium mb-2">Selected Incident</div>
                    {selectedIncidentId ? (
                      (() => {
                        const selected = (Array.isArray(incidents) ? incidents : []).find((i: any) => i.id === selectedIncidentId);
                        if (!selected) {
                          return <div className="text-sm text-gray-500">Incident not found.</div>;
                        }
                        return (
                          <div className="space-y-3">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-base font-semibold">{selected.title || `Incident #${selected.id}`}</div>
                                <Badge variant="outline">#{selected.id}</Badge>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">{selected.location || "Unknown location"} • {selected.region || "Unknown region"}</div>
                              <div className="text-xs text-gray-500 mt-1">Reported: {new Date(selected.reportedAt).toLocaleString()}</div>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                              {getRiskBadge(selected.severity || "low")}
                              <Badge variant="outline">{selected.status || "pending"}</Badge>
                              <Badge variant="outline">{selected.category || "unknown"}</Badge>
                            </div>

                            <div className="text-sm text-gray-700">
                              {selected.description || "No description available."}
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={handleResponseAdvisor} disabled={isLoadingResponse}>
                                {isLoadingResponse ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Bot className="h-4 w-4 mr-2" />
                                    Generate Response Plan
                                  </>
                                )}
                              </Button>
                              <Button variant="outline" onClick={() => setSelectedIncidentId(null)}>
                                Clear
                              </Button>
                            </div>

                            {responseRecommendations && (
                              <div className="border rounded-md p-3 bg-blue-50">
                                <div className="flex justify-between items-center mb-2">
                                  <div className="text-sm font-semibold">Recommended Actions</div>
                                  <Badge variant="outline">{responseRecommendations.summary.totalRecommendations}</Badge>
                                </div>
                                <div className="space-y-2">
                                  {responseRecommendations.recommendations.slice(0, 4).map((rec: any) => (
                                    <div key={rec.id} className="border rounded-md p-2 bg-white">
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="text-sm font-medium">{rec.title}</div>
                                        <Badge className={rec.priority === 'critical' ? 'bg-red-100 text-red-800' : rec.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                                          {rec.priority}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">{rec.description}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-sm text-gray-500">
                        Select an incident to view details and generate recommendations.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pattern-detection">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2 text-purple-500" />
                Pattern Detection
              </CardTitle>
              <CardDescription>Use AI to detect emerging conflict patterns across regions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Analysis Timeframe</label>
                    <Select value={patternTimeframeDays} onValueChange={setPatternTimeframeDays}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="60">Last 60 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="180">Last 6 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={() => handlePatternDetection()}>
                    <Brain className="h-4 w-4 mr-2" />
                    {isLoadingPatterns ? "Detecting..." : "Detect Patterns"}
                  </Button>
                </div>

                {patternResults && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Pattern Analysis Results</h3>
                      <Badge variant="outline">
                        {patternResults.summary.totalPatterns} patterns detected
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-purple-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Total Patterns</p>
                        <p className="text-2xl font-bold text-purple-700">{patternResults.summary.totalPatterns}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Critical</p>
                        <p className="text-2xl font-bold text-red-700">{patternResults.summary.criticalPatterns}</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Emerging Threats</p>
                        <p className="text-2xl font-bold text-amber-700">{patternResults.summary.emergingThreats}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Regions</p>
                        <p className="text-2xl font-bold text-blue-700">{patternResults.summary.affectedRegions.length}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {patternResults.patterns.slice(0, 3).map((pattern: any, index: number) => (
                        <div key={pattern.id} className="border rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{pattern.title}</h4>
                            <div className="flex gap-2">
                              {getRiskBadge(pattern.severity)}
                              <Badge variant="outline">{pattern.confidence}% confidence</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>Regions: {pattern.regions.join(', ')}</span>
                            <span>•</span>
                            <span>{pattern.relatedIncidents.length} incidents</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="peace-indicators">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Globe className="h-5 w-5 mr-2 text-green-500" />
                    Peace Opportunity Indicators
                  </CardTitle>
                  <CardDescription>Predict windows of opportunity for peace initiatives and conflict resolution</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/peace-indicators">Open full Peace Indicators page →</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Analysis Period</label>
                    <Select value={peaceTimeframeDays} onValueChange={setPeaceTimeframeDays}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="60">Last 60 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="180">Last 6 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={handlePeaceAnalysis} disabled={isLoadingPeace}>
                    {isLoadingPeace ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Analyze Peace Opportunities
                      </>
                    )}
                  </Button>
                </div>

                {peaceOpportunities && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Peace Opportunity Analysis</h3>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {peaceOpportunities.summary.totalOpportunities} opportunities found
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Total Opportunities</p>
                        <p className="text-2xl font-bold text-green-700">{peaceOpportunities.summary.totalOpportunities}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">High Priority</p>
                        <p className="text-2xl font-bold text-blue-700">{peaceOpportunities.summary.highPriorityOpportunities}</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Optimal Windows</p>
                        <p className="text-2xl font-bold text-amber-700">{peaceOpportunities.summary.optimalWindows}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Regions</p>
                        <p className="text-2xl font-bold text-purple-700">{peaceOpportunities.summary.affectedRegions.length}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {peaceOpportunities.opportunities.slice(0, 3).map((opportunity: any, index: number) => (
                        <div key={opportunity.id} className="border rounded-md p-3 bg-green-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-green-800">{opportunity.title}</h4>
                            <div className="flex gap-2">
                              <Badge className={`${opportunity.priority === 'high' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                {opportunity.priority} priority
                              </Badge>
                              <Badge variant="outline">{opportunity.confidence}% confidence</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>Region: {opportunity.region}</span>
                            <span>•</span>
                            <span>Success Rate: {opportunity.successProbability}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response-advisor">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2 text-blue-500" />
                Response Advisor
              </CardTitle>
              <CardDescription>AI-powered recommendations for conflict response and intervention strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Focus Region</label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="North East">North East Nigeria</SelectItem>
                        <SelectItem value="North West">North West Nigeria</SelectItem>
                        <SelectItem value="North Central">North Central Nigeria</SelectItem>
                        <SelectItem value="South West">South West Nigeria</SelectItem>
                        <SelectItem value="South East">South East Nigeria</SelectItem>
                        <SelectItem value="South South">South South Nigeria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={handleResponseAdvisor} disabled={isLoadingResponse}>
                    {isLoadingResponse ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Generate Recommendations
                      </>
                    )}
                  </Button>
                </div>

                {responseRecommendations && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">AI Response Recommendations</h3>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        {responseRecommendations.summary.totalRecommendations} recommendations
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-red-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Critical Actions</p>
                        <p className="text-2xl font-bold text-red-700">{responseRecommendations.summary.criticalActions}</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Immediate Actions</p>
                        <p className="text-2xl font-bold text-amber-700">{responseRecommendations.summary.immediateActions}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-xs text-gray-500">Total Recommendations</p>
                        <p className="text-2xl font-bold text-blue-700">{responseRecommendations.summary.totalRecommendations}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {responseRecommendations.recommendations.slice(0, 4).map((rec: any, index: number) => (
                        <div key={rec.id} className="border rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{rec.title}</h4>
                            <div className="flex gap-2">
                              <Badge className={`${rec.priority === 'critical' ? 'bg-red-100 text-red-800' : rec.priority === 'high' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {rec.priority}
                              </Badge>
                              <Badge variant="outline">{rec.category}</Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                          <div className="flex gap-2 text-xs text-gray-500 mb-2">
                            <span>Timeline: {rec.timeline}</span>
                            <span>•</span>
                            <span>Success Rate: {rec.successProbability}%</span>
                          </div>
                          <div className="text-xs">
                            <span className="font-medium">Actions: </span>
                            <span className="text-gray-600">{rec.actions.slice(0, 2).join(', ')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflict-nlp">
          <ConflictNlpTab toast={toast} />
        </TabsContent>
        <TabsContent value="nlp-utils">
          <NlpUtilsTab toast={toast} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}

function ConflictNlpTab({ toast }: { toast: (t: any) => void }) {
  const [text, setText] = useState("");
  const [statement, setStatement] = useState("");
  const [text1, setText1] = useState("");
  const [text2, setText2] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const run = async (endpoint: string, body: any) => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", endpoint, body);
      const data = await res.json();
      setResult(data);
      toast({ title: "Analysis complete" });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conflict NLP Tools</CardTitle>
        <CardDescription>Analyze text for conflict indicators, screen statements, extract events, and compare similarity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium">Analyze Conflict</label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text to analyze for conflict indicators..." className="mt-1 min-h-[80px]" />
          <Button className="mt-2" onClick={() => run("/api/ai/analyze-conflict", { text })} disabled={!text.trim() || loading}>Analyze</Button>
        </div>
        <div>
          <label className="text-sm font-medium">Screen Statement</label>
          <Textarea value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="Statement to screen for conflict content..." className="mt-1 min-h-[80px]" />
          <Button className="mt-2" onClick={() => run("/api/ai/screen-statement", { statement })} disabled={!statement.trim() || loading}>Screen</Button>
        </div>
        <div>
          <label className="text-sm font-medium">Calculate Similarity (duplicate detection)</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Input value={text1} onChange={(e) => setText1(e.target.value)} placeholder="Text 1" />
            <Input value={text2} onChange={(e) => setText2(e.target.value)} placeholder="Text 2" />
          </div>
          <Button className="mt-2" onClick={() => run("/api/ai/calculate-similarity", { text1, text2 })} disabled={!text1.trim() || !text2.trim() || loading}>Compare</Button>
        </div>
        <div>
          <Button variant="outline" onClick={() => run("/api/ai/scrape-web", {})} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Start Web Scrape
          </Button>
        </div>
        {result && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <pre className="text-sm overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NlpUtilsTab({ toast }: { toast: (t: any) => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tool, setTool] = useState<"sentiment"|"keywords"|"classify"|"summarize"|"entities">("sentiment");
  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const endpoint = `/api/nlp/${tool}`;
      const body = tool === "summarize" ? { text, maxLength: 200 } : tool === "keywords" ? { text, maxResults: 10 } : tool === "classify" ? { text, maxResults: 3 } : { text };
      const res = await apiRequest("POST", endpoint, body);
      const data = await res.json();
      setResult(data);
      toast({ title: "Analysis complete" });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>NLP Utilities</CardTitle>
        <CardDescription>Sentiment, keywords, classification, summarization, and entity extraction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Tool</label>
          <Select value={tool} onValueChange={(v: any) => setTool(v)}>
            <SelectTrigger className="w-48 mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sentiment">Sentiment</SelectItem>
              <SelectItem value="keywords">Keywords</SelectItem>
              <SelectItem value="classify">Classify</SelectItem>
              <SelectItem value="summarize">Summarize</SelectItem>
              <SelectItem value="entities">Entities</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Text</label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to analyze..." className="mt-1 min-h-[100px]" />
        </div>
        <Button onClick={run} disabled={!text.trim() || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Run {tool}
        </Button>
        {result && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <pre className="text-sm overflow-auto max-h-64">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}