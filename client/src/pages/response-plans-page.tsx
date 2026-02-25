import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  ResponsePlan, 
  Incident, 
  RiskAnalysis, 
  ResponseTeam, 
  insertResponsePlanSchema 
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// import { ErrorMessage } from "@/components/ui/error-message";
// import { DataLoader } from "@/components/ui/data-loader";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, 
  AlertCircle, 
  Users, 
  Clock, 
  CheckCircle, 
  Plus, 
  FileText, 
  Search, 
  Filter,
  RefreshCw,
  CalendarClock,
  Calendar,
  Truck,
  MessageSquare,
  PhoneCall,
  Eye,
  FileBarChart2,
  Shield,
  ShieldCheck,
  X as XCircle,
  Loader2,
  UserPlus
} from "lucide-react";
import { TeamMembersDialog } from "@/components/TeamMembersDialog";

// Create a schema for response plan form
const responsePlanFormSchema = insertResponsePlanSchema
  .pick({
    title: true,
    description: true,
    region: true,
    location: true,
    status: true,
    category: true,
  })
  .extend({
    status: z.enum(["draft", "active", "completed"], {
      required_error: "Please select a status",
    }),
    category: z.enum(["emergency", "preventive", "recovery"], {
      required_error: "Please select a response type",
    }),
    steps: z.record(z.string(), z.string()).default({}),
    resources: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
    interAgencyPortal: z.record(z.string(), z.any()).optional(),
    selectedTeams: z.array(z.number()).optional(),
  });

type ResponsePlanFormValues = z.infer<typeof responsePlanFormSchema>;

