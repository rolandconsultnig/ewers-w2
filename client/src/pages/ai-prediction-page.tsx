import { useState } from "react";
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

export default function AiPredictionPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("conflict-forecast");
  const [selectedRegion, setSelectedRegion] = useState("north-east");
  const [predictionTimeline, setPredictionTimeline] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [showResults, setShowResults] = useState(false);
  const [forecastData, setForecastData] = useState<Record<string, unknown> | null>(null);
  
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
                Predict how current incidents might escalate and analyze potential conflict trajectories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <TrendingUp className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">Select an Incident</h3>
                <p className="text-gray-500 mb-4">Choose an existing incident to predict potential escalation pathways</p>
                <div className="w-full max-w-md">
                  <Input placeholder="Search for an incident..." className="mb-4" />
                  <Button>
                    Continue
                  </Button>
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
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <Bot className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium mb-2">Under Development</h3>
                <p className="text-gray-500 mb-4">
                  The peace indicators prediction model is currently being refined with additional data
                </p>
                <Button variant="outline">Coming Soon</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}