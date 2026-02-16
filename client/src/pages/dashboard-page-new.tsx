import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { Alert, Incident, RiskIndicator } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import NigeriaMap from "@/components/maps/NigeriaMap";
import {
  AlertTriangle,
  FileText,
  MapPin,
  Activity,
  Calendar,
  Users,
  Building,
  AlertCircle,
  Bell,
  Clock,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Zap,
  LineChart,
  BarChart,
  PieChart,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function DashboardPage() {
  const { toast } = useToast();
  const [mapHeight, setMapHeight] = useState("500px");
  const [showAddIncidentDialog, setShowAddIncidentDialog] = useState(false);
  const [clickedPosition, setClickedPosition] = useState<{lat: number, lng: number} | null>(null);
  
  // Fetch data from API
  const { 
    data: incidents, 
    isLoading: isLoadingIncidents 
  } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });
  
  const { 
    data: alerts, 
    isLoading: isLoadingAlerts 
  } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });
  
  const { 
    data: indicators, 
    isLoading: isLoadingIndicators 
  } = useQuery<RiskIndicator[]>({
    queryKey: ["/api/risk-indicators"],
  });

  // Format date for display
  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Handle new incident on map
  const handleAddIncident = (lat: number, lng: number) => {
    setClickedPosition({ lat, lng });
    setShowAddIncidentDialog(true);
  };
  
  // Create new incident
  const createIncident = (e: React.FormEvent) => {
    e.preventDefault();
    
    // This would be replaced with an actual API call
    toast({
      title: "Incident Reported",
      description: "The new incident has been recorded at " + 
        clickedPosition?.lat.toFixed(4) + ", " + clickedPosition?.lng.toFixed(4),
    });
    
    setShowAddIncidentDialog(false);
    setClickedPosition(null);
  };
  
  // Get severity counts for incidents
  const getIncidentSeverityCounts = () => {
    if (!incidents) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    
    const counts = {
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
      medium: incidents.filter(i => i.severity === 'medium').length,
      low: incidents.filter(i => i.severity === 'low').length,
      total: incidents.length
    };
    
    return counts;
  };
  
  // Get active alerts count
  const getActiveAlertsCount = () => {
    return alerts?.filter(a => a.status === 'active').length || 0;
  };
  
  const incidentCounts = getIncidentSeverityCounts();
  const activeAlertsCount = getActiveAlertsCount();

  return (
    <MainLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Top cards */}
        <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Incidents</p>
                  <p className="text-3xl font-bold">{incidents?.filter(i => i.status === 'active').length || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {incidentCounts.high} high severity
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Active Alerts</p>
                  <p className="text-3xl font-bold">{activeAlertsCount}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {alerts?.filter(a => a.severity === 'high' && a.status === 'active').length || 0} high priority
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <Bell className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Risk Indicators</p>
                  <p className="text-3xl font-bold">{indicators?.length || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {indicators?.filter(i => i.threshold > 80).length || 0} high impact
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Response Plans</p>
                  <p className="text-3xl font-bold">
                    {incidents?.filter(i => i.status === 'active').length || 0}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Active response plans
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Map section - 8 columns on large screens */}
        <div className="col-span-1 md:col-span-8 space-y-6">
          <Card>
            <CardHeader className="p-6 pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Nigeria Crisis Map</CardTitle>
                  <CardDescription>
                    Interactive map of incidents across Nigeria
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    onClick={() => setShowAddIncidentDialog(true)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Incident
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setMapHeight(mapHeight === "500px" ? "700px" : "500px")}
                  >
                    {mapHeight === "500px" ? "Expand" : "Collapse"} Map
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="border rounded-md overflow-hidden">
                <NigeriaMap 
                  height={mapHeight} 
                  showIncidents={true}
                  showAddIncidentButton={true}
                  onAddIncident={handleAddIncident}
                  incidents={incidents}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Incidents List */}
          <Card>
            <CardHeader className="p-6 pb-2">
              <CardTitle>Recent Incidents</CardTitle>
              <CardDescription>
                Latest reported incidents and their status
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {isLoadingIncidents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <p>Loading incidents...</p>
                </div>
              ) : !incidents || incidents.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p>No incidents found</p>
                </div>
              ) : (
                <ScrollArea className="h-[350px]">
                  <div className="space-y-4">
                    {incidents.slice(0, 5).map((incident) => (
                      <Card key={incident.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{incident.title}</h4>
                              <Badge
                                className={
                                  incident.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  incident.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                                  'bg-blue-100 text-blue-800'
                                }
                              >
                                {incident.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>{incident.region || 'Nigeria'}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>{formatDate(incident.reportedAt)}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>Status: {incident.status}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="ml-2">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="px-6 py-4 border-t">
              <Button variant="outline" className="w-full">View All Incidents</Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Right sidebar - 4 columns on large screens */}
        <div className="col-span-1 md:col-span-4 space-y-6">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Incident Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-6">
                {/* Severity Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Severity Distribution</h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                          <span className="text-sm">Critical</span>
                        </div>
                        <span className="text-sm font-medium">
                          {incidentCounts.critical}
                        </span>
                      </div>
                      <Progress 
                        value={incidentCounts.total > 0 ? 
                          (incidentCounts.critical / incidentCounts.total) * 100 : 0} 
                        className="h-2 bg-red-100"
                        indicatorClassName="bg-red-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                          <span className="text-sm">High</span>
                        </div>
                        <span className="text-sm font-medium">
                          {incidentCounts.high}
                        </span>
                      </div>
                      <Progress 
                        value={incidentCounts.total > 0 ? 
                          (incidentCounts.high / incidentCounts.total) * 100 : 0} 
                        className="h-2 bg-blue-100"
                        indicatorClassName="bg-blue-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                          <span className="text-sm">Medium</span>
                        </div>
                        <span className="text-sm font-medium">
                          {incidentCounts.medium}
                        </span>
                      </div>
                      <Progress 
                        value={incidentCounts.total > 0 ? 
                          (incidentCounts.medium / incidentCounts.total) * 100 : 0} 
                        className="h-2 bg-gray-100"
                        indicatorClassName="bg-gray-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span className="text-sm">Low</span>
                        </div>
                        <span className="text-sm font-medium">
                          {incidentCounts.low}
                        </span>
                      </div>
                      <Progress 
                        value={incidentCounts.total > 0 ? 
                          (incidentCounts.low / incidentCounts.total) * 100 : 0}
                        className="h-2 bg-green-100"
                        indicatorClassName="bg-green-500"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Regional Distribution */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Regional Distribution</h4>
                  <div className="space-y-2">
                    {['North Central', 'North East', 'North West', 'South East', 'South South', 'South West'].map((region) => (
                      <div key={region} className="flex items-center justify-between text-sm">
                        <span>{region}</span>
                        <span className="font-medium">
                          {incidents?.filter(i => i.region === region).length || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Incident Trends */}
                <div>
                  <h4 className="text-sm font-medium mb-2">7-Day Trend</h4>
                  <div className="pt-4 flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {Math.floor(Math.random() * 10) + 5}%
                      </p>
                      <div className="flex items-center justify-center text-xs mt-1">
                        <TrendingUp className="h-3 w-3 mr-1 text-amber-500" />
                        <span className="text-muted-foreground">Increase</span>
                      </div>
                    </div>
                    
                    <div className="h-16 flex items-end space-x-1">
                      {[35, 45, 30, 50, 40, 60, 70].map((height, i) => (
                        <div 
                          key={i}
                          className="w-5 bg-primary/80 rounded-t"
                          style={{ height: `${height}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Latest Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {isLoadingAlerts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !alerts || alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No alerts found</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {alerts.filter(a => a.status === 'active').slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-start border-l-2 border-primary pl-3 py-1">
                        <div>
                          <p className="text-sm font-medium">{alert.title}</p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{formatDate(alert.generatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button variant="outline" size="sm" className="w-full">
                <Bell className="h-4 w-4 mr-2" />
                View All Alerts
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Add Incident Dialog */}
      <div className="dialog-container" style={{ position: 'relative', zIndex: 9999 }}>
        <Dialog open={showAddIncidentDialog} onOpenChange={setShowAddIncidentDialog} modal={true}>
          <DialogContent className="dialog-content" style={{ position: 'fixed', zIndex: 9999 }}>
            <DialogHeader>
              <DialogTitle>Report New Incident</DialogTitle>
              <DialogDescription>
                {clickedPosition ? 
                  `Add details about the incident at coordinates: ${clickedPosition.lat.toFixed(4)}, ${clickedPosition.lng.toFixed(4)}` :
                  "Add details about the new incident"
                }
              </DialogDescription>
            </DialogHeader>
          
          <form onSubmit={createIncident}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Incident Title
                </label>
                <Input id="title" placeholder="Enter a descriptive title" required />
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description
                </label>
                <Textarea 
                  id="description" 
                  placeholder="Describe what happened..." 
                  className="min-h-[100px]"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="severity" className="text-sm font-medium">
                    Severity
                  </label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="region" className="text-sm font-medium">
                    Region
                  </label>
                  <Select defaultValue="North Central">
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="North Central">North Central</SelectItem>
                      <SelectItem value="North East">North East</SelectItem>
                      <SelectItem value="North West">North West</SelectItem>
                      <SelectItem value="South East">South East</SelectItem>
                      <SelectItem value="South South">South South</SelectItem>
                      <SelectItem value="South West">South West</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddIncidentDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Incident</Button>
            </DialogFooter>
          </form>
        </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}