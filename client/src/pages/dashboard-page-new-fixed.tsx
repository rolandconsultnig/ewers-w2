import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NigeriaMap from "@/components/maps/NigeriaMap";
import { formatDate } from "@/lib/utils";
import { Alert, Incident, RiskIndicator } from "@shared/schema";
import { LocationSearch, LocationSearchResult } from "@/components/location/LocationSearch";
import { RegionSelector } from "@/components/location/RegionSelector";
import {
  Calendar,
  Clock,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Bell,
  Loader2,
  TrendingUp,
  AlertCircle,
  BarChart3,
} from "lucide-react";

// Nigeria's regions and states
const nigeriaRegions: Record<string, string[]> = {
  'North Central': [
    'Benue', 'Kogi', 'Kwara', 'Nasarawa', 'Niger', 'Plateau', 'FCT'
  ],
  'North East': [
    'Adamawa', 'Bauchi', 'Borno', 'Gombe', 'Taraba', 'Yobe'
  ],
  'North West': [
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara'
  ],
  'South East': [
    'Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'
  ],
  'South South': [
    'Akwa Ibom', 'Bayelsa', 'Cross River', 'Delta', 'Edo', 'Rivers'
  ],
  'South West': [
    'Ekiti', 'Lagos', 'Ogun', 'Ondo', 'Osun', 'Oyo'
  ]
};

// Dashboard Page Component
// Custom type for risk indicators with level property
interface EnhancedRiskIndicator extends RiskIndicator {
  level?: 'high' | 'medium' | 'low';
}

export default function DashboardPage() {
  const [mapHeight, setMapHeight] = useState("500px");
  const [showAddIncidentDialog, setShowAddIncidentDialog] = useState(false);
  const [clickedPosition, setClickedPosition] = useState<{lat: number, lng: number} | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationSearchResult | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  
  // Data fetching
  const { data: incidents, isLoading: isLoadingIncidents } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });
  
  const { data: alerts, isLoading: isLoadingAlerts } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });
  
  const { data: riskIndicators, isLoading: isLoadingRiskIndicators } = useQuery<EnhancedRiskIndicator[]>({
    queryKey: ["/api/risk-indicators"],
  });
  
  // Compute incident statistics
  const incidentCounts = {
    critical: incidents?.filter(i => i.severity === 'critical').length || 0,
    high: incidents?.filter(i => i.severity === 'high').length || 0,
    medium: incidents?.filter(i => i.severity === 'medium').length || 0,
    low: incidents?.filter(i => i.severity === 'low').length || 0,
    total: incidents?.length || 0,
  };
  
  // Handle adding a new incident
  const handleAddIncident = (lat: number, lng: number) => {
    setClickedPosition({ lat, lng });
    setShowAddIncidentDialog(true);
  };
  
  // Function to handle location selection from search
  const handleLocationSelect = (location: LocationSearchResult) => {
    setSelectedLocation(location);
    setClickedPosition(location.coords);
    
    // If the location has a state, find the corresponding region
    if (location.state) {
      // Find region for the selected state
      const regionEntry = Object.entries(nigeriaRegions).find(([_, states]) => 
        states.includes(location.state!)
      );
      
      if (regionEntry) {
        setSelectedRegion(regionEntry[0]);
      }
      
      setSelectedState(location.state);
    }
  };
  
  // Function to handle region selection
  const handleRegionSelect = (region: string) => {
    setSelectedRegion(region);
  };
  
  // Function to handle state selection
  const handleStateSelect = (state: string) => {
    setSelectedState(state);
  };
  
  // Reset form function
  const resetForm = () => {
    setShowAddIncidentDialog(false);
    setClickedPosition(null);
    setSelectedLocation(null);
    setSelectedRegion('');
    setSelectedState('');
  };
  
  // Function to create a new incident
  const createIncidentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create incident');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate the incidents query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      
      // Close the dialog and reset form
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating incident:', error);
      alert('Failed to save incident. Please try again.');
    }
  });
  
  const createIncident = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
    const severity = (form.querySelector('select[name="severity"]') as HTMLSelectElement)?.value || 'medium';
    
    // Determine the region and location coordinates
    let region = selectedRegion || 'North Central';
    let location = '';
    
    // Use clicked position from map if available, otherwise use from location search
    if (clickedPosition) {
      location = `${clickedPosition.lat},${clickedPosition.lng}`;
    } else if (selectedLocation) {
      location = `${selectedLocation.coords.lat},${selectedLocation.coords.lng}`;
    }
    
    // Create additional location metadata
    const locationMetadata = {
      coordinates: location,
      city: selectedLocation?.name || '',
      state: selectedState || '',
      region: region
    };
    
    // Create the incident data
    const incidentData = {
      title,
      description,
      severity,
      region,
      location,
      locationMetadata,
      status: 'active',
      reportedAt: new Date().toISOString(),
    };
    
    // Save the incident to the server
    createIncidentMutation.mutate(incidentData);
  };
  
  return (
    <MainLayout
      title="Dashboard"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
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
          
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-lg">Risk Indicators</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {isLoadingRiskIndicators ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !riskIndicators || riskIndicators.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No risk indicators found</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {riskIndicators.slice(0, 3).map((indicator) => (
                      <div key={indicator.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{indicator.name}</span>
                          <Badge 
                            variant={
                              indicator.level === 'high' ? 'destructive' : 
                              indicator.level === 'medium' ? 'secondary' : 
                              'secondary'
                            }
                          >
                            {indicator.level || 'N/A'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{indicator.description}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button variant="outline" size="sm" className="w-full">
                <BarChart3 className="h-4 w-4 mr-2" />
                View All Indicators
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Add Incident Dialog */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" style={{ position: 'fixed', zIndex: 9999 }}>
        <Dialog open={showAddIncidentDialog} onOpenChange={setShowAddIncidentDialog} modal={true}>
          <DialogContent className="pointer-events-auto" style={{ zIndex: 9999, position: 'relative' }}>
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
                  <Input id="title" name="title" placeholder="Enter a descriptive title" required />
                </div>
                
                <div className="grid gap-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Textarea 
                    id="description"
                    name="description" 
                    placeholder="Describe what happened..." 
                    className="min-h-[100px]"
                    required
                  />
                </div>
                
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Search for a location
                    </label>
                    <LocationSearch 
                      onSelectLocation={handleLocationSelect}
                      placeholder="Search for cities in Nigeria..."
                    />
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Region and State
                    </label>
                    <RegionSelector
                      defaultRegion={selectedRegion}
                      defaultState={selectedState} 
                      onSelectRegion={handleRegionSelect}
                      onSelectState={handleStateSelect}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid gap-2">
                      <label htmlFor="severity" className="text-sm font-medium">
                        Severity
                      </label>
                      <Select name="severity" defaultValue="medium">
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
                  </div>
                </div>
                
                {clickedPosition && (
                  <div className="bg-muted p-3 rounded-md text-xs">
                    <p className="font-medium mb-1">Selected Location:</p>
                    <p>Latitude: {clickedPosition.lat.toFixed(6)}</p>
                    <p>Longitude: {clickedPosition.lng.toFixed(6)}</p>
                    {selectedLocation && (
                      <>
                        <p className="font-medium mt-2 mb-1">Location Details:</p>
                        <p>City: {selectedLocation.name}</p>
                        {selectedLocation.state && <p>State: {selectedLocation.state}</p>}
                        {selectedRegion && <p>Region: {selectedRegion}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddIncidentDialog(false);
                    setClickedPosition(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createIncidentMutation.isPending}
                >
                  {createIncidentMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Submit Incident"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}