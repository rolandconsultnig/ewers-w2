import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap, LayersControl, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageTemplate from "@/components/modules/PageTemplate";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Expand, Filter, Layers, MapPin, AlertTriangle, Tractor, Home, Activity, AlertCircle, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { severityHex } from "@/lib/severity-colors";

// Sample incident data
const incidents = [
  {
    id: 1,
    title: "Farmer-Herder Clash",
    location: "Benue State",
    description: "Violent clash between farmers and herders",
    severity: "High",
    type: "Violent",
    coordinates: [7.3369, 8.7404], // Benue State
    date: "2023-02-15",
  },
  {
    id: 2,
    title: "Armed Banditry",
    location: "Zamfara State",
    description: "Armed bandit attack on village",
    severity: "Critical",
    type: "Violent",
    coordinates: [6.2264, 12.1222], // Zamfara State
    date: "2023-02-10",
  },
  {
    id: 3,
    title: "Kidnapping Incident",
    location: "Kaduna State",
    description: "Mass kidnapping at school",
    severity: "Critical",
    type: "Kidnapping",
    coordinates: [7.7107, 10.5222], // Kaduna State
    date: "2023-01-28",
  },
  {
    id: 4,
    title: "Sectarian Violence",
    location: "Plateau State",
    description: "Religious conflict between communities",
    severity: "High",
    type: "Violent",
    coordinates: [8.8583, 9.9326], // Plateau State
    date: "2023-01-15",
  },
  {
    id: 5,
    title: "Protest Turned Violent",
    location: "Lagos State",
    description: "Peaceful protest escalated to violence",
    severity: "Medium",
    type: "Civil Unrest",
    coordinates: [3.3792, 6.5244], // Lagos State
    date: "2023-01-10",
  },
  {
    id: 6,
    title: "Insurgent Attack",
    location: "Borno State",
    description: "Terrorist attack on military outpost",
    severity: "Critical",
    type: "Terrorism",
    coordinates: [13.1520, 11.8333], // Borno State
    date: "2023-02-05",
  },
];

// Sample risk level data for states
const riskLevels = [
  { state: "Borno", level: "Critical", coordinates: [13.1520, 11.8333], radius: 100000 },
  { state: "Zamfara", level: "Critical", coordinates: [6.2264, 12.1222], radius: 80000 },
  { state: "Kaduna", level: "High", coordinates: [7.7107, 10.5222], radius: 70000 },
  { state: "Benue", level: "High", coordinates: [7.3369, 8.7404], radius: 60000 },
  { state: "Plateau", level: "High", coordinates: [8.8583, 9.9326], radius: 50000 },
  { state: "Niger", level: "Medium", coordinates: [6.5513, 9.0820], radius: 40000 },
  { state: "Katsina", level: "High", coordinates: [7.6223, 12.9857], radius: 60000 },
  { state: "Sokoto", level: "Medium", coordinates: [5.2322, 13.0059], radius: 40000 },
  { state: "Adamawa", level: "Medium", coordinates: [12.4980, 9.3265], radius: 40000 },
  { state: "Yobe", level: "High", coordinates: [11.7339, 12.2939], radius: 60000 },
  { state: "Lagos", level: "Low", coordinates: [3.3792, 6.5244], radius: 20000 },
  { state: "Rivers", level: "Medium", coordinates: [6.8198, 4.8156], radius: 30000 },
];

// Response resources data
const resources = [
  { type: "Medical Team", location: "Abuja", coordinates: [7.4951, 9.0579], radius: 15000 },
  { type: "Relief Supplies", location: "Lagos", coordinates: [3.3792, 6.5244], radius: 10000 },
  { type: "Security Forces", location: "Maiduguri", coordinates: [13.1520, 11.8333], radius: 20000 },
  { type: "Refugee Camp", location: "Yola", coordinates: [12.4980, 9.3265], radius: 8000 },
  { type: "NGO Operation", location: "Jos", coordinates: [8.8583, 9.9326], radius: 12000 },
];

