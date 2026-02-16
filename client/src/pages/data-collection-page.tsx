import React, { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertIncidentSchema, DataSource, insertDataSourceSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Database, Radio, Users, RefreshCw, Shield, AlertTriangle, MessageCircle, UserCheck, BadgeCheck, BarChart3, MapIcon, Table, Plus, Pencil, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Create a schema for incident reporting
const incidentSchema = insertIncidentSchema
  .pick({
    title: true,
    description: true,
    location: true,
    severity: true,
  })
  .extend({
    location: z.string().min(3, "Location must be at least 3 characters"),
    severity: z.enum(["low", "medium", "high"], {
      required_error: "Please select a severity level",
    }),
    sourceId: z.coerce.number().optional(),
    actorType: z.enum(["state", "non-state"], {
      required_error: "Please select an actor type",
    }),
    actorName: z.string().min(2, "Actor name must be at least 2 characters"),
  });

type IncidentFormValues = z.infer<typeof incidentSchema>;

// Create a schema for data source configuration
const dataSourceSchema = insertDataSourceSchema
  .pick({
    name: true,
    type: true,
    apiEndpoint: true,
    apiKey: true,
    region: true,
    frequency: true,
    dataFormat: true,
  })
  .extend({
    description: z.string().min(3, "Description must be at least 3 characters"),
    type: z.enum(["social_media", "news_media", "satellite", "government_report", "ngo_report", "sensor_network", "field_report"], {
      required_error: "Please select a source type",
    }),
    frequency: z.enum(["hourly", "daily", "weekly", "real-time"], {
      required_error: "Please select a frequency",
    }),
    dataFormat: z.enum(["json", "xml", "csv", "geojson"], {
      required_error: "Please select a data format",
    }),
  });

type DataSourceFormValues = z.infer<typeof dataSourceSchema>;

export default function DataCollectionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [seedingNews, setSeedingNews] = useState(false);
  
  // State for data sources
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [currentSource, setCurrentSource] = useState<Partial<DataSource>>({
    id: 0,
    name: "",
    type: "",
    region: "Nigeria",
  });
  const [refetchLoading, setRefetchLoading] = useState(false);
  const [recentImports, setRecentImports] = useState<{ filename: string; imported: number; errors: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Data source form
  const sourceForm = useForm<DataSourceFormValues>({
    resolver: zodResolver(dataSourceSchema),
    defaultValues: {
      name: "",
      type: "news_media",
      description: "",
      apiEndpoint: "",
      apiKey: "",
      region: "Nigeria",
      frequency: "daily",
      dataFormat: "json",
    }
  });
  
  // Fetch existing data sources
  const { 
    data: sources, 
    isLoading: isLoadingSources,
    refetch: refetchSources
  } = useQuery<DataSource[]>({
    queryKey: ["/api/data-sources"],
  });
  
  // Effect to update the form when a source is selected for configuration
  React.useEffect(() => {
    if (currentSource && configureDialogOpen) {
      sourceForm.reset({
        name: currentSource.name || "",
        type: currentSource.type as any || "news_media",
        description: currentSource.description || "",
        apiEndpoint: currentSource.apiEndpoint || "",
        apiKey: currentSource.apiKey || "",
        region: currentSource.region || "Nigeria",
        frequency: currentSource.frequency as any || "daily",
        dataFormat: currentSource.dataFormat as any || "json",
      });
    }
  }, [currentSource, configureDialogOpen]);
  
  // Create or update data source mutation
  const saveDataSourceMutation = useMutation({
    mutationFn: async (data: DataSourceFormValues) => {
      // If currentSource.id is positive, we're updating an existing source
      if (currentSource.id && currentSource.id > 0) {
        const res = await apiRequest("PUT", `/api/data-sources/${currentSource.id}`, data);
        return await res.json();
      } else {
        // Otherwise we're creating a new source
        const res = await apiRequest("POST", "/api/data-sources", data);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      toast({
        title: currentSource.id && currentSource.id > 0 ? "Data Source Updated" : "Data Source Created",
        description: `The data source has been ${currentSource.id && currentSource.id > 0 ? 'updated' : 'created'} successfully.`,
      });
      sourceForm.reset();
      setConfigureDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save data source",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Helper function to handle form submission
  function onSubmitDataSource(data: DataSourceFormValues) {
    saveDataSourceMutation.mutate(data);
  }
  
  // Helper function to format date
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };
  
  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  
  // Helper function to format source type for display
  const formatSourceType = (type: string): string => {
    switch (type) {
      case 'news_media':
        return 'News Media';
      case 'social_media':
        return 'Social Media';
      case 'satellite':
        return 'Satellite';
      case 'government_report':
        return 'Government';
      case 'ngo_report':
        return 'NGO';
      case 'sensor_network':
        return 'Sensor Network';
      case 'field_report':
        return 'Field Report';
      default:
        return capitalizeFirstLetter(type.replace('_', ' '));
    }
  };
  
  // Incident form setup
  const form = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      severity: undefined,
      sourceId: undefined,
      actorType: undefined,
      actorName: "",
    },
  });

  const reportIncidentMutation = useMutation({
    mutationFn: async (data: IncidentFormValues) => {
      // Add the required fields for the incident schema
      const incidentData = {
        ...data,
        reportedBy: user!.id,
        status: "active",
        region: "Nigeria",
        category: "conflict",
        sourceId: data.sourceId,
        locationMetadata: {
          coordinates: data.location,
          region: "Nigeria"
        },
        verificationStatus: "unverified",
        actors: {
          type: data.actorType,
          name: data.actorName
        }
      };
      
      const res = await apiRequest("POST", "/api/incidents", incidentData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({
        title: "Incident Reported",
        description: "Your incident report has been submitted successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit report",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: IncidentFormValues) {
    reportIncidentMutation.mutate(data);
  }

  const fileImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/data-collection/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Import failed");
      }
      return res.json();
    },
    onSuccess: (data, file) => {
      setRecentImports((prev) => [{ filename: file.name, imported: data.imported, errors: data.errors }, ...prev.slice(0, 4)]);
      queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collected-data/status"] });
      toast({
        title: "File Imported",
        description: data.message || `Imported ${data.imported} records`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "json") {
        toast({ title: "Unsupported format", description: "Use CSV or JSON files.", variant: "destructive" });
        return;
      }
      fileImportMutation.mutate(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "csv" && ext !== "json") {
        toast({ title: "Unsupported format", description: "Use CSV or JSON files.", variant: "destructive" });
        return;
      }
      fileImportMutation.mutate(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // Handle refreshing data sources
  const handleRefresh = async () => {
    setRefetchLoading(true);
    await refetchSources();
    setRefetchLoading(false);
    
    toast({
      title: "Data Sources Refreshed",
      description: "The data source list has been updated.",
    });
  };
  
  // State for fetch data loading and processing status
  const [fetchingData, setFetchingData] = useState(false);
  const [processingStats, setProcessingStats] = useState<{
    total: number;
    unprocessed: number;
    processed: number;
    errors: number;
  } | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Clean up polling interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  
  // Function to fetch data from active sources
  const fetchFromAllSources = async () => {
    try {
      setFetchingData(true);
      const res = await apiRequest("POST", "/api/data-sources/fetch-all", {});
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }
      
      const result = await res.json();
      
      toast({
        title: "Data Collection Initiated",
        description: `Collection started from ${result.sourcesCount || 0} active data sources.`,
      });
      
      // Refetch the data sources to update their status
      await queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      
      // Start polling for data processing status
      pollDataProcessingStatus();
    } catch (error) {
      toast({
        title: "Data Collection Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setFetchingData(false);
    }
  };
  
  // Function to fetch data from a specific source
  const fetchFromSource = async (sourceId: number) => {
    try {
      setFetchingData(true);
      const res = await apiRequest("POST", `/api/data-sources/${sourceId}/fetch`, {});
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }
      
      const result = await res.json();
      
      toast({
        title: "Data Collection Initiated",
        description: `Started collecting data from source #${sourceId}.`,
      });
      
      // Refetch the data sources to update their status
      await queryClient.invalidateQueries({ queryKey: ["/api/data-sources"] });
      
      // Start polling for data processing status
      pollDataProcessingStatus();
    } catch (error) {
      toast({
        title: "Data Collection Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setFetchingData(false);
    }
  };
  
  // Function to poll data processing status
  const pollDataProcessingStatus = async () => {
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    // Do an initial fetch right away
    await fetchProcessingStatus();
    
    // Create a new polling interval
    const interval = setInterval(fetchProcessingStatus, 3000); // Poll every 3 seconds
    setPollingInterval(interval);
  };
  
  // Function to fetch processing status
  const fetchProcessingStatus = async () => {
    try {
      const res = await apiRequest("GET", "/api/collected-data/status", null);
      
      if (!res.ok) {
        throw new Error("Failed to fetch processing status");
      }
      
      const data = await res.json();
      
      if (data.success && data.stats) {
        setProcessingStats(data.stats);
        
        // If all data is processed or there are no unprocessed items, stop polling
        if (data.stats.unprocessed === 0 || 
            (data.stats.processed + data.stats.errors === data.stats.total)) {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          
          // Only show completion toast if we actually processed something
          if (data.stats.total > 0) {
            toast({
              title: "Data Processing Complete",
              description: `Processed ${data.stats.processed} items with ${data.stats.errors} errors.`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error polling data status:", error);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const seedNewsSources = async () => {
    setSeedingNews(true);
    try {
      const res = await apiRequest("POST", "/api/admin/seed-news-sources", {});
      const data = await res.json();
      toast({
        title: "News Sources Seeded",
        description: `Successfully added ${data.count} Nigerian news sources. Total: ${data.total}`,
      });
      refetchSources();
    } catch (error) {
      toast({
        title: "Failed to seed news sources",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSeedingNews(false);
    }
  };

  const [availableNews, setAvailableNews] = useState<any>(null);
  const fetchAvailableNews = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/available-news-sources");
      const data = await res.json();
      setAvailableNews(data);
      toast({ title: "Available sources loaded" });
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    }
  };
  const refreshNewsSources = async () => {
    try {
      const res = await apiRequest("PUT", "/api/admin/refresh-news-sources");
      const data = await res.json();
      toast({ title: "News sources refreshed", description: `${data.count} sources updated` });
      refetchSources();
    } catch (e) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    }
  };

  return (
    <MainLayout title="Data Collection">
      {/* Data Source Configuration Dialog */}
      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentSource.id && currentSource.id > 0 
                ? "Edit Data Source" 
                : "Add New Data Source"}
            </DialogTitle>
            <DialogDescription>
              Configure external data source connection details
            </DialogDescription>
          </DialogHeader>
          
          <Form {...sourceForm}>
            <form onSubmit={sourceForm.handleSubmit(onSubmitDataSource)} className="space-y-6">
              <FormField
                control={sourceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Nigerian News API" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={sourceForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="news_media">News Media</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="satellite">Satellite Imagery</SelectItem>
                          <SelectItem value="government_report">Government Reports</SelectItem>
                          <SelectItem value="ngo_report">NGO Reports</SelectItem>
                          <SelectItem value="sensor_network">Sensor Network</SelectItem>
                          <SelectItem value="field_report">Field Reports</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Status field without using form controller since it's not in our schema */}
                <div className="form-item">
                  <label className="text-sm font-medium">Status</label>
                  <Select 
                    onValueChange={(value) => {
                      // We handle this manually since it's not in our form schema
                      setCurrentSource(prev => ({
                        ...prev,
                        status: value
                      }));
                    }} 
                    defaultValue={currentSource.status || "active"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="degraded">Degraded</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <FormField
                control={sourceForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the data source and what kind of data it provides" 
                        className="min-h-20"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={sourceForm.control}
                name="apiEndpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Endpoint URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://api.example.com/v1/data" 
                        value={field.value || ''} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      The base URL for API requests
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={sourceForm.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your API key" 
                        value={field.value || ''} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Securely stored and used for authentication
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={sourceForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Update Frequency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="real-time">Real-time</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sourceForm.control}
                  name="dataFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Format</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="xml">XML</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="geojson">GeoJSON</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={sourceForm.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Input defaultValue="Nigeria" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setConfigureDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={saveDataSourceMutation.isPending}
                >
                  {saveDataSourceMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⊝</span>
                      Saving...
                    </>
                  ) : currentSource.id && currentSource.id > 0 ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {availableNews && (
        <Dialog open={!!availableNews} onOpenChange={() => setAvailableNews(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Available News Sources</DialogTitle>
              <DialogDescription>
                {availableNews.available} available to seed, {availableNews.existing} already exist
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {availableNews.sources?.map((s: any, i: number) => (
                <div key={i} className="text-sm p-2 border rounded">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground ml-2">({s.type})</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid grid-cols-7 mb-8">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="external">External Sources</TabsTrigger>
            <TabsTrigger value="satellite">Satellite Imagery</TabsTrigger>
            <TabsTrigger value="sensors">Sensor Networks</TabsTrigger>
            <TabsTrigger value="community">Community Reports</TabsTrigger>
            <TabsTrigger value="surveys">Structured Surveys</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Report an Incident</CardTitle>
                  <CardDescription>
                    Submit a new incident or risk observation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Incident Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief title of the incident" {...field} />
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
                                placeholder="Provide details about the incident" 
                                className="min-h-32"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Town, District, Region" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="severity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Severity Level</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select severity level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="sourceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source (Optional)</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                if (value === "none") field.onChange(undefined);
                                else field.onChange(parseInt(value));
                              }}
                              defaultValue={field.value != null ? String(field.value) : "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select source (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {(sources || []).map((s) => (
                                  <SelectItem key={s.id} value={String(s.id)}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="actorType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Actor Type</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select actor type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="state">State Actor</SelectItem>
                                  <SelectItem value="non-state">Non-State Actor</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="actorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Actor Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter actor name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full md:w-auto"
                        disabled={reportIncidentMutation.isPending}
                      >
                        {reportIncidentMutation.isPending ? "Submitting..." : "Submit Report"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reporting Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <FileText className="h-5 w-5 mr-2 text-primary" />
                        <span>Be specific and factual in your description</span>
                      </li>
                      <li className="flex items-start">
                        <FileText className="h-5 w-5 mr-2 text-primary" />
                        <span>Include time and exact location when possible</span>
                      </li>
                      <li className="flex items-start">
                        <FileText className="h-5 w-5 mr-2 text-primary" />
                        <span>Indicate the number of people affected</span>
                      </li>
                      <li className="flex items-start">
                        <FileText className="h-5 w-5 mr-2 text-primary" />
                        <span>Report objectively, avoid assumptions</span>
                      </li>
                      <li className="flex items-start">
                        <FileText className="h-5 w-5 mr-2 text-primary" />
                        <span>Specify sources of information if applicable</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Your Recent Reports</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-neutral-500">You have not submitted any reports recently</p>
                    <Button variant="link" className="px-0 text-primary">View your report history</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="upload">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Data Files</CardTitle>
                  <CardDescription>
                    Import structured data from files (CSV, JSON)
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div
                    className="border-2 border-dashed border-neutral-200 rounded-lg p-8 text-center w-full cursor-pointer hover:border-primary/50 hover:bg-accent/5 transition-colors"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Drag & Drop Files Here</h3>
                    <p className="text-neutral-500 text-sm mb-6">or</p>
                    <Button type="button" disabled={fileImportMutation.isPending}>
                      {fileImportMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Browse Files
                    </Button>
                    <p className="text-neutral-400 text-xs mt-4">
                      Supported formats: CSV, JSON (first row = headers for CSV)
                    </p>
                  </div>
                  
                  <div className="w-full mt-6">
                    <h4 className="text-sm font-medium mb-2">Recent Uploads</h4>
                    <div className="border rounded p-4 text-sm">
                      {recentImports.length === 0 ? (
                        <span className="text-neutral-500">No recent uploads</span>
                      ) : (
                        <ul className="space-y-2">
                          {recentImports.map((r, i) => (
                            <li key={i} className="flex justify-between">
                              <span>{r.filename}</span>
                              <span>{r.imported} imported{r.errors > 0 ? ` (${r.errors} errors)` : ""}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Structured Surveys</CardTitle>
                  <CardDescription>
                    Create and manage structured data collection forms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Available Survey Templates</h3>
                      <div className="space-y-3">
                        <div className="flex items-center p-3 border rounded-md">
                          <div className="h-8 w-8 flex items-center justify-center bg-primary/10 text-primary rounded-full mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Community Situation Awareness</h4>
                            <p className="text-xs text-neutral-500">General conflict indicators and observations</p>
                          </div>
                          <Button variant="outline" size="sm">Use</Button>
                        </div>
                        
                        <div className="flex items-center p-3 border rounded-md">
                          <div className="h-8 w-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"></path><path d="M8 2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3"></path><path d="M18 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"></path><path d="M10 2v4"></path><path d="M2 10h4"></path><path d="M5 18l2-2"></path></svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Displacement Assessment</h4>
                            <p className="text-xs text-neutral-500">Survey for displaced populations and camp conditions</p>
                          </div>
                          <Button variant="outline" size="sm">Use</Button>
                        </div>
                        
                        <div className="flex items-center p-3 border rounded-md">
                          <div className="h-8 w-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">Conflict Incident Report</h4>
                            <p className="text-xs text-neutral-500">Detailed form for conflict incident documentation</p>
                          </div>
                          <Button variant="outline" size="sm">Use</Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-medium mb-2">Active Data Collection Campaigns</h3>
                      <div className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Monthly Security Assessment</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                        </div>
                        <div className="text-xs text-neutral-500 mb-3">
                          <p>Started: April 10, 2025</p>
                          <p>Responses: 24</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="text-xs">View Data</Button>
                          <Button size="sm" variant="outline" className="text-xs">Edit Form</Button>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="w-full">Create New Survey</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="external">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>External Data Sources</CardTitle>
                  <CardDescription>
                    Configure connections to external data providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* News Aggregation API */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <Database className="h-8 w-8 text-primary mr-4" />
                      <div>
                        <h3 className="font-medium">News Aggregation API</h3>
                        <p className="text-sm text-neutral-500">Collect data from news sources</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "News Aggregation API",
                            type: "news_media",
                            description: "Collect and process news articles from major Nigerian outlets",
                            apiEndpoint: "https://newsapi.org/v2/top-headlines",
                            region: "Nigeria",
                            frequency: "hourly",
                            dataFormat: "json"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                    
                    {/* Social Media Monitor */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <Database className="h-8 w-8 text-primary mr-4" />
                      <div>
                        <h3 className="font-medium">Social Media Monitor</h3>
                        <p className="text-sm text-neutral-500">Track social media activity</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Social Media Monitor",
                            type: "social_media",
                            description: "Track social media activity related to conflicts in Nigeria",
                            apiEndpoint: "https://api.social-monitor.com/stream",
                            region: "Nigeria",
                            frequency: "real-time",
                            dataFormat: "json"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                    
                    {/* Government Reports */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Government Reports</h3>
                        <p className="text-sm text-neutral-500">Official situation reports and assessments</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Government Reports",
                            type: "government_report",
                            description: "Automated collection of official reports from government agencies",
                            apiEndpoint: "https://api.reports-portal.gov.ng",
                            region: "Nigeria",
                            frequency: "daily",
                            dataFormat: "json"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                    
                    {/* NGO Reports */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">NGO Reports</h3>
                        <p className="text-sm text-neutral-500">Reports from humanitarian organizations</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "NGO Reports",
                            type: "ngo_report",
                            description: "Collection of situation reports from NGOs operating in Nigeria",
                            apiEndpoint: "https://api.ngo-portal.org/feeds",
                            region: "Nigeria",
                            frequency: "daily",
                            dataFormat: "json"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                    
                    {/* Satellite Imagery */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <Database className="h-8 w-8 text-primary mr-4" />
                      <div>
                        <h3 className="font-medium">Satellite Imagery</h3>
                        <p className="text-sm text-neutral-500">Imagery and geographic data</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Satellite Imagery",
                            type: "satellite",
                            description: "Satellite imagery for monitoring infrastructure, movements, and environmental changes",
                            apiEndpoint: "https://api.satellite-data.com/v1/imagery",
                            region: "Nigeria",
                            frequency: "daily",
                            dataFormat: "geojson"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="link" 
                    className="mt-4"
                    onClick={() => {
                      setCurrentSource({
                        id: 0,
                        name: "",
                        type: "",
                        description: "",
                        apiEndpoint: "",
                        region: "Nigeria",
                        frequency: "",
                        dataFormat: ""
                      });
                      setConfigureDialogOpen(true);
                    }}
                  >
                    + Add new data source
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Data Source Status</CardTitle>
                    <CardDescription>
                      Monitor the health and activity of your data connections
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {user?.role === "admin" && (
                      <>
                        <Button 
                          variant="outline"
                          onClick={seedNewsSources}
                          disabled={seedingNews}
                        >
                          <Radio className="h-4 w-4 mr-2" />
                          {seedingNews ? "Seeding..." : "Seed News Sources"}
                        </Button>
                        <Button variant="outline" onClick={fetchAvailableNews}>
                          Available Sources
                        </Button>
                        <Button variant="outline" onClick={refreshNewsSources}>
                          Refresh Sources
                        </Button>
                      </>
                    )}
                    <Button 
                      onClick={fetchFromAllSources}
                      disabled={fetchingData}
                    >
                      {fetchingData ? (
                        <>
                          <span className="animate-spin mr-2">⊝</span>
                          Collecting...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 mr-2" />
                          Collect Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Data Processing Status */}
                  {processingStats && (
                    <div className="mb-6 p-4 border border-border rounded-md bg-card">
                      <h4 className="text-md font-medium mb-2">Data Processing Status</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Processed</span>
                            <span className="text-sm">{processingStats.processed} / {processingStats.total}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ 
                                width: `${processingStats.total ? (processingStats.processed / processingStats.total) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                        
                        {processingStats.errors > 0 && (
                          <div>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">Errors</span>
                              <span className="text-sm text-destructive">{processingStats.errors} / {processingStats.total}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-destructive rounded-full" 
                                style={{ 
                                  width: `${processingStats.total ? (processingStats.errors / processingStats.total) * 100 : 0}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{processingStats.unprocessed} items remaining</span>
                          {pollingInterval && <span>Processing data...</span>}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-8">
                    {isLoadingSources ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                      </div>
                    ) : sources && sources.length > 0 ? (
                      sources.map((source) => (
                        <div key={source.id} className="border rounded-md p-3 hover:bg-accent/5">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">{source.name}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${
                                source.status === 'active' ? 'text-success' : 
                                source.status === 'degraded' ? 'text-warning' : 'text-error'
                              }`}>
                                {capitalizeFirstLetter(source.status)}
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={source.status !== 'active' || fetchingData}
                                onClick={() => fetchFromSource(source.id)}
                              >
                                {fetchingData ? (
                                  <span className="animate-spin">⊝</span>
                                ) : (
                                  <Database className="h-3 w-3" />
                                )}
                                <span className="ml-1 text-xs">Fetch</span>
                              </Button>
                            </div>
                          </div>
                          <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              source.status === 'active' ? 'bg-success w-4/5' : 
                              source.status === 'degraded' ? 'bg-warning w-1/2' : 'bg-error w-1/5'
                            }`}></div>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-neutral-500">
                              Last updated: {formatDate(source.lastUpdated)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Type: {formatSourceType(source.type)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-neutral-500">No configured data sources</p>
                        <p className="text-sm text-neutral-400">Configure a data source to start collecting data</p>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="mt-6 w-full"
                    onClick={handleRefresh}
                    disabled={refetchLoading}
                  >
                    {refetchLoading ? (
                      <>
                        <span className="animate-spin mr-2">⊝</span>
                        Refreshing...
                      </>
                    ) : "Refresh Data Sources"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="sensors">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sensor Networks</CardTitle>
                  <CardDescription>
                    Configure IoT and sensor network data sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Weather Sensors */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 flex items-center justify-center bg-amber-100 text-amber-700 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13.7A4 4 0 1 0 12 8V4a2 2 0 0 0-4 0v8.7"/><line x1="8" y1="9" x2="8" y2="9"/><line x1="8" y1="13" x2="8" y2="13"/><line x1="16" y1="13" x2="16" y2="13"/><line x1="16" y1="17" x2="16" y2="17"/><line x1="12" y1="17" x2="12" y2="17"/></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Weather Sensor Network</h3>
                        <p className="text-sm text-neutral-500">Precipitation, temperature, and humidity sensors</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Weather Sensor Network",
                            type: "sensor_network",
                            description: "Network of weather sensors in high-risk regions",
                            apiEndpoint: "https://api.weathersensors.ng/data",
                            region: "Nigeria",
                            frequency: "real-time",
                            dataFormat: "json"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>

                    {/* Seismic Sensors */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 flex items-center justify-center bg-red-100 text-red-700 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Seismic Monitoring Network</h3>
                        <p className="text-sm text-neutral-500">Ground movement and vibration detection</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Seismic Monitoring Network",
                            type: "sensor_network",
                            description: "Network of seismic sensors for ground movement detection",
                            apiEndpoint: "https://api.seismic-monitor.org/nigeria",
                            region: "Nigeria",
                            frequency: "real-time",
                            dataFormat: "json"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>

                    {/* Water Level Sensors */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22a8 8 0 0 0 8-8c0-5-8-13-8-13S4 9 4 14a8 8 0 0 0 8 8"/></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Water Level Monitors</h3>
                        <p className="text-sm text-neutral-500">River and flood detection sensors</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Water Level Monitors",
                            type: "sensor_network",
                            description: "Network of water level sensors in flood-prone areas",
                            apiEndpoint: "https://api.water-monitor.ng/levels",
                            region: "Nigeria",
                            frequency: "real-time",
                            dataFormat: "json"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sensor Data Dashboard</CardTitle>
                  <CardDescription>
                    Real-time monitoring of sensor network data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Network Status</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="border rounded-md p-3">
                          <div className="flex items-center mb-2">
                            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                            <span className="text-sm font-medium">Active Sensors</span>
                          </div>
                          <p className="text-2xl font-bold">42</p>
                          <p className="text-xs text-neutral-500">Last update: 5 min ago</p>
                        </div>
                        
                        <div className="border rounded-md p-3">
                          <div className="flex items-center mb-2">
                            <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                            <span className="text-sm font-medium">Offline Sensors</span>
                          </div>
                          <p className="text-2xl font-bold">3</p>
                          <p className="text-xs text-neutral-500">4 in maintenance mode</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Recent Alerts</h3>
                      <div className="space-y-2">
                        <div className="flex items-center p-2 rounded-md border border-amber-200 bg-amber-50">
                          <div className="h-6 w-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium">Rising Water Levels</p>
                            <p className="text-xs text-neutral-600">3 sensors in Lagos region - 2 hours ago</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Data Streams</h3>
                      <div className="border rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Real-time data processing</span>
                          <Badge variant="outline" className="bg-green-50">Active</Badge>
                        </div>
                        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{width: '65%'}}></div>
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span>Processing rate: 65%</span>
                          <span>42 sensors</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="w-full">View All Sensors</Button>
                      <Button className="w-full">View Alerts</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="satellite">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Satellite Imagery Sources</CardTitle>
                  <CardDescription>
                    Configure satellite and remote sensing data feeds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sentinel-2 */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="9.17" y1="14.83" x2="4.93" y2="19.07"/></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Sentinel-2 Imagery</h3>
                        <p className="text-sm text-neutral-500">10m resolution multispectral imagery</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Sentinel-2 Imagery",
                            type: "satellite",
                            description: "European Space Agency Sentinel-2 satellite imagery",
                            apiEndpoint: "https://scihub.copernicus.eu/dhus",
                            region: "Nigeria",
                            frequency: "daily",
                            dataFormat: "geojson"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>

                    {/* Landsat */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 flex items-center justify-center bg-green-100 text-green-700 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Landsat 8/9</h3>
                        <p className="text-sm text-neutral-500">30m resolution multispectral imagery</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Landsat 8/9",
                            type: "satellite",
                            description: "USGS/NASA Landsat 8/9 satellite imagery",
                            apiEndpoint: "https://earthexplorer.usgs.gov/",
                            region: "Nigeria",
                            frequency: "daily",
                            dataFormat: "geojson"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>

                    {/* Planet */}
                    <div className="flex items-center p-3 rounded-md border border-neutral-200 bg-neutral-50">
                      <div className="h-8 w-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-full mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                      </div>
                      <div>
                        <h3 className="font-medium">Planet Imagery</h3>
                        <p className="text-sm text-neutral-500">3-5m resolution daily imagery</p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="ml-auto"
                        onClick={() => {
                          setCurrentSource({
                            id: 0,
                            name: "Planet Imagery",
                            type: "satellite",
                            description: "Planet Labs high-resolution daily satellite imagery",
                            apiEndpoint: "https://api.planet.com/",
                            region: "Nigeria",
                            frequency: "daily",
                            dataFormat: "geojson"
                          });
                          setConfigureDialogOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Satellite Data Analysis</CardTitle>
                  <CardDescription>
                    Process and analyze satellite imagery for early warning indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Available Analysis Tools</h3>
                      <div className="space-y-2">
                        <div className="flex items-center p-2 rounded-md border border-neutral-200">
                          <div className="h-6 w-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/></svg>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium">Population Displacement Detection</p>
                            <p className="text-xs text-neutral-500">Detects changes in settlement patterns using temporal analysis</p>
                          </div>
                        </div>

                        <div className="flex items-center p-2 rounded-md border border-neutral-200">
                          <div className="h-6 w-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2h8l4 10-4 10H8L4 12z"/></svg>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium">Infrastructure Damage Assessment</p>
                            <p className="text-xs text-neutral-500">Identifies damaged infrastructure in conflict zones</p>
                          </div>
                        </div>

                        <div className="flex items-center p-2 rounded-md border border-neutral-200">
                          <div className="h-6 w-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium">Crop Health Monitoring</p>
                            <p className="text-xs text-neutral-500">Monitors agricultural activity for food security indicators</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium mb-2">Recent Processing Jobs</h3>
                      <div className="text-xs text-neutral-500 italic">No recent processing jobs</div>
                    </div>
                    
                    <Button className="w-full">Run Analysis</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="community">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Community Engagement Channels</CardTitle>
                  <CardDescription>
                    Configure communication channels for community data collection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">SMS Data Collection</h3>
                      <p className="text-sm text-neutral-600 mb-4">
                        Configure SMS-based reporting for community members without internet access.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <Radio className="h-5 w-5 text-primary mr-2" />
                          <span className="text-sm font-medium">SMS Number:</span>
                          <span className="text-sm ml-2">+2348123456789</span>
                          <Button variant="ghost" size="sm" className="ml-auto">Edit</Button>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-2">SMS Format Template:</p>
                          <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 text-sm font-mono">
                            REPORT [Location] [Type] [Description]
                          </div>
                        </div>
                        
                        <div className="border rounded-md p-3">
                          <h4 className="font-medium mb-2">SMS Gateway Configuration</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Gateway Type:</p>
                                <p className="text-sm text-muted-foreground">Twilio SMS</p>
                              </div>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Active
                              </Badge>
                            </div>
                            
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">Fallback Gateway:</p>
                                <p className="text-sm text-muted-foreground">Clickatell</p>
                              </div>
                              <Badge variant="outline" className="bg-neutral-50 text-neutral-700 border-neutral-200">
                                Standby
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="mt-4 w-full">Test SMS Gateway</Button>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">USSD Service</h3>
                      <p className="text-sm text-neutral-600 mb-4">
                        Configure USSD service for feature phone users in remote areas.
                      </p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div className="h-5 w-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                          </div>
                          <span className="text-sm font-medium">USSD Code:</span>
                          <span className="text-sm ml-2">*347*1#</span>
                          <Button variant="ghost" size="sm" className="ml-auto">Edit</Button>
                        </div>
                        
                        <div className="border rounded-md p-3">
                          <h4 className="font-medium mb-2">USSD Menu Structure</h4>
                          <div className="space-y-2 text-sm">
                            <p>1. Report Incident</p>
                            <p>2. Check Alert Status</p>
                            <p>3. Request Assistance</p>
                            <p>4. Register as Informant</p>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded-md text-sm">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mr-2"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                            <span>USSD service is available on all major Nigerian carriers</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Community Informants</CardTitle>
                    <CardDescription>
                      Manage network of verified community reporters
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border rounded-md p-3 mb-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Registered Informants</h4>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">47 Active</Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="border rounded p-2 text-center">
                            <p className="text-xl font-bold">12</p>
                            <p className="text-xs text-neutral-500">North Central</p>
                          </div>
                          <div className="border rounded p-2 text-center">
                            <p className="text-xl font-bold">9</p>
                            <p className="text-xs text-neutral-500">North East</p>
                          </div>
                          <div className="border rounded p-2 text-center">
                            <p className="text-xl font-bold">7</p>
                            <p className="text-xs text-neutral-500">North West</p>
                          </div>
                          <div className="border rounded p-2 text-center">
                            <p className="text-xl font-bold">6</p>
                            <p className="text-xs text-neutral-500">South East</p>
                          </div>
                          <div className="border rounded p-2 text-center">
                            <p className="text-xl font-bold">8</p>
                            <p className="text-xs text-neutral-500">South South</p>
                          </div>
                          <div className="border rounded p-2 text-center">
                            <p className="text-xl font-bold">5</p>
                            <p className="text-xs text-neutral-500">South West</p>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="flex-1">Manage Informants</Button>
                          <Button size="sm" className="flex-1">Add New</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Community Report Verification</CardTitle>
                    <CardDescription>
                      Validate and process community-sourced information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <h4 className="font-medium mb-2">Recent Reports</h4>
                      <div className="space-y-2">
                        <div className="border rounded-md p-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">Armed Group Movement</p>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High</Badge>
                          </div>
                          <p className="text-xs text-neutral-600 mb-1">Gwoza, Borno State - 2 hours ago</p>
                          <p className="text-xs text-neutral-500">Submitted by: Field Informant #23</p>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">Reject</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600">Flag</Button>
                            <Button size="sm" className="h-7 px-2 text-xs">Verify</Button>
                          </div>
                        </div>
                        
                        <div className="border rounded-md p-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">Market Disruption</p>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Medium</Badge>
                          </div>
                          <p className="text-xs text-neutral-600 mb-1">Kano Municipal - 6 hours ago</p>
                          <p className="text-xs text-neutral-500">Submitted by: Field Informant #08</p>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">Reject</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600">Flag</Button>
                            <Button size="sm" className="h-7 px-2 text-xs">Verify</Button>
                          </div>
                        </div>
                        
                        <div className="border rounded-md p-2">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">Road Blockage</p>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Medium</Badge>
                          </div>
                          <p className="text-xs text-neutral-600 mb-1">Ife-Ibadan Highway - 8 hours ago</p>
                          <p className="text-xs text-neutral-500">Submitted by: Field Informant #35</p>
                          <div className="flex justify-end mt-2">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">Reject</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-amber-600">Flag</Button>
                            <Button size="sm" className="h-7 px-2 text-xs">Verify</Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between mt-4">
                        <Button variant="link" className="px-0">View all reports</Button>
                        <Badge variant="outline">85% Verification Rate</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="surveys">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Structured Survey Management</CardTitle>
                  <CardDescription>
                    Design and distribute standardized surveys to collect structured data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Available Surveys</h3>
                      <p className="text-sm text-neutral-600 mb-4">
                        Manage your existing survey templates and standardized forms.
                      </p>
                      
                      <div className="border rounded-md p-4 mb-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Post-Conflict Assessment</p>
                              <p className="text-sm text-neutral-500">24 questions • Last updated 3 days ago</p>
                            </div>
                            <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Community Security Perception</p>
                              <p className="text-sm text-neutral-500">18 questions • Last updated 1 week ago</p>
                            </div>
                            <Badge className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">Farmer-Herder Relations</p>
                              <p className="text-sm text-neutral-500">15 questions • Last updated 2 weeks ago</p>
                            </div>
                            <Badge variant="outline" className="bg-neutral-50 text-neutral-700">Draft</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Survey
                      </Button>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-4">Survey Templates</h3>
                      <p className="text-sm text-neutral-600 mb-4">
                        Create standardized templates for consistent data collection
                      </p>
                      
                      <div className="border rounded-md p-4 mb-4">
                        <h4 className="font-medium mb-2">Available Templates</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded">
                            <div>
                              <p className="font-medium">Conflict Risk Assessment</p>
                              <p className="text-xs text-slate-500">ISO 31000 compliant</p>
                            </div>
                            <Button size="sm" variant="ghost">Use</Button>
                          </div>
                          
                          <div className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded">
                            <div>
                              <p className="font-medium">Community Security Index</p>
                              <p className="text-xs text-slate-500">UN Standards based</p>
                            </div>
                            <Button size="sm" variant="ghost">Use</Button>
                          </div>
                          
                          <div className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded">
                            <div>
                              <p className="font-medium">Post-Crisis Recovery</p>
                              <p className="text-xs text-slate-500">Adaptive framework</p>
                            </div>
                            <Button size="sm" variant="ghost">Use</Button>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full">
                        <Pencil className="h-4 w-4 mr-2" />
                        Create Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Survey Distribution & Responses</CardTitle>
                    <CardDescription>
                      Track and analyze responses from distributed surveys
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">Post-Conflict Assessment</p>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">128 Responses</Badge>
                        </div>
                        <div className="h-2 bg-blue-100 rounded-full mt-2">
                          <div className="h-2 bg-blue-500 rounded-full w-3/4"></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <p className="text-xs text-neutral-500">Target: 150 responses</p>
                          <p className="text-xs font-medium">85%</p>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">Community Security Perception</p>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">76 Responses</Badge>
                        </div>
                        <div className="h-2 bg-blue-100 rounded-full mt-2">
                          <div className="h-2 bg-blue-500 rounded-full w-1/2"></div>
                        </div>
                        <div className="flex justify-between mt-1">
                          <p className="text-xs text-neutral-500">Target: 150 responses</p>
                          <p className="text-xs font-medium">51%</p>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium mb-2">Distribution Channels</h4>
                        <div className="space-y-2">
                          <div className="flex items-center p-2 bg-slate-50 rounded">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">SMS Survey Distribution</p>
                              <p className="text-xs">32 surveys sent today</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center p-2 bg-slate-50 rounded">
                            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">WhatsApp Distribution</p>
                              <p className="text-xs">18 surveys sent today</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center p-2 bg-slate-50 rounded">
                            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-3">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">USSD Survey Distribution</p>
                              <p className="text-xs">45 surveys sent today</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Survey Analytics</CardTitle>
                    <CardDescription>
                      Analyze and visualize standardized survey data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md p-4 mb-4">
                      <h4 className="font-medium mb-2">Recent Submissions</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <p>Post-Conflict Assessment</p>
                          <p className="text-neutral-500">5 minutes ago</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <p>Community Security Perception</p>
                          <p className="text-neutral-500">25 minutes ago</p>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <p>Post-Conflict Assessment</p>
                          <p className="text-neutral-500">42 minutes ago</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">Data Visualization Options</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-auto py-2 justify-start">
                          <BarChart3 className="h-5 w-5 mr-2" />
                          <div className="text-left">
                            <p className="text-sm">Charts</p>
                            <p className="text-xs text-muted-foreground">Bar, line, pie charts</p>
                          </div>
                        </Button>
                        
                        <Button variant="outline" className="h-auto py-2 justify-start">
                          <MapIcon className="h-5 w-5 mr-2" />
                          <div className="text-left">
                            <p className="text-sm">Maps</p>
                            <p className="text-xs text-muted-foreground">Geospatial analysis</p>
                          </div>
                        </Button>
                        
                        <Button variant="outline" className="h-auto py-2 justify-start">
                          <Table className="h-5 w-5 mr-2" />
                          <div className="text-left">
                            <p className="text-sm">Tables</p>
                            <p className="text-xs text-muted-foreground">Tabular data format</p>
                          </div>
                        </Button>
                        
                        <Button variant="outline" className="h-auto py-2 justify-start">
                          <FileText className="h-5 w-5 mr-2" />
                          <div className="text-left">
                            <p className="text-sm">Reports</p>
                            <p className="text-xs text-muted-foreground">PDF/Excel exports</p>
                          </div>
                        </Button>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analyze Survey Data
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
