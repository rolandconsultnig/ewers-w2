import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@shared/schema';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Bell, 
  Search, 
  Filter, 
  Clock, 
  MessageSquare,
  MapPin, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Smartphone,
  Radio,
  Info,
  CheckCircle,
  X,
  Megaphone,
  CalendarCheck,
  Phone,
  UserCircle2,
  Send
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from '@/components/ui/progress';

export default function AlertsPage() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  
  // Fetch alerts data
  const { 
    data: alerts, 
    isLoading: isLoadingAlerts,
    error: alertsError,
    refetch: refetchAlerts 
  } = useQuery<Alert[]>({
    queryKey: ['/api/alerts'],
  });
  
  const { data: activeAlerts } = useQuery<Alert[]>({
    queryKey: ['/api/alerts/active'],
  });

  const { data: slaStatus } = useQuery({
    queryKey: selectedAlert ? [`/api/enterprise/sla/${selectedAlert.id}`] : ['none'],
    queryFn: async () => {
      if (!selectedAlert) return null;
      const res = await fetch(`/api/enterprise/sla/${selectedAlert.id}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedAlert && respondDialogOpen,
  });

  // Format date for display
  const formatDate = (dateString: Date | string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };
  
  // Filter alerts based on selected criteria
  const filteredAlerts = alerts?.filter(alert => {
    // Apply status filter
    const statusMatch = 
      (selectedTab === 'active' && alert.status === 'active') ||
      (selectedTab === 'resolved' && alert.status === 'resolved') ||
      (selectedTab === 'pending' && alert.status === 'pending') ||
      selectedTab === 'all';
    
    // Apply search filter if search query exists
    const searchMatch = !searchQuery || 
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.description && alert.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Apply source filter if selected
    const sourceMatch = !sourceFilter || alert.source === sourceFilter;
    
    // Apply severity filter if selected
    const severityMatch = !severityFilter || alert.severity === severityFilter;
    
    return statusMatch && searchMatch && sourceMatch && severityMatch;
  });
  
  // Get alert badge color based on severity
  const getAlertBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-100 text-amber-800">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800">Low</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };
  
  // Get source icon based on alert source
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'social_media':
        return <Megaphone className="h-4 w-4 text-purple-500" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'app':
        return <Smartphone className="h-4 w-4 text-indigo-500" />;
      case 'sos':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };
  
  // Handle alert response submission
  const handleAlertResponse = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAlert) return;
    
    // In a real app this would be an API call
    toast({
      title: "Response Logged",
      description: `Response to alert "${selectedAlert.title}" has been recorded.`,
    });
    
    setRespondDialogOpen(false);
    setSelectedAlert(null);
  };
  
  // Get status count by severity
  const getStatusCounts = () => {
    if (!alerts) return { high: 0, medium: 0, low: 0, active: 0, resolved: 0, pending: 0 };
    
    return {
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
      active: alerts.filter(a => a.status === 'active').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      pending: alerts.filter(a => a.status === 'pending').length
    };
  };
  
  const statusCounts = getStatusCounts();
  
  // Check if an alert is an SOS
  const isSOS = (alert: Alert) => {
    return alert.source === 'sos' || alert.severity === 'high';
  };
  
  // Mock IMEI data for SOS alerts
  const getIMEIInfo = (alert: Alert) => {
    if (!isSOS(alert)) return null;
    
    // In a real app, this would come from the database
    return {
      imei: '352099001761481',
      lastLocation: '7.3890, 3.8923',
      signalStrength: '78%',
      batteryLevel: '42%',
      deviceModel: 'Nokia 3310',
      networkProvider: 'MTN Nigeria'
    };
  };

  return (
    <MainLayout title="Alerts & Notifications">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Overview - full width on mobile, 12 columns on large screens */}
        <div className="col-span-1 lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">High Priority</p>
                  <p className="text-3xl font-bold">{statusCounts.high}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(alerts?.filter(a => a.severity === 'high' && a.status === 'active').length || 0)} active
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
                  <p className="text-sm text-gray-500 mb-1">Medium Priority</p>
                  <p className="text-3xl font-bold">{statusCounts.medium}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(alerts?.filter(a => a.severity === 'medium' && a.status === 'active').length || 0)} active
                  </p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <Bell className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Resolved Alerts</p>
                  <p className="text-3xl font-bold">{statusCounts.resolved}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Past 7 days
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Alert Sources</p>
                  <p className="text-3xl font-bold">{alerts?.length || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Across all channels</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Radio className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* SOS & Emergency Alerts Section - 4 columns on large screens */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    SOS Emergency Alerts
                  </CardTitle>
                  <CardDescription>
                    Highest priority messages requiring immediate action
                  </CardDescription>
                </div>
                <Badge className="bg-red-600 hover:bg-red-700">
                  {alerts?.filter(a => isSOS(a) && a.status === 'active').length || 0} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {isLoadingAlerts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !alerts || alerts.filter(a => isSOS(a)).length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 mx-auto mb-4 text-green-500" />
                  <p>No SOS alerts currently active</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {alerts
                      .filter(a => isSOS(a))
                      .sort((a, b) => {
                        // Sort by status (active first) then by severity
                        if (a.status === 'active' && b.status !== 'active') return -1;
                        if (a.status !== 'active' && b.status === 'active') return 1;
                        if (a.severity === 'high' && b.severity !== 'high') return -1;
                        if (a.severity !== 'high' && b.severity === 'high') return 1;
                        return 0;
                      })
                      .map((alert) => {
                        const imeiInfo = getIMEIInfo(alert);
                        return (
                          <Card key={alert.id} className={`
                            p-4 border-l-4 
                            ${alert.status === 'active' ? 'border-l-red-500' : 'border-l-gray-300'}
                          `}>
                            <div className="space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{alert.title}</h4>
                                    {getAlertBadge(alert.severity)}
                                    {alert.status === 'active' && (
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedAlert(alert);
                                    setRespondDialogOpen(true);
                                  }}
                                >
                                  Respond
                                </Button>
                              </div>
                              
                              {imeiInfo && (
                                <div className="bg-red-50 rounded-md p-3 text-sm">
                                  <div className="font-medium mb-2 flex items-center">
                                    <Smartphone className="h-4 w-4 mr-1 text-red-600" />
                                    <span>Device Information</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-y-1 gap-x-4">
                                    <div className="flex items-center text-xs text-gray-700">
                                      <span className="font-medium w-24">IMEI:</span>
                                      <span>{imeiInfo.imei}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-700">
                                      <span className="font-medium w-24">Location:</span>
                                      <span>{imeiInfo.lastLocation}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-700">
                                      <span className="font-medium w-24">Signal:</span>
                                      <span>{imeiInfo.signalStrength}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-700">
                                      <span className="font-medium w-24">Battery:</span>
                                      <span>{imeiInfo.batteryLevel}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-700">
                                      <span className="font-medium w-24">Model:</span>
                                      <span>{imeiInfo.deviceModel}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-700">
                                      <span className="font-medium w-24">Network:</span>
                                      <span>{imeiInfo.networkProvider}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex flex-wrap justify-between text-xs text-muted-foreground">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center">
                                    {getSourceIcon(alert.source)}
                                    <span className="ml-1 capitalize">{alert.source}</span>
                                  </div>
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    <span>{alert.region || 'Nigeria'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  <span>{formatDate(alert.generatedAt)}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Alert Source Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                      <span>SOS Emergency</span>
                    </div>
                    <span className="font-medium">
                      {alerts?.filter(a => a.source === 'sos').length || 0}
                    </span>
                  </div>
                  <Progress 
                    value={alerts && alerts.length > 0 ? 
                      (alerts.filter(a => a.source === 'sos').length / alerts.length) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 text-blue-500 mr-2" />
                      <span>SMS Alerts</span>
                    </div>
                    <span className="font-medium">
                      {alerts?.filter(a => a.source === 'sms').length || 0}
                    </span>
                  </div>
                  <Progress 
                    value={alerts && alerts.length > 0 ? 
                      (alerts.filter(a => a.source === 'sms').length / alerts.length) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <div className="flex items-center">
                      <Megaphone className="h-4 w-4 text-purple-500 mr-2" />
                      <span>Social Media</span>
                    </div>
                    <span className="font-medium">
                      {alerts?.filter(a => a.source === 'social_media').length || 0}
                    </span>
                  </div>
                  <Progress 
                    value={alerts && alerts.length > 0 ? 
                      (alerts.filter(a => a.source === 'social_media').length / alerts.length) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-green-500 mr-2" />
                      <span>Phone Reports</span>
                    </div>
                    <span className="font-medium">
                      {alerts?.filter(a => a.source === 'phone').length || 0}
                    </span>
                  </div>
                  <Progress 
                    value={alerts && alerts.length > 0 ? 
                      (alerts.filter(a => a.source === 'phone').length / alerts.length) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <div className="flex items-center">
                      <Smartphone className="h-4 w-4 text-indigo-500 mr-2" />
                      <span>Mobile App</span>
                    </div>
                    <span className="font-medium">
                      {alerts?.filter(a => a.source === 'app').length || 0}
                    </span>
                  </div>
                  <Progress 
                    value={alerts && alerts.length > 0 ? 
                      (alerts.filter(a => a.source === 'app').length / alerts.length) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Alerts Table - 8 columns on large screens */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle>Alerts & Notifications Dashboard</CardTitle>
                  <CardDescription>
                    Monitor and manage all alerts from various sources
                  </CardDescription>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={() => refetchAlerts()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <div className="p-2 text-sm">
                        <div className="mb-4">
                          <p className="mb-2 font-medium">Source:</p>
                          <div className="grid grid-cols-2 gap-1">
                            <Button 
                              size="sm"
                              variant={sourceFilter === null ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSourceFilter(null)}
                            >
                              All
                            </Button>
                            <Button 
                              size="sm"
                              variant={sourceFilter === 'sms' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSourceFilter('sms')}
                            >
                              SMS
                            </Button>
                            <Button 
                              size="sm"
                              variant={sourceFilter === 'social_media' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSourceFilter('social_media')}
                            >
                              Social
                            </Button>
                            <Button 
                              size="sm"
                              variant={sourceFilter === 'phone' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSourceFilter('phone')}
                            >
                              Phone
                            </Button>
                            <Button 
                              size="sm"
                              variant={sourceFilter === 'app' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSourceFilter('app')}
                            >
                              App
                            </Button>
                            <Button 
                              size="sm"
                              variant={sourceFilter === 'sos' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSourceFilter('sos')}
                            >
                              SOS
                            </Button>
                          </div>
                        </div>
                        
                        <div>
                          <p className="mb-2 font-medium">Severity:</p>
                          <div className="grid grid-cols-3 gap-1">
                            <Button 
                              size="sm"
                              variant={severityFilter === null ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSeverityFilter(null)}
                            >
                              All
                            </Button>
                            <Button 
                              size="sm"
                              variant={severityFilter === 'high' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSeverityFilter('high')}
                            >
                              High
                            </Button>
                            <Button 
                              size="sm"
                              variant={severityFilter === 'medium' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSeverityFilter('medium')}
                            >
                              Medium
                            </Button>
                            <Button 
                              size="sm"
                              variant={severityFilter === 'low' ? "secondary" : "outline"}
                              className="h-8 text-xs"
                              onClick={() => setSeverityFilter('low')}
                            >
                              Low
                            </Button>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <Tabs className="mt-4" value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid grid-cols-4 mb-2">
                  <TabsTrigger value="all">
                    All Alerts
                    <Badge className="ml-2 bg-gray-100 text-gray-800 hover:bg-gray-100">
                      {alerts?.length || 0}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="active">
                    Active
                    <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {statusCounts.active}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending
                    <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {statusCounts.pending}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="resolved">
                    Resolved
                    <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-100">
                      {statusCounts.resolved}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : alertsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                  <p className="font-medium">Failed to load alerts</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    An error occurred while fetching alert data.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => refetchAlerts()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : !filteredAlerts || filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No {selectedTab !== 'all' ? selectedTab : ''} alerts found
                    {sourceFilter ? ` from ${sourceFilter} source` : ''}
                    {severityFilter ? ` with ${severityFilter} severity` : ''}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[350px]">Alert Details</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAlerts.slice(0, 10).map((alert) => (
                        <TableRow key={alert.id} className={
                          isSOS(alert) && alert.status === 'active' ? 'bg-red-50' : ''
                        }>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {alert.title}
                                {isSOS(alert) && alert.status === 'active' && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center mt-1 gap-2">
                                {getAlertBadge(alert.severity)}
                                {alert.category && (
                                  <Badge variant="outline" className="font-normal text-xs">
                                    {alert.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {getSourceIcon(alert.source)}
                              <span className="ml-2 capitalize">{alert.source}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>{alert.region || 'Nigeria'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>{formatDate(alert.generatedAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              alert.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                              alert.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                              'bg-amber-100 text-amber-800'
                            }>
                              {alert.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedAlert(alert);
                                setRespondDialogOpen(true);
                              }}
                            >
                              Respond
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredAlerts?.slice(0, 10).length || 0} of {filteredAlerts?.length || 0} alerts
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled={!filteredAlerts || filteredAlerts.length <= 10}>Next</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* Response Dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Respond to Alert</DialogTitle>
            <DialogDescription>
              {selectedAlert && `Alert ID: ${selectedAlert.id} - ${selectedAlert.title}`}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAlertResponse}>
            <div className="grid gap-4 py-4">
              {selectedAlert && (
                <div className="grid gap-2">
                  <div className="rounded-md bg-amber-50 p-4 text-sm">
                    <div className="flex mb-2">
                      <Info className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-800">Alert Information</p>
                        <p className="mt-1 text-amber-700">{selectedAlert.description}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs">
                          <Badge variant="outline" className="border-amber-200">
                            Severity: {selectedAlert.severity}
                          </Badge>
                          <Badge variant="outline" className="border-amber-200">
                            Source: {selectedAlert.source}
                          </Badge>
                          <Badge variant="outline" className="border-amber-200">
                            Region: {selectedAlert.region || 'Nigeria'}
                          </Badge>
                        </div>
                        {slaStatus && (
                          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
                            <p className="font-medium">SLA Status</p>
                            <p className="text-muted-foreground">
                              {slaStatus.breached ? 'Breached' : 'Within SLA'} • 
                              Elapsed: {slaStatus.elapsedMinutes ?? 0} min
                              {slaStatus.slaMinutes != null && ` / ${slaStatus.slaMinutes} min`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid gap-2">
                <label htmlFor="response-type" className="text-sm font-medium">
                  Response Type
                </label>
                <Select defaultValue="acknowledge">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a response type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acknowledge">Acknowledge</SelectItem>
                    <SelectItem value="assign">Assign to Team</SelectItem>
                    <SelectItem value="escalate">Escalate</SelectItem>
                    <SelectItem value="resolve">Resolve</SelectItem>
                    <SelectItem value="dismiss">Dismiss</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="assigned-to" className="text-sm font-medium">
                  Assign To
                </label>
                <Select defaultValue="emergency-team">
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Response Teams</SelectLabel>
                      <SelectItem value="emergency-team">Emergency Response Team</SelectItem>
                      <SelectItem value="security-team">Security Team</SelectItem>
                      <SelectItem value="medical-team">Medical Team</SelectItem>
                      <SelectItem value="monitoring-team">Monitoring Team</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="response-notes" className="text-sm font-medium">
                  Response Notes
                </label>
                <Textarea
                  id="response-notes"
                  placeholder="Add details about your response..."
                  rows={4}
                />
              </div>
              
              <div className="flex items-center space-x-2 mt-2">
                <Button type="submit" className="flex items-center">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Response
                </Button>
                <Button type="button" variant="outline" onClick={() => setRespondDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}