// Custom marker icons
const getSeverityMarker = (severity: string) => {
  const size = severity === "Critical" ? 30 : severity === "High" ? 26 : severity === "Medium" ? 22 : 18;
  const color = severityHex(severity);
  
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.2);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -(size/2)]
  });
};

// Risk level circle color
const getRiskColor = (level: string) => {
  const hex = severityHex(level);
  switch (level) {
    case "Critical": return { color: hex, fillColor: hex, fillOpacity: 0.3 };
    case "High": return { color: hex, fillColor: hex, fillOpacity: 0.25 };
    case "Medium": return { color: hex, fillColor: hex, fillOpacity: 0.2 };
    case "Low": return { color: hex, fillColor: hex, fillOpacity: 0.15 };
    default: return { color: hex, fillColor: hex, fillOpacity: 0.12 };
  }
};

// Resource circle style
const getResourceStyle = (type: string) => {
  switch (type) {
    case "Medical Team": return { color: "#06b6d4", fillColor: "#06b6d4", fillOpacity: 0.2 };
    case "Relief Supplies": return { color: "#8b5cf6", fillColor: "#8b5cf6", fillOpacity: 0.2 };
    case "Security Forces": return { color: "#64748b", fillColor: "#64748b", fillOpacity: 0.2 };
    case "Refugee Camp": return { color: "#ec4899", fillColor: "#ec4899", fillOpacity: 0.2 };
    case "NGO Operation": return { color: "#14b8a6", fillColor: "#14b8a6", fillOpacity: 0.2 };
    default: return { color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.2 };
  }
};

// Nigeria center and zoom level - focused specifically on Nigeria
const nigeriaCenter: [number, number] = [9.0820, 8.6753];
const defaultZoom = 6.5; // Increased zoom to focus more on Nigeria
const nigeriaMinZoom = 5; // Minimum zoom level to keep focus on Nigeria
const nigeriaMaxZoom = 12; // Maximum zoom level for detailed view

// Fullscreen control component
function FullscreenControl({ mapRef }: { mapRef: React.RefObject<HTMLDivElement> }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (mapRef.current?.requestFullscreen) {
        mapRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="absolute top-3 right-3 z-[1000] bg-white"
      onClick={toggleFullscreen}
    >
      <Expand className="h-4 w-4 mr-1" />
      {isFullscreen ? "Exit" : "Full Screen"}
    </Button>
  );
}

