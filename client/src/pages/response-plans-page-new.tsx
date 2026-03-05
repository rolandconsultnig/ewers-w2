import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { ResponsePlan, ResponseTeam } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { 
  AlertCircle, 
  AlertTriangle,
  Users, 
  Clock, 
  CheckCircle, 
  Plus, 
  FileText, 
  Search, 
  Filter,
  RefreshCw,
  Building,
  Users2,
  UserPlus,
  UserCog,
  Send,
  Loader2,
  FileBarChart2,
  ClipboardList,
  FileCheck,
  Phone
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function InterAgencyPortalPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ResponsePlan | null>(null);
  const [showAgencyDetails, setShowAgencyDetails] = useState<string | null>(null);
  
  // Fetch response plans
  const { 
    data: plans, 
    isLoading: isLoadingPlans, 
    error: plansError,
    refetch: refetchPlans 
  } = useQuery<ResponsePlan[]>({
    queryKey: ["/api/response-plans"]
  });
  
  // Handle error display
  React.useEffect(() => {
    if (plansError) {
      console.error("Error fetching response plans:", plansError);
      toast({
        title: "Failed to load response plans",
        description: plansError instanceof Error ? plansError.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  }, [plansError, toast]);
  
  // Fetch response teams for the dropdown
  const { 
    data: teams 
  } = useQuery<ResponseTeam[]>({
    queryKey: ["/api/response-teams"],
  });
  
  // Format date for display
  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Filter plans based on selected tab and search query
  const filteredPlans = plans?.filter(plan => {
    // Apply status filter
    const statusMatch = 
      (selectedTab === "active" && plan.status === "active") ||
      (selectedTab === "draft" && plan.status === "draft") ||
      (selectedTab === "completed" && plan.status === "completed") ||
      selectedTab === "all";
    
    // Apply search filter if search query exists
    const searchMatch = !searchQuery || 
      plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.region && plan.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (plan.location && plan.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return statusMatch && searchMatch;
  });
  
  // Mock data for partner agencies
  const agenciesData = [
    {
      id: "nema",
      name: "National Emergency Management Agency (NEMA)",
      logo: "/nema-logo.png",
      type: "Government",
      primaryContact: "John Doe",
      email: "contact@nema.gov.ng",
      phone: "+234-1-2345678",
      expertise: ["Disaster Management", "Emergency Response"],
      description: "NEMA is responsible for coordinating resources towards efficient and effective disaster prevention, preparation, mitigation and response in Nigeria."
    },
    {
      id: "ndlea",
      name: "National Drug Law Enforcement Agency (NDLEA)",
      logo: "/ndlea-logo.png",
      type: "Government",
      primaryContact: "Jane Smith",
      email: "info@ndlea.gov.ng",
      phone: "+234-1-8765432",
      expertise: ["Drug Enforcement", "Security"],
      description: "NDLEA is tasked with eliminating the growing, processing, manufacturing, selling, exporting, and trafficking of hard drugs in Nigeria."
    },
    {
      id: "nscdc",
      name: "Nigeria Security and Civil Defence Corps (NSCDC)",
      logo: "/nscdc-logo.png",
      type: "Government",
      primaryContact: "Michael Johnson",
      email: "contact@nscdc.gov.ng",
      phone: "+234-1-5555555",
      expertise: ["Civil Defense", "Critical Infrastructure Protection"],
      description: "NSCDC is primarily responsible for the protection of critical infrastructure, buildings and other properties owned by the government in Nigeria."
    },
    {
      id: "unicef",
      name: "UNICEF Nigeria",
      logo: "/unicef-logo.png",
      type: "International",
      primaryContact: "Sarah Parker",
      email: "info@unicef.org.ng",
      phone: "+234-1-4444444",
      expertise: ["Child Protection", "Humanitarian Aid"],
      description: "UNICEF works in Nigeria to protect children's rights, help meet their basic needs and expand their opportunities to reach their full potential."
    },
    {
      id: "msf",
      name: "Doctors Without Borders (MSF)",
      logo: "/msf-logo.png",
      type: "International",
      primaryContact: "Dr. Robert Chen",
      email: "nigeria@msf.org",
      phone: "+234-1-3333333",
      expertise: ["Medical Emergency Response", "Healthcare"],
      description: "MSF provides medical humanitarian assistance to save lives and ease the suffering of people in conflict situations in Nigeria."
    },
    {
      id: "redcross",
      name: "Nigerian Red Cross Society",
      logo: "/redcross-logo.png",
      type: "Non-Governmental",
      primaryContact: "Alice Williams",
      email: "info@redcross.org.ng",
      phone: "+234-1-2222222",
      expertise: ["First Aid", "Humanitarian Services"],
      description: "The Nigerian Red Cross Society is part of the International Red Cross and Red Crescent Movement, providing humanitarian aid during peacetime and armed conflicts."
    },
    {
      id: "police",
      name: "Nigeria Police Force",
      logo: "/police-logo.png",
      type: "Government",
      primaryContact: "Commissioner James",
      email: "info@npf.gov.ng",
      phone: "+234-1-1111111",
      expertise: ["Law Enforcement", "Security"],
      description: "The Nigeria Police Force is the principal law enforcement agency in Nigeria with a staff strength of about 371,800."
    },
    {
      id: "military",
      name: "Nigerian Armed Forces",
      logo: "/military-logo.png",
      type: "Government",
      primaryContact: "General Ibrahim",
      email: "contact@army.mil.ng",
      phone: "+234-1-7777777",
      expertise: ["Defense", "Security Operations"],
      description: "The Nigerian Armed Forces consists of the Army, Navy, and Air Force, responsible for the defense of Nigeria against external aggression."
    },
    {
      id: "who",
      name: "World Health Organization (WHO)",
      logo: "/who-logo.png",
      type: "International",
      primaryContact: "Dr. Elizabeth Brown",
      email: "nigeria@who.int",
      phone: "+234-1-6666666",
      expertise: ["Public Health", "Disease Outbreak Response"],
      description: "WHO works in Nigeria to promote health, keep the world safe, and serve the vulnerable, especially during health emergencies."
    }
  ];
  
  // Get the status badge for a plan
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-neutral-100 text-neutral-800">Draft</Badge>;
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Get the response type badge
  const getResponseTypeBadge = (type: string) => {
    switch (type) {
      case "emergency":
        return <Badge className="bg-red-100 text-red-800">Emergency</Badge>;
      case "preventive":
        return <Badge className="bg-amber-100 text-amber-800">Preventive</Badge>;
      case "recovery":
        return <Badge className="bg-indigo-100 text-indigo-800">Recovery</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Toggle agency selection
  const toggleAgencySelection = (agencyId: string) => {
    if (selectedAgencies.includes(agencyId)) {
      setSelectedAgencies(selectedAgencies.filter(id => id !== agencyId));
    } else {
      setSelectedAgencies([...selectedAgencies, agencyId]);
    }
  };
  
  // Handle assignment submission
  const handleAssignAgencies = () => {
    if (!selectedPlan) return;
    
    // In a real app, this would be an API call to associate agencies with the plan
    toast({
      title: "Agencies Assigned",
      description: `${selectedAgencies.length} agencies assigned to "${selectedPlan.title}"`,
    });
    
    setAssignDialogOpen(false);
    setSelectedAgencies([]);
  };
  
  // Find assigned agencies for a plan
  const findAssignedAgencies = (planId: number) => {
    // In a real app, this would be a lookup to the database
    // For now, we'll simulate this with some mock data
    const mockAssignments: Record<number, string[]> = {
      1: ["nema", "police", "military"],
      2: ["nema", "unicef", "redcross"],
      3: ["ndlea", "nscdc"],
      4: ["msf", "who"]
    };
    
    return mockAssignments[planId] || [];
  };
  
  // Get initials for an agency name (for avatar fallback)
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  // Get agency details by ID
  const getAgencyById = (id: string) => {
    return agenciesData.find(agency => agency.id === id);
  };

  return (
    <MainLayout title="Inter-Agency Portal">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content Area - 8 columns on large screens */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <TabsList>
                <TabsTrigger 
                  value="active" 
                  onClick={() => setSelectedTab("active")}
                  className={selectedTab === "active" ? "bg-primary text-primary-foreground" : ""}
                >
                  Active
                </TabsTrigger>
                <TabsTrigger 
                  value="draft" 
                  onClick={() => setSelectedTab("draft")}
                  className={selectedTab === "draft" ? "bg-primary text-primary-foreground" : ""}
                >
                  Draft
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  onClick={() => setSelectedTab("completed")}
                  className={selectedTab === "completed" ? "bg-primary text-primary-foreground" : ""}
                >
                  Completed
                </TabsTrigger>
                <TabsTrigger 
                  value="all" 
                  onClick={() => setSelectedTab("all")}
                  className={selectedTab === "all" ? "bg-primary text-primary-foreground" : ""}
                >
                  All Plans
                </TabsTrigger>
              </TabsList>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search plans..."
                  className="pl-9 w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchPlans()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </div>
          </div>
          
          <Card>
            <CardHeader className="p-6 pb-2">
              <CardTitle>Inter-Agency Response Coordination</CardTitle>
              <CardDescription>
                Manage and coordinate conflict response efforts across multiple agencies
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingPlans ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-neutral-500">Loading response plans...</p>
                </div>
              ) : plansError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Failed to load response plans</h3>
                  <p className="text-muted-foreground mb-4">
                    We encountered a problem while retrieving response plan data.
                  </p>
                  <div className="text-sm text-left max-w-md mx-auto mb-6">
                    <p className="font-medium mb-1">Troubleshooting tips:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Check your internet connection and try again.</li>
                      <li>The server might be temporarily unavailable.</li>
                      <li>If the problem persists, contact technical support.</li>
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchPlans()}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : filteredPlans && filteredPlans.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Region/Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned Agencies</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlans.map((plan) => {
                        const assignedAgencies = findAssignedAgencies(plan.id);
                        return (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.title}</TableCell>
                            <TableCell>{plan.region}{plan.location ? ` / ${plan.location}` : ''}</TableCell>
                            <TableCell>{getResponseTypeBadge(plan.category)}</TableCell>
                            <TableCell>{getStatusBadge(plan.status)}</TableCell>
                            <TableCell>
                              <div className="flex -space-x-2">
                                {assignedAgencies.slice(0, 3).map((agencyId) => {
                                  const agency = getAgencyById(agencyId);
                                  return (
                                    <Avatar 
                                      key={agencyId} 
                                      className="border-2 border-background w-8 h-8"
                                    >
                                      <AvatarImage src={agency?.logo} alt={agency?.name} />
                                      <AvatarFallback className="text-xs">
                                        {getInitials(agency?.name || '')}
                                      </AvatarFallback>
                                    </Avatar>
                                  );
                                })}
                                {assignedAgencies.length > 3 && (
                                  <Avatar className="border-2 border-background w-8 h-8 bg-muted">
                                    <AvatarFallback className="text-xs">+{assignedAgencies.length - 3}</AvatarFallback>
                                  </Avatar>
                                )}
                                {assignedAgencies.length === 0 && (
                                  <span className="text-sm text-muted-foreground">None</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedPlan(plan);
                                  setSelectedAgencies(findAssignedAgencies(plan.id));
                                  setAssignDialogOpen(true);
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Assign
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No response plans found</h3>
                  <p className="text-muted-foreground mb-6">
                    {selectedTab !== 'all' 
                      ? `There are no ${selectedTab} response plans.` 
                      : 'There are no response plans available.'}
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Activity Timeline (Only show if plans exist) */}
          {plans && plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates and actions in the Inter-Agency Portal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="bg-blue-100 text-blue-800 p-2 rounded-full">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="bg-border w-[2px] h-full mt-2"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Agency Assignment</div>
                      <p className="text-sm text-muted-foreground">NEMA has been assigned to "Flood Response in Lagos"</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(new Date(Date.now() - 1000 * 60 * 30))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="bg-green-100 text-green-800 p-2 rounded-full">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div className="bg-border w-[2px] h-full mt-2"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Plan Completed</div>
                      <p className="text-sm text-muted-foreground">
                        "Kano Civil Unrest Response" has been marked as completed
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(new Date(Date.now() - 1000 * 60 * 120))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="bg-amber-100 text-amber-800 p-2 rounded-full">
                        <FileBarChart2 className="h-4 w-4" />
                      </div>
                      <div className="bg-border w-[2px] h-full mt-2"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Progress Update</div>
                      <p className="text-sm text-muted-foreground">
                        Progress update for "Farmer-Herder Conflict Mediation" in Benue
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(new Date(Date.now() - 1000 * 60 * 180))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex flex-col items-center mr-4">
                      <div className="bg-purple-100 text-purple-800 p-2 rounded-full">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">New Plan Created</div>
                      <p className="text-sm text-muted-foreground">
                        "Drought Preparedness" plan has been created for North East region
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(new Date(Date.now() - 1000 * 60 * 260))}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Sidebar - 4 columns on large screens */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Agency Directory Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Agency Directory</CardTitle>
              <CardDescription>
                Partner agencies for conflict response
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-3">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {agenciesData.map((agency) => (
                    <Card key={agency.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={agency.logo} alt={agency.name} />
                          <AvatarFallback>{getInitials(agency.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-sm truncate">{agency.name}</h4>
                            <Badge variant="outline" className="ml-2 text-xs h-5">
                              {agency.type}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 mr-1" />
                            <span>{agency.phone}</span>
                          </div>
                          
                          {showAgencyDetails === agency.id ? (
                            <div className="mt-2 text-xs text-muted-foreground space-y-2">
                              <p>{agency.description}</p>
                              <div>
                                <span className="font-medium">Expertise: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {agency.expertise.map((exp) => (
                                    <Badge key={exp} variant="secondary" className="text-xs">
                                      {exp}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Contact: </span>
                                {agency.primaryContact}
                              </div>
                              <div>
                                <span className="font-medium">Email: </span>
                                <a 
                                  href={`mailto:${agency.email}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {agency.email}
                                </a>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-1 h-7 px-2 text-xs w-full"
                                onClick={() => setShowAgencyDetails(null)}
                              >
                                Show Less
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-1 h-7 px-2 text-xs"
                              onClick={() => setShowAgencyDetails(agency.id)}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Quick Stats Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Response Overview</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="text-sm">Active Response Plans</div>
                    <div className="font-medium text-sm">
                      {plans?.filter(p => p.status === 'active').length || 0}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm">Agencies Engaged</div>
                    <div className="font-medium text-sm">{agenciesData.length}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm">Regions Covered</div>
                    <div className="font-medium text-sm">6</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm">Response Teams</div>
                    <div className="font-medium text-sm">{teams?.length || 0}</div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">Agency Type Distribution</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span>Government</span>
                      </div>
                      <span>{agenciesData.filter(a => a.type === 'Government').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                        <span>International</span>
                      </div>
                      <span>{agenciesData.filter(a => a.type === 'International').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                        <span>Non-Governmental</span>
                      </div>
                      <span>{agenciesData.filter(a => a.type === 'Non-Governmental').length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Communication Card */}
          <Card className="hidden md:block">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Agency Communications</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-4">
                <div className="border border-border rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src="/nema-logo.png" alt="NEMA" />
                        <AvatarFallback className="text-xs">NE</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">NEMA</span>
                    </div>
                    <Badge variant="outline" className="text-xs">1h ago</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Requesting additional resources for the flood response effort in Lagos. Need water purification equipment.
                  </p>
                </div>
                
                <div className="border border-border rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage src="/redcross-logo.png" alt="Red Cross" />
                        <AvatarFallback className="text-xs">RC</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">Red Cross</span>
                    </div>
                    <Badge variant="outline" className="text-xs">3h ago</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Medical team deployed to Benue. Setting up temporary clinic for displaced persons.
                  </p>
                </div>
                
                <Button size="sm" className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Agency Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Assign Agencies to Response Plan</DialogTitle>
            <DialogDescription>
              {selectedPlan && `Plan: ${selectedPlan.title} (${selectedPlan.region})`}
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Select Agencies:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agenciesData.map((agency) => (
                  <div 
                    key={agency.id}
                    className={`
                      flex items-start space-x-3 border rounded-md p-3 cursor-pointer 
                      transition-colors
                      ${selectedAgencies.includes(agency.id) 
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/20'}
                    `}
                    onClick={() => toggleAgencySelection(agency.id)}
                  >
                    <Checkbox 
                      checked={selectedAgencies.includes(agency.id)}
                      onCheckedChange={() => toggleAgencySelection(agency.id)}
                    />
                    <div className="space-y-1">
                      <Label
                        htmlFor={`agency-${agency.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {agency.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">{agency.expertise.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Assignment Note:</h4>
              <Textarea
                placeholder="Add details about this assignment..."
                className="min-h-[80px]"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedAgencies([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAssignAgencies}
                disabled={selectedAgencies.length === 0}
              >
                {selectedAgencies.length === 0 ? 'No Agencies Selected' : `Assign ${selectedAgencies.length} Agencies`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}