export default function ResponsePlansPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ResponsePlan | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [teamMembersOpen, setTeamMembersOpen] = useState(false);
  const [selectedTeamForMembers, setSelectedTeamForMembers] = useState<{ id: number; name: string } | null>(null);
  
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
  
  // Fetch incidents for the select dropdown
  const { 
    data: incidents 
  } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
  });
  
  // Fetch risk analyses for the select dropdown
  const { 
    data: analyses 
  } = useQuery<RiskAnalysis[]>({
    queryKey: ["/api/risk-analyses"],
  });
  
  // Fetch response teams for the select dropdown
  const { 
    data: teams 
  } = useQuery<ResponseTeam[]>({
    queryKey: ["/api/response-teams"],
  });
  
  // Create form using react-hook-form
  const form = useForm<ResponsePlanFormValues>({
    resolver: zodResolver(responsePlanFormSchema),
    defaultValues: {
      title: "",
      description: "",
      region: "Nigeria", // Default to Nigeria
      location: "",
      status: "draft",
      category: "preventive",
      steps: {},
      resources: {},
      interAgencyPortal: {},
      selectedTeams: [],
    },
  });
  
  // Create response plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: ResponsePlanFormValues) => {
      // Prepare data for submission
      const planData = {
        title: data.title,
        description: data.description,
        region: data.region,
        location: data.location,
        status: data.status,
        category: data.category,
        steps: data.steps || {},
        resources: data.resources || {},
        interAgencyPortal: data.interAgencyPortal || {},
        assignedTeams: data.selectedTeams || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1, // Default to admin user
      };
      
      const res = await apiRequest("POST", "/api/response-plans", planData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/response-plans"] });
      toast({
        title: "Response Plan Created",
        description: "The plan has been created successfully.",
      });
      form.reset();
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Update plan status mutation
  const updatePlanStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/response-plans/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/response-plans"] });
      toast({
        title: "Plan Updated",
        description: "The plan status has been updated successfully.",
      });
      setDetailsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  function onSubmit(data: ResponsePlanFormValues) {
    createPlanMutation.mutate(data);
  }
  
  // Format date for display
  const formatDate = (dateString: Date | null) => {
    return dateString ? new Date(dateString).toLocaleString() : "Not set";
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
  
  // View plan details
  const handleViewPlan = (plan: ResponsePlan) => {
    setSelectedPlan(plan);
    setDetailsDialogOpen(true);
  };
  
  // Update plan status
  const handleUpdateStatus = (status: string) => {
    if (selectedPlan) {
      updatePlanStatusMutation.mutate({ id: selectedPlan.id, status });
    }
  };
  
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

  return (
    <MainLayout title="Inter-Agency Portal">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger 
                value="active"
                className={selectedTab === "active" ? "bg-primary text-primary-foreground" : ""}
              >
                Active
              </TabsTrigger>
              <TabsTrigger 
                value="draft"
                className={selectedTab === "draft" ? "bg-primary text-primary-foreground" : ""}
              >
                Draft
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className={selectedTab === "completed" ? "bg-primary text-primary-foreground" : ""}
              >
                Completed
              </TabsTrigger>
              <TabsTrigger 
                value="all"
                className={selectedTab === "all" ? "bg-primary text-primary-foreground" : ""}
              >
                All Plans
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
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
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Total Plans</p>
                <p className="text-2xl font-semibold mt-1">
                  {plans?.length || 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <FileBarChart2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Draft</p>
                <p className="text-2xl font-semibold mt-1">
                  {plans?.filter(p => p.status === "draft").length || 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-neutral-100">
                <FileText className="h-5 w-5 text-neutral-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Active</p>
                <p className="text-2xl font-semibold mt-1">
                  {plans?.filter(p => p.status === "active").length || 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-blue-100">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-500">Completed</p>
                <p className="text-2xl font-semibold mt-1">
                  {plans?.filter(p => p.status === "completed").length || 0}
                </p>
              </div>
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="p-6 pb-2">
              <CardTitle>Inter-Agency Communication Portal</CardTitle>
              <CardDescription>
                Coordinate response strategies across security agencies
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Region/Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.title}</TableCell>
                        <TableCell>{plan.region}{plan.location ? ` / ${plan.location}` : ''}</TableCell>
                        <TableCell>{getResponseTypeBadge(plan.category)}</TableCell>
                        <TableCell>{getStatusBadge(plan.status)}</TableCell>
                        <TableCell>{formatDate(plan.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewPlan(plan)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileBarChart2 className="h-8 w-8 mx-auto mb-4 text-neutral-400" />
                  <p className="text-neutral-500">No response plans found</p>
                  <p className="text-neutral-400 text-sm mt-1">
                    {searchQuery ? "Try adjusting your search or filters" : "Create response plans to coordinate interventions"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Response Types</CardTitle>
              <CardDescription>Distribution by response category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      <span className="text-sm">Emergency</span>
                    </div>
                    <span className="text-sm font-medium">
                      {plans?.filter(p => p.category === "emergency").length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                      <span className="text-sm">Preventive</span>
                    </div>
                    <span className="text-sm font-medium">
                      {plans?.filter(p => p.category === "preventive").length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 mr-2"></div>
                      <span className="text-sm">Recovery</span>
                    </div>
                    <span className="text-sm font-medium">
                      {plans?.filter(p => p.category === "recovery").length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Regional Coverage</CardTitle>
              <CardDescription>Plans by Nigerian region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['North Central', 'North East', 'North West', 'South East', 'South South', 'South West'].map((region) => (
                  <div key={region} className="flex items-center justify-between">
                    <span className="text-sm">{region}</span>
                    <span className="text-sm font-medium">
                      {plans?.filter(p => p.region === region).length || 0}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Teams</CardTitle>
              <CardDescription>Manage team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teams?.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm font-medium">{team.name}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTeamForMembers({ id: team.id, name: team.name });
                        setTeamMembersOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Members
                    </Button>
                  </div>
                ))}
                {(!teams || teams.length === 0) && (
                  <p className="text-sm text-muted-foreground">No response teams</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TeamMembersDialog
        teamId={selectedTeamForMembers?.id ?? null}
        teamName={selectedTeamForMembers?.name ?? ""}
        open={teamMembersOpen}
        onOpenChange={(open) => {
          setTeamMembersOpen(open);
          if (!open) setSelectedTeamForMembers(null);
        }}
      />
      
      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create Response Plan</DialogTitle>
            <DialogDescription>
              Create a new response plan to coordinate crisis intervention activities.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter response plan title" {...field} />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the response plan objectives and scope" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specific Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city, town, or area" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Type</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="preventive">Preventive</SelectItem>
                            <SelectItem value="recovery">Recovery</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="selectedTeams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Teams</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={(value) => {
                          // Safely parse to number
                          const teamId = Number(value);
                          if (isNaN(teamId)) return;
                          
                          const currentValues = field.value || [];
                          if (!currentValues.includes(teamId)) {
                            field.onChange([...currentValues, teamId]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select teams" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams?.map(team => (
                            <SelectItem key={team.id} value={team.id.toString()}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value?.map((teamId: number) => {
                        const team = teams?.find(t => t.id === teamId);
                        return (
                          <Badge 
                            key={teamId}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => {
                              field.onChange(field.value?.filter((t: number) => t !== teamId));
                            }}
                          >
                            {team?.name || `Team ${teamId}`} <XCircle className="h-3 w-3 ml-1" />
                          </Badge>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="interAgencyPortal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inter-Agency Portal</FormLabel>
                    <FormDescription>
                      Configure communication centers for different security agencies
                    </FormDescription>
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          'Air Force', 'Police', 'Navy', 'Immigration', 'Customs', 
                          'DSS', 'NIA', 'NSCDC', 'Forest Guard', 'Amotekun', 'NSA'
                        ].map((agency) => {
                          const agencyKey = agency.toLowerCase().replace(/\s+/g, '_');
                          return (
                            <div key={agency} className="border rounded-md p-3">
                              <div className="flex items-center mb-2">
                                <Shield className="h-4 w-4 mr-2 text-primary" />
                                <h4 className="font-medium text-sm">{agency}</h4>
                              </div>
                              <div className="space-y-2">
                                <FormControl>
                                  <Input
                                    placeholder={`${agency} contact person`}
                                    value={field.value?.[agencyKey]?.contact || ''}
                                    onChange={(e) => {
                                      const currentValues = { ...(field.value || {}) };
                                      currentValues[agencyKey] = {
                                        ...(currentValues[agencyKey] || {}),
                                        contact: e.target.value
                                      };
                                      field.onChange(currentValues);
                                    }}
                                    className="text-xs"
                                  />
                                </FormControl>
                                <FormControl>
                                  <Textarea
                                    placeholder={`Notes for ${agency}`}
                                    value={field.value?.[agencyKey]?.notes || ''}
                                    onChange={(e) => {
                                      const currentValues = { ...(field.value || {}) };
                                      currentValues[agencyKey] = {
                                        ...(currentValues[agencyKey] || {}),
                                        notes: e.target.value
                                      };
                                      field.onChange(currentValues);
                                    }}
                                    className="text-xs min-h-[60px]"
                                  />
                                </FormControl>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⊝</span>
                      Creating...
                    </>
                  ) : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Plan Details Dialog */}
      {selectedPlan && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{selectedPlan.title}</DialogTitle>
              <DialogDescription>
                Response Plan Details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(selectedPlan.status)}
                {getResponseTypeBadge(selectedPlan.category)}
                <Badge variant="outline">{selectedPlan.region}</Badge>
                {selectedPlan.location && <Badge variant="outline">{selectedPlan.location}</Badge>}
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-neutral-600">{selectedPlan.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Created</h4>
                  <p className="text-sm text-neutral-600">{formatDate(selectedPlan.createdAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Last Updated</h4>
                  <p className="text-sm text-neutral-600">{formatDate(selectedPlan.updatedAt)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-1">Assigned Teams</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.assignedTeams && selectedPlan.assignedTeams.length > 0 ? 
                    Array.isArray(selectedPlan.assignedTeams) ? 
                      selectedPlan.assignedTeams.map((teamId: number) => {
                        const team = teams?.find(t => t.id === teamId);
                        return <Badge key={teamId} variant="secondary">{team?.name || `Team ${teamId}`}</Badge>;
                      })
                    : <Badge variant="secondary">Team IDs: {JSON.stringify(selectedPlan.assignedTeams)}</Badge>
                    : <span className="text-sm text-neutral-500">No teams assigned</span>
                  }
                </div>
              </div>
              
              {/* Inter-Agency Portal Section */}
              {(() => {
                // Type safety checks
                if (!selectedPlan.interAgencyPortal) return null;
                if (typeof selectedPlan.interAgencyPortal !== 'object') return null;
                if (Object.keys(selectedPlan.interAgencyPortal).length === 0) return null;
                
                const portalData = selectedPlan.interAgencyPortal as Record<string, {contact?: string, notes?: string}>;
                
                return (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Inter-Agency Portal</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(portalData).map(([key, data]) => {
                        if (!data || (!data.contact && !data.notes)) return null;
                        
                        const agencyName = key.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ');
                        
                        return (
                          <div key={key} className="border rounded-md p-3 bg-neutral-50">
                            <div className="flex items-center mb-1">
                              <Shield className="h-4 w-4 mr-2 text-primary" />
                              <h4 className="font-medium text-sm">{agencyName}</h4>
                            </div>
                            {data.contact && (
                              <div className="mb-1">
                                <span className="text-xs font-medium">Contact:</span>
                                <p className="text-xs text-neutral-600">{data.contact}</p>
                              </div>
                            )}
                            {data.notes && (
                              <div>
                                <span className="text-xs font-medium">Notes:</span>
                                <p className="text-xs text-neutral-600">{data.notes}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              <div>
                <h4 className="text-sm font-medium mb-1">Change Status</h4>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant={selectedPlan.status === "draft" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus("draft")}
                    disabled={updatePlanStatusMutation.isPending}
                  >
                    Draft
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedPlan.status === "active" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus("active")}
                    disabled={updatePlanStatusMutation.isPending}
                  >
                    Activate
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedPlan.status === "completed" ? "default" : "outline"}
                    onClick={() => handleUpdateStatus("completed")}
                    disabled={updatePlanStatusMutation.isPending}
                  >
                    Complete
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={() => setDetailsDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
}