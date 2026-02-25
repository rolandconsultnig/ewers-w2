import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageTemplate from "@/components/modules/PageTemplate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  BarChart3, 
  Globe, 
  Clock, 
  AlertCircle, 
  Filter, 
  FileCheck,
  Loader2,
  ArrowRight
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Incident } from "@shared/schema";
import TrendChart from "@/components/dashboard/TrendChart";
import { useLocation } from "wouter";

// Using direct fetch instead of apiRequest to troubleshoot
const API_URL = window.location.origin;

export default function DataProcessingPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("nlp");
  const [inputText, setInputText] = useState("");
  const [showNlpInput, setShowNlpInput] = useState(false);
  const [nlpTask, setNlpTask] = useState<"sentiment" | "keywords" | "classify" | "summarize" | "entities" | null>(null);
  const [nlpResult, setNlpResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();
  const [temporalDays, setTemporalDays] = useState(90);
  const [anomalyTimeframe, setAnomalyTimeframe] = useState(90);
  const [patternTimeframe, setPatternTimeframe] = useState(90);
  const [anomalyResult, setAnomalyResult] = useState<any>(null);
  const [patternResult, setPatternResult] = useState<any>(null);
  const [qualityResult, setQualityResult] = useState<any>(null);
  const [isRunningAnomaly, setIsRunningAnomaly] = useState(false);
  const [isRunningPatterns, setIsRunningPatterns] = useState(false);
  const [isRunningQuality, setIsRunningQuality] = useState(false);
  
  const toolbar = (
    <Button 
      onClick={() => {
        setShowNlpInput(false);
        setNlpTask(null);
        setNlpResult(null);
        setInputText("");
      }}
      type="button"
    >
      <FileCheck className="h-4 w-4 mr-2" />
      Reset Analysis
    </Button>
  );
  
  // Handle button click to open NLP input form
  const handleOpenNlpInput = (task: "sentiment" | "keywords" | "classify" | "summarize" | "entities") => {
    console.log(`Opening ${task} input`);
    setShowNlpInput(true);
    setNlpTask(task);
    setNlpResult(null);
    setInputText("");
  };
  
  // Handle NLP analysis
  const handleNlpAnalysis = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Empty input",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      let endpoint = "";
      switch (nlpTask) {
        case "sentiment":
          endpoint = "/api/nlp/sentiment";
          break;
        case "keywords":
          endpoint = "/api/nlp/keywords";
          break;
        case "classify":
          endpoint = "/api/nlp/classify";
          break;
        case "summarize":
          endpoint = "/api/nlp/summarize";
          break;
        case "entities":
          endpoint = "/api/nlp/entities";
          break;
        default:
          throw new Error("Invalid NLP task");
      }
      
      console.log(`Sending request to ${endpoint} with text: ${inputText.substring(0, 30)}...`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('NLP result:', result);
      setNlpResult(result);
    } catch (error) {
      console.error("NLP analysis error:", error);
      toast({
        title: "Analysis failed",
        description: "Could not complete the analysis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const { data: trendData = [] } = useQuery<
    { date: string; incidents: number; resolved: number; alerts: number }[]
  >({
    queryKey: ["/api/enterprise/trends", temporalDays],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/enterprise/trends?days=${temporalDays}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load trends");
      return res.json();
    },
  });

  const temporalChartData = trendData.map((t) => ({
    name: t.date,
    incidents: t.incidents,
    displacement: t.alerts,
  }));

  const handleRunAnomalyDetection = async () => {
    setIsRunningAnomaly(true);
    setAnomalyResult(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/anomaly-detection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timeframeDays: anomalyTimeframe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to detect anomalies");
      setAnomalyResult(data);
      toast({
        title: "Anomaly Detection Complete",
        description: `${data.summary.totalAnomalies} anomalies detected in the last ${anomalyTimeframe} days.`,
      });
    } catch (error) {
      toast({
        title: "Anomaly Detection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunningAnomaly(false);
    }
  };

  const handleRunPatternDetection = async () => {
    setIsRunningPatterns(true);
    setPatternResult(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/detect-patterns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ timeframeDays: patternTimeframe }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to detect patterns");
      setPatternResult(data);
      toast({
        title: "Pattern Detection Complete",
        description: `${data.summary.totalPatterns} conflict patterns detected.`,
      });
    } catch (error) {
      toast({
        title: "Pattern Detection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunningPatterns(false);
    }
  };

  const handleRunQualityScan = async () => {
    setIsRunningQuality(true);
    setQualityResult(null);
    try {
      const res = await fetch(`${API_URL}/api/ai/data-quality-scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to run data quality scan");
      setQualityResult(data);
      toast({
        title: "Data Quality Scan Complete",
        description: `${data.summary.totalIssues} issues found across incidents.`,
      });
    } catch (error) {
      toast({
        title: "Data Quality Scan Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRunningQuality(false);
    }
  };
  
  return (
    <PageTemplate 
      title="Data Processing & Analysis"
      description="Process, analyze, and extract insights from collected data"
      toolbar={toolbar}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1">
          <TabsTrigger value="nlp" className="py-2">
            <Brain className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">NLP</span>
            <span className="md:hidden">NLP</span>
          </TabsTrigger>
          <TabsTrigger value="geospatial" className="py-2">
            <Globe className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Geospatial</span>
            <span className="md:hidden">Geo</span>
          </TabsTrigger>
          <TabsTrigger value="temporal" className="py-2">
            <Clock className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Temporal</span>
            <span className="md:hidden">Time</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="py-2">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Patterns</span>
            <span className="md:hidden">Pattern</span>
          </TabsTrigger>
          <TabsTrigger value="anomaly" className="py-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Anomaly</span>
            <span className="md:hidden">Anomaly</span>
          </TabsTrigger>
          <TabsTrigger value="validation" className="py-2">
            <Filter className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Validation</span>
            <span className="md:hidden">Valid</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="nlp" className="space-y-6">
          {!showNlpInput ? (
            <Card>
              <CardHeader>
                <CardTitle>Natural Language Processing</CardTitle>
                <CardDescription>
                  Extract meaning, sentiment, and key insights from textual data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Sentiment Analysis</CardTitle>
                      <CardDescription>Analyze emotional tone of content</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Sentiment analysis measures the positive, negative, or neutral tone in text data from news reports, social media, and community feedback related to conflict events.
                      </p>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setShowNlpInput(true);
                            setNlpTask("sentiment");
                            setNlpResult(null);
                          }}
                        >
                          Run Sentiment Analysis
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Keyword Extraction</CardTitle>
                      <CardDescription>Identify important terms and topics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Extract key terms, phrases, named entities, and topics from unstructured text to identify emerging conflict issues, involved parties, and potential crisis triggers.
                      </p>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setShowNlpInput(true);
                            setNlpTask("keywords");
                            setNlpResult(null);
                          }}
                        >
                          Extract Keywords
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Classification</CardTitle>
                      <CardDescription>Categorize text by content type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Automatically classify text into predefined categories such as conflict type, involved actors, and potential humanitarian impacts to organize information.
                      </p>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setShowNlpInput(true);
                            setNlpTask("classify");
                            setNlpResult(null);
                          }}
                        >
                          Classify Content
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Summarization</CardTitle>
                      <CardDescription>Generate concise overviews of text data</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Create condensed summaries of lengthy reports, articles, and social media discussions to facilitate rapid information processing during crisis situations.
                      </p>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setShowNlpInput(true);
                            setNlpTask("summarize");
                            setNlpResult(null);
                          }}
                        >
                          Generate Summaries
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Entity Recognition</CardTitle>
                      <CardDescription>Extract named entities from text</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Identify and extract named entities such as people, organizations, locations, and events from text to understand key actors and contexts in conflict situations.
                      </p>
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => {
                            setShowNlpInput(true);
                            setNlpTask("entities");
                            setNlpResult(null);
                          }}
                        >
                          Extract Entities
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {nlpTask === "sentiment" && "Sentiment Analysis"}
                    {nlpTask === "keywords" && "Keyword Extraction"}
                    {nlpTask === "classify" && "Text Classification"}
                    {nlpTask === "summarize" && "Text Summarization"}
                    {nlpTask === "entities" && "Named Entity Recognition"}
                  </CardTitle>
                  <CardDescription>
                    Enter your text below to analyze
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Enter text to analyze..."
                      className="min-h-[200px]"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNlpInput(false);
                          setNlpTask(null);
                          setInputText("");
                          setNlpResult(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleNlpAnalysis}
                        disabled={isProcessing || !inputText.trim()}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {nlpResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analysis Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {nlpTask === "sentiment" && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-md">
                          <div>
                            <p className="font-semibold">Sentiment:</p>
                            <p className="text-2xl font-bold capitalize">
                              {nlpResult.label}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Score:</p>
                            <p className="text-2xl font-bold">
                              {(nlpResult.score * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold">Confidence:</p>
                            <p className="text-2xl font-bold">
                              {(nlpResult.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Sentiment scores range from -100% (negative) to 100% (positive).
                          Scores near 0% indicate neutral sentiment.
                        </p>
                      </div>
                    )}

                    {nlpTask === "keywords" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {nlpResult.map((keyword: any, index: number) => (
                            <div 
                              key={index} 
                              className="p-3 bg-blue-50 rounded-md flex justify-between items-center"
                            >
                              <div>
                                <p className="font-semibold">{keyword.text}</p>
                                <p className="text-xs text-blue-600">Type: {keyword.type}</p>
                              </div>
                              <div className="text-sm">
                                <span className="inline-block bg-blue-100 px-2 py-1 rounded-full">
                                  {(keyword.relevance * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {nlpTask === "classify" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                          {nlpResult.map((category: any, index: number) => (
                            <div 
                              key={index} 
                              className="p-3 bg-blue-50 rounded-md flex justify-between items-center"
                            >
                              <p className="font-semibold capitalize">{category.category}</p>
                              <span className="inline-block bg-blue-100 px-2 py-1 rounded-full">
                                {(category.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {nlpTask === "summarize" && (
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-md">
                          <p className="font-semibold">Summary:</p>
                          <p className="mt-2">{nlpResult.summary}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          The summary is an extractive summary that preserves the most important sentences 
                          from the original text.
                        </p>
                      </div>
                    )}

                    {nlpTask === "entities" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                          {nlpResult.map((entity: any, index: number) => (
                            <div 
                              key={index} 
                              className="p-3 bg-blue-50 rounded-md flex justify-between items-center"
                            >
                              <div>
                                <p className="font-semibold">{entity.text}</p>
                                <p className="text-xs text-blue-600">Type: {entity.type}</p>
                              </div>
                              <span className="inline-block bg-blue-100 px-2 py-1 rounded-full">
                                {(entity.relevance * 100).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="geospatial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geospatial Analysis</CardTitle>
              <CardDescription>
                Analyze conflict data within geographical context
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Hotspot Mapping</CardTitle>
                    <CardDescription>Identify areas with high incident concentration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Visualize areas with high concentrations of conflict incidents to identify patterns and prioritize response efforts.
                    </p>
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: "Map Feature Activated",
                            description: "Conflict hotspot map for Nigeria is now available in the Visualization page.",
                          });
                          // Navigate to the visualization page
                          setLocation("/visualization");
                        }}
                      >
                        View Hotspot Map
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Proximity Analysis</CardTitle>
                    <CardDescription>Measure distance between incidents and resources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Calculate distances between conflict events and response resources to optimize deployment strategies and identify coverage gaps.
                    </p>
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: "Proximity Analysis",
                            description: "The proximity analysis tool is available in the Visualization page.",
                          });
                          // Navigate to the visualization page
                          setLocation("/visualization");
                        }}
                      >
                        Run Proximity Analysis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Spatial Clustering</CardTitle>
                    <CardDescription>Group incidents by geographic proximity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Group incidents based on spatial relationships to identify patterns and focus areas for intervention.
                    </p>
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: "Spatial Clustering",
                            description: "Spatial clustering analysis is available in the Visualization page.",
                          });
                          // Navigate to the visualization page
                          setLocation("/visualization");
                        }}
                      >
                        Generate Clusters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-blue-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Administrative Boundaries</CardTitle>
                    <CardDescription>Analyze incidents by political divisions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      View incidents by states, local government areas, and other administrative boundaries to coordinate with relevant authorities.
                    </p>
                    <div className="mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          toast({
                            title: "Administrative Analysis",
                            description: "Administrative boundary analysis is available in the Visualization page.",
                          });
                          // Navigate to the visualization page
                          setLocation("/visualization");
                        }}
                      >
                        View Boundary Analysis
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="temporal" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Temporal Analysis</CardTitle>
              <CardDescription>
                Track and analyze time-based patterns and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-wrap items-end gap-4 mb-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Analysis window</p>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={temporalDays}
                      onChange={(e) => setTemporalDays(parseInt(e.target.value, 10) || 90)}
                    >
                      <option value={30}>Last 30 days</option>
                      <option value={60}>Last 60 days</option>
                      <option value={90}>Last 90 days</option>
                      <option value={180}>Last 180 days</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Uses incident and alert data to build daily trends. Combine with the Enterprise dashboard for executive KPIs.
                  </p>
                </div>
                <TrendChart data={temporalChartData} title="Daily incidents and alerts over time" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conflict Pattern Recognition</CardTitle>
              <CardDescription>
                Identify repeating conflict patterns and behaviors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Analysis window</p>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={patternTimeframe}
                      onChange={(e) => setPatternTimeframe(parseInt(e.target.value, 10) || 90)}
                    >
                      <option value={30}>Last 30 days</option>
                      <option value={60}>Last 60 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleRunPatternDetection}
                    disabled={isRunningPatterns}
                  >
                    {isRunningPatterns ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Detecting patterns...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Run Pattern Detection
                      </>
                    )}
                  </Button>
                </div>
                {patternResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Total patterns</p>
                          <p className="text-2xl font-semibold mt-1">
                            {patternResult.summary.totalPatterns}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Critical patterns</p>
                          <p className="text-2xl font-semibold mt-1">
                            {patternResult.summary.criticalPatterns}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Emerging threats</p>
                          <p className="text-2xl font-semibold mt-1">
                            {patternResult.summary.emergingThreats}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Regions affected</p>
                          <p className="text-2xl font-semibold mt-1">
                            {patternResult.summary.affectedRegions.length}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-3">
                      {patternResult.patterns.map((p: any) => (
                        <Card key={p.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">{p.title}</CardTitle>
                            <CardDescription className="text-xs">
                              Type: {p.type} • Severity: {p.severity.toUpperCase()} • Confidence:{" "}
                              {Math.round(p.confidence)}%
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">{p.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Regions: {p.regions.join(", ")}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                      {patternResult.patterns.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No significant patterns were detected for this timeframe.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="anomaly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Anomaly Detection</CardTitle>
              <CardDescription>
                Identify unusual patterns or outliers that may indicate emerging crises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Analysis window</p>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={anomalyTimeframe}
                      onChange={(e) => setAnomalyTimeframe(parseInt(e.target.value, 10) || 90)}
                    >
                      <option value={30}>Last 30 days</option>
                      <option value={60}>Last 60 days</option>
                      <option value={90}>Last 90 days</option>
                    </select>
                  </div>
                  <Button
                    onClick={handleRunAnomalyDetection}
                    disabled={isRunningAnomaly}
                  >
                    {isRunningAnomaly ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Detecting anomalies...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Run Anomaly Detection
                      </>
                    )}
                  </Button>
                </div>
                {anomalyResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Total anomalies</p>
                          <p className="text-2xl font-semibold mt-1">
                            {anomalyResult.summary.totalAnomalies}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">High/critical</p>
                          <p className="text-2xl font-semibold mt-1">
                            {anomalyResult.summary.highSeverity}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-3">
                      {anomalyResult.anomalies.map((a: any) => (
                        <Card key={a.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              Spike on {new Date(a.date).toLocaleDateString()}{" "}
                              {a.region ? `(${a.region})` : ""}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Observed: {a.observed} • Expected: {a.expected} • Severity:{" "}
                              {a.severity.toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                      {anomalyResult.anomalies.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No significant anomalies were detected for this timeframe.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="validation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Cleaning & Validation</CardTitle>
              <CardDescription>
                Ensure data quality, accuracy, and reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Button onClick={handleRunQualityScan} disabled={isRunningQuality}>
                    {isRunningQuality ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running scan...
                      </>
                    ) : (
                      <>
                        <Filter className="mr-2 h-4 w-4" />
                        Run Data Quality Scan
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Scans incidents for missing required fields, invalid values (severity/status), and suspicious
                    dates (future reportedAt).
                  </p>
                </div>
                {qualityResult && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Total issues</p>
                          <p className="text-2xl font-semibold mt-1">
                            {qualityResult.summary.totalIssues}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">High/critical</p>
                          <p className="text-2xl font-semibold mt-1">
                            {qualityResult.summary.highSeverity}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(qualityResult.summary.byType).map(
                        ([type, count]: [string, any]) => (
                          <p key={type} className="text-xs text-muted-foreground">
                            {type}: {count}
                          </p>
                        )
                      )}
                    </div>
                    <div className="space-y-3 max-h-96 overflow-auto">
                      {qualityResult.issues.map((i: any) => (
                        <Card key={i.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              {i.entityType} #{i.entityId ?? "—"} — {i.issueType}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1">
                            <p className="text-sm text-muted-foreground">{i.message}</p>
                            {i.field && (
                              <p className="text-xs text-muted-foreground">
                                Field: <span className="font-mono">{i.field}</span>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Severity: {i.severity.toUpperCase()} • Status: {i.status}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                      {qualityResult.issues.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No data quality issues found in the scanned incidents.
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
    </PageTemplate>
  );
}