// Component to add conflict events (for level 2 access users)
function AddConflictEventControl() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Violent');
  const [severity, setSeverity] = useState('Medium');
  const map = useMap();
  const { toast } = useToast();
  
  // Access check for level 2 users
  const hasAddEventAccess = true; // This would come from your auth context in a real implementation
  
  useEffect(() => {
    if (!hasAddEventAccess) return;
    
    // Add click handler to map for capturing coordinates
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (open) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      }
    };
    
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, open, hasAddEventAccess]);
  
  const handleSubmit = async () => {
    if (!position || !title.trim() || !description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide all required information and select a position on the map.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // This would send data to your API in a real implementation
      console.log('Submitting conflict event:', {
        title,
        description,
        type,
        severity,
        coordinates: [position[1], position[0]], // [long, lat] format for consistency
        date: new Date().toISOString(),
        location: `Coordinates: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
      });
      
      toast({
        title: "Event Added",
        description: "Conflict event has been added successfully.",
      });
      
      // Reset form
      setOpen(false);
      setPosition(null);
      setTitle('');
      setDescription('');
      setType('Violent');
      setSeverity('Medium');
    } catch (error) {
      console.error('Error adding conflict event:', error);
      toast({
        title: "Error",
        description: "Failed to add conflict event. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  if (!hasAddEventAccess) return null;
  
  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      {!open ? (
        <Button 
          className="bg-red-600 hover:bg-red-700 text-white" 
          onClick={() => setOpen(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Report Conflict Event
        </Button>
      ) : (
        <Card className="w-[300px] shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Add Conflict Event</CardTitle>
            <CardDescription>
              {position 
                ? `Selected: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}` 
                : "Click on the map to select a location"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Violent">Violent</SelectItem>
                    <SelectItem value="Kidnapping">Kidnapping</SelectItem>
                    <SelectItem value="Terrorism">Terrorism</SelectItem>
                    <SelectItem value="Civil Unrest">Civil Unrest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="severity">Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setOpen(false);
              setPosition(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!position}>
              Submit
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

export default function VisualizationPage() {
  const [activeTab, setActiveTab] = useState("incidents");
  const incidentMapRef = useRef<HTMLDivElement>(null);
  const riskMapRef = useRef<HTMLDivElement>(null);
  
  const [selectedIncidentTypes, setSelectedIncidentTypes] = useState<string[]>(["Violent", "Kidnapping", "Terrorism", "Civil Unrest"]);
  const [selectedRiskLevels, setSelectedRiskLevels] = useState<string[]>(["Critical", "High", "Medium", "Low"]);
  const [showResources, setShowResources] = useState(true);
  const [timeRange, setTimeRange] = useState<[number]>([30]);
  
  // Fix icon issues with Leaflet in React
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);
  
  const filteredIncidents = incidents.filter(incident => 
    selectedIncidentTypes.includes(incident.type) && 
    new Date(incident.date) >= new Date(Date.now() - timeRange[0] * 24 * 60 * 60 * 1000)
  );
  
  const filteredRiskLevels = riskLevels.filter(risk => 
    selectedRiskLevels.includes(risk.level)
  );
  
  const toolbar = (
    <Button variant="outline">
      <Filter className="h-4 w-4 mr-2" />
      Download Map
    </Button>
  );
  
  return (
    <PageTemplate 
      title="Geospatial Visualization"
      description="Interactive maps for conflict data analysis"
      toolbar={toolbar}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 h-auto p-1">
          <TabsTrigger value="incidents" className="py-2">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Nigeria Incident Map</span>
            <span className="md:hidden">Incidents</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="py-2">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Risk Distribution</span>
            <span className="md:hidden">Risk</span>
          </TabsTrigger>
          <TabsTrigger value="layers" className="py-2">
            <Layers className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Map Controls</span>
            <span className="md:hidden">Controls</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Nigeria Incident Map</CardTitle>
                  <CardDescription>Geographic distribution of conflict incidents</CardDescription>
                </div>
                <Select defaultValue="All" onValueChange={() => {}}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Time</SelectItem>
                    <SelectItem value="Year">Past Year</SelectItem>
                    <SelectItem value="Month">Past Month</SelectItem>
                    <SelectItem value="Week">Past Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-[500px] rounded-md overflow-hidden" ref={incidentMapRef}>
                <MapContainer 
                  center={nigeriaCenter} 
                  zoom={defaultZoom} 
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satellite">
                      <TileLayer 
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" 
                      />
                    </LayersControl.BaseLayer>
                    
                    <LayersControl.Overlay checked name="Incidents">
                      <>
                        {filteredIncidents.map(incident => (
                          <Marker 
                            key={incident.id} 
                            position={[incident.coordinates[1], incident.coordinates[0]]}
                            icon={getSeverityMarker(incident.severity)}
                          >
                            <Popup>
                              <div className="text-sm">
                                <h3 className="font-bold">{incident.title}</h3>
                                <p className="text-muted-foreground">{incident.location}</p>
                                <p className="my-1">{incident.description}</p>
                                <div className="flex gap-2 mt-2">
                                  <Badge className={
                                    incident.severity === "Critical" ? "bg-red-100 text-red-800" :
                                    incident.severity === "High" ? "bg-orange-100 text-orange-800" :
                                    incident.severity === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-green-100 text-green-800"
                                  }>
                                    {incident.severity}
                                  </Badge>
                                  <Badge variant="outline">{incident.type}</Badge>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </>
                    </LayersControl.Overlay>
                    {showResources && (
                      <LayersControl.Overlay checked name="Resources">
                        <>
                          {resources.map((resource, idx) => (
                            <Circle
                              key={idx}
                              center={[resource.coordinates[1], resource.coordinates[0]]}
                              radius={resource.radius}
                              pathOptions={getResourceStyle(resource.type)}
                            >
                              <Popup>
                                <div className="text-sm">
                                  <h3 className="font-bold">{resource.type}</h3>
                                  <p>{resource.location}</p>
                                </div>
                              </Popup>
                            </Circle>
                          ))}
                        </>
                      </LayersControl.Overlay>
                    )}
                  </LayersControl>
                  
                  <FullscreenControl mapRef={incidentMapRef} />
                  <AddConflictEventControl />
                </MapContainer>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filter Incidents:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Violent', 'Kidnapping', 'Terrorism', 'Civil Unrest'].map(type => (
                    <Badge 
                      key={type} 
                      variant={selectedIncidentTypes.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedIncidentTypes.includes(type)) {
                          setSelectedIncidentTypes(prev => prev.filter(t => t !== type));
                        } else {
                          setSelectedIncidentTypes(prev => [...prev, type]);
                        }
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Critical Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-3xl font-bold text-red-600">
                    {incidents.filter(i => i.severity === "Critical").length}
                  </div>
                  <div className="ml-auto h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Active Hotspots</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {riskLevels.filter(r => r.level === "Critical" || r.level === "High").length}
                  </div>
                  <div className="ml-auto h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Farmer-Herder</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {incidents.filter(i => i.title.includes("Farmer-Herder")).length}
                  </div>
                  <div className="ml-auto h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Tractor className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Displacement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {resources.filter(r => r.type === "Refugee Camp").length}
                  </div>
                  <div className="ml-auto h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Home className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Risk Distribution Map</CardTitle>
                  <CardDescription>Regional conflict risk assessment visualization</CardDescription>
                </div>
                <Select defaultValue="Current" onValueChange={() => {}}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Risk Assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Current">Current</SelectItem>
                    <SelectItem value="Projected">Projected (30 days)</SelectItem>
                    <SelectItem value="Historical">Historical Trend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative h-[500px] rounded-md overflow-hidden" ref={riskMapRef}>
                <MapContainer 
                  center={nigeriaCenter} 
                  zoom={defaultZoom} 
                  style={{ height: '100%', width: '100%' }}
                  attributionControl={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="OpenStreetMap">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Light Map">
                      <TileLayer 
                        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png" 
                      />
                    </LayersControl.BaseLayer>
                    
                    <LayersControl.Overlay checked name="Risk Levels">
                      <>
                        {filteredRiskLevels.map((risk, idx) => (
                          <Circle
                            key={idx}
                            center={[risk.coordinates[1], risk.coordinates[0]]}
                            radius={risk.radius}
                            pathOptions={getRiskColor(risk.level)}
                          >
                            <Popup>
                              <div className="text-sm">
                                <h3 className="font-bold">{risk.state} State</h3>
                                <p>Risk Level: <span className="font-medium">{risk.level}</span></p>
                              </div>
                            </Popup>
                          </Circle>
                        ))}
                      </>
                    </LayersControl.Overlay>
                    <LayersControl.Overlay checked name="Incidents">
                      <>
                        {filteredIncidents.map(incident => (
                          <Marker 
                            key={incident.id} 
                            position={[incident.coordinates[1], incident.coordinates[0]]}
                            icon={getSeverityMarker(incident.severity)}
                          >
                            <Popup>
                              <div className="text-sm">
                                <h3 className="font-bold">{incident.title}</h3>
                                <p className="text-muted-foreground">{incident.location}</p>
                                <p className="my-1">{incident.description}</p>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </>
                    </LayersControl.Overlay>
                  </LayersControl>
                  
                  <FullscreenControl mapRef={riskMapRef} />
                  <AddConflictEventControl />
                </MapContainer>
              </div>
            </CardContent>
            <CardFooter>
              <div className="w-full flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Risk Levels:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Critical', 'High', 'Medium', 'Low'].map(level => (
                    <Badge 
                      key={level} 
                      variant={selectedRiskLevels.includes(level) ? "default" : "outline"}
                      className={`cursor-pointer ${
                        level === "Critical" ? "bg-red-600" : 
                        level === "High" ? "bg-orange-600" : 
                        level === "Medium" ? "bg-yellow-600" : 
                        "bg-green-600"
                      }`}
                      onClick={() => {
                        if (selectedRiskLevels.includes(level)) {
                          setSelectedRiskLevels(prev => prev.filter(l => l !== level));
                        } else {
                          setSelectedRiskLevels(prev => [...prev, level]);
                        }
                      }}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Critical Risk Zones</CardTitle>
                <CardDescription>Highest conflict risk territories</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y">
                  {riskLevels
                    .filter(r => r.level === "Critical")
                    .map((risk, idx) => (
                      <li key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between items-center">
                        <span className="font-medium">{risk.state} State</span>
                        <Badge className="bg-red-100 text-red-800">{risk.level}</Badge>
                      </li>
                    ))
                  }
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">High Risk Zones</CardTitle>
                <CardDescription>Elevated conflict risk territories</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y">
                  {riskLevels
                    .filter(r => r.level === "High")
                    .map((risk, idx) => (
                      <li key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between items-center">
                        <span className="font-medium">{risk.state} State</span>
                        <Badge className="bg-orange-100 text-orange-800">{risk.level}</Badge>
                      </li>
                    ))
                  }
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Medium Risk Zones</CardTitle>
                <CardDescription>Moderate conflict risk territories</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y">
                  {riskLevels
                    .filter(r => r.level === "Medium")
                    .map((risk, idx) => (
                      <li key={idx} className="py-2 first:pt-0 last:pb-0 flex justify-between items-center">
                        <span className="font-medium">{risk.state} State</span>
                        <Badge className="bg-yellow-100 text-yellow-800">{risk.level}</Badge>
                      </li>
                    ))
                  }
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="layers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Map Layers & Controls</CardTitle>
              <CardDescription>Customize map visualization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Data Layers</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-md border flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-blue-500" />
                        </div>
                        <h4 className="font-medium">Political Boundaries</h4>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="pl-8 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>States & LGAs</span>
                        <Switch checked={true} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-md border flex items-center justify-center">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                        <h4 className="font-medium">Incidents</h4>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="pl-8 space-y-2 text-sm">
                      {['Violent', 'Kidnapping', 'Terrorism', 'Civil Unrest'].map(type => (
                        <div key={type} className="flex items-center justify-between">
                          <span>{type}</span>
                          <Switch 
                            checked={selectedIncidentTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIncidentTypes(prev => [...prev, type]);
                              } else {
                                setSelectedIncidentTypes(prev => prev.filter(t => t !== type));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-md border flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                        <h4 className="font-medium">Risk Levels</h4>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="pl-8 space-y-2 text-sm">
                      {['Critical', 'High', 'Medium', 'Low'].map(level => (
                        <div key={level} className="flex items-center justify-between">
                          <span>{level}</span>
                          <Switch 
                            checked={selectedRiskLevels.includes(level)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRiskLevels(prev => [...prev, level]);
                              } else {
                                setSelectedRiskLevels(prev => prev.filter(l => l !== level));
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-md border flex items-center justify-center">
                          <Tractor className="h-4 w-4 text-green-500" />
                        </div>
                        <h4 className="font-medium">Resources</h4>
                      </div>
                      <Switch 
                        checked={showResources}
                        onCheckedChange={setShowResources}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4">Display Controls</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Time Range</span>
                        <span className="text-sm text-muted-foreground">{timeRange[0]} days</span>
                      </div>
                      <Slider
                        min={7}
                        max={365}
                        step={1}
                        value={timeRange}
                        onValueChange={(value) => setTimeRange(value as [number])}
                      />
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <span>7 days</span>
                        <span>30 days</span>
                        <span>90 days</span>
                        <span>1 year</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-2 font-medium">Map Style</div>
                      <div className="grid grid-cols-3 gap-2">
                        {["Streets", "Satellite", "Light"].map((style) => (
                          <Button 
                            key={style}
                            variant={style === "Streets" ? "default" : "outline"}
                            size="sm"
                            className="w-full"
                          >
                            {style}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-2 font-medium">Export Options</div>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full">
                          Download PNG Image
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                          Download GeoJSON Data
                        </Button>
                        <Button variant="outline" size="sm" className="w-full">
                          Generate Report
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}