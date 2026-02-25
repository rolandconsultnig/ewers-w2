import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  RefreshCw,
  MessageSquare,
  Send,
  PhoneCall,
  Phone,
  Twitter,
  Facebook,
  Instagram,
  Globe,
  Check,
  X,
  AlertCircle,
  Settings,
  RocketIcon,
  Clock,
  Key
} from "lucide-react";
import { SiTwilio, SiFacebook, SiInstagram, SiWhatsapp } from "react-icons/si";
import { SiX } from "react-icons/si"; // Formerly Twitter, now X

// Integration form schema
const integrationTestSchema = z.object({
  service: z.enum(['twilio_sms', 'twilio_whatsapp', 'twitter', 'facebook', 'instagram']),
  recipient: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
  mediaUrl: z.string().url().optional(),
});

type IntegrationTest = z.infer<typeof integrationTestSchema>;

const webhookEvents = ["alert_created", "incident_reported", "response_plan_activated"];

function ApiKeysTab() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["read"]);
  const { data: apiKeys = [], refetch } = useQuery({
    queryKey: ["/api/integration/api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/integration/api-keys", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integration/api-keys", { name, permissions });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "API key created", description: `Key: ${data.key?.slice(0, 12)}... (copy now, it won't be shown again)` });
      setName("");
      refetch();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/integration/api-keys/${id}`);
    },
    onSuccess: () => { toast({ title: "API key deleted" }); refetch(); },
  });
  const togglePerm = (p: string) => {
    setPermissions((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription>Create and manage API keys for external access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Key" />
          </div>
          <div>
            <Label>Permissions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["read", "write", "admin"].map((p) => (
                <Button key={p} type="button" variant={permissions.includes(p) ? "default" : "outline"} size="sm" onClick={() => togglePerm(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!name || permissions.length === 0 || createMutation.isPending}>
            Create API Key
          </Button>
        </div>
        <div>
          <h4 className="font-medium mb-2">Your API Keys</h4>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet</p>
          ) : (
            <ul className="space-y-2">
              {apiKeys.map((k: { id: number; name: string; key?: string; permissions: string[]; expiresAt?: string }) => (
                <li key={k.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{k.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {k.key ? `${k.key.slice(0, 12)}...` : "••••••••••••"} • {k.permissions?.join(", ")}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(k.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WebhooksTab() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const { data: webhooks = [], refetch } = useQuery({
    queryKey: ["/api/integration/webhooks"],
    queryFn: async () => {
      const res = await fetch("/api/integration/webhooks", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integration/webhooks", { name, url, events });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Webhook created" });
      setName(""); setUrl(""); setEvents([]);
      refetch();
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/integration/webhooks/${id}`);
    },
    onSuccess: () => { toast({ title: "Webhook deleted" }); refetch(); },
  });
  const toggleEvent = (e: string) => {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhooks</CardTitle>
        <CardDescription>Notify external systems when events occur</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Webhook" />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <Label>Events</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {webhookEvents.map((e) => (
                <Button key={e} type="button" variant={events.includes(e) ? "default" : "outline"} size="sm" onClick={() => toggleEvent(e)}>
                  {e.replace(/_/g, " ")}
                </Button>
              ))}
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!name || !url || events.length === 0 || createMutation.isPending}>
            Add Webhook
          </Button>
        </div>
        <div>
          <h4 className="font-medium mb-2">Configured Webhooks</h4>
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks yet</p>
          ) : (
            <ul className="space-y-2">
              {webhooks.map((w: { id: number; name: string; url: string; events: string[] }) => (
                <li key={w.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{w.name}</span>
                    <p className="text-xs text-muted-foreground">{w.url}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(w.id)}>Delete</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface IntegrationStatus {
  configured: boolean;
  missingVars: string[];
}

interface AllIntegrationsStatus {
  twilio: IntegrationStatus;
  twitter: IntegrationStatus;
  facebook: IntegrationStatus;
  instagram: IntegrationStatus;
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("twilio");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [currentService, setCurrentService] = useState<string | null>(null);

  // Fetch integration status - using public endpoint for initial load
  const { 
    data: integrationStatus,
    isLoading: isLoadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<AllIntegrationsStatus>({
    queryKey: ['/api/integration/status/public'],
    // Retry configuration for better error handling
    retry: 2,
    retryDelay: 1000,
  });
  
  // Form for testing integrations
  const form = useForm<IntegrationTest>({
    resolver: zodResolver(integrationTestSchema),
    defaultValues: {
      service: 'twilio_sms',
      recipient: '',
      message: '',
      mediaUrl: '',
    },
  });

  // Create test message mutation
  const testIntegrationMutation = useMutation({
    mutationFn: async (data: IntegrationTest) => {
      let endpoint: string;
      
      switch (data.service) {
        case 'twilio_sms':
          endpoint = '/api/integration/sms/send';
          break;
        case 'twilio_whatsapp':
          endpoint = '/api/integration/whatsapp/send';
          break;
        case 'twitter':
          endpoint = '/api/integration/twitter/tweet';
          
          // Format data for Twitter API
          return apiRequest('POST', endpoint, { 
            text: data.message,
            mediaIds: data.mediaUrl ? [data.mediaUrl] : undefined
          });
          
        case 'facebook':
          endpoint = '/api/integration/facebook/post';
          
          // Format data for Facebook API
          return apiRequest('POST', endpoint, { 
            message: data.message,
            link: data.mediaUrl,
          });
          
        case 'instagram':
          endpoint = '/api/integration/instagram/post';
          
          // Format data for Instagram API
          return apiRequest('POST', endpoint, { 
            caption: data.message,
            mediaUrl: data.mediaUrl || 'https://via.placeholder.com/800x800.png',
          });
          
        default:
          throw new Error('Invalid service selected');
      }
      
      // Format for Twilio services
      if (data.service.startsWith('twilio_')) {
        return apiRequest('POST', endpoint, {
          to: data.recipient,
          body: data.message,
          mediaUrl: data.mediaUrl
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Integration Test Successful",
        description: "The message was sent successfully.",
      });
      form.reset();
      setTestDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Integration Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  function onSubmit(data: IntegrationTest) {
    testIntegrationMutation.mutate(data);
  }
  
  // Open dialog for testing a specific service
  const openTestDialog = (service: string) => {
    form.reset({
      service: service as any,
      recipient: '',
      message: `Test message from EWERS @ ${new Date().toLocaleString()}`,
      mediaUrl: '',
    });
    setCurrentService(service);
    setTestDialogOpen(true);
  };
  
  // Helper to format the missing vars for display
  const formatMissingVars = (service: keyof AllIntegrationsStatus) => {
    if (!integrationStatus) return '';
    
    const status = integrationStatus[service];
    return status.missingVars.join(', ');
  };

  return (
    <MainLayout title="Integrations">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Communication Channels & Social Media</h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetchStatus()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>
      
      <Tabs defaultValue="twilio" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="twilio">
            <SiTwilio className="h-4 w-4 mr-2" />
            Twilio (SMS/WhatsApp)
          </TabsTrigger>
          <TabsTrigger value="twitter">
            <SiX className="h-4 w-4 mr-2" />
            Twitter/X
          </TabsTrigger>
          <TabsTrigger value="facebook">
            <SiFacebook className="h-4 w-4 mr-2" />
            Facebook
          </TabsTrigger>
          <TabsTrigger value="instagram">
            <SiInstagram className="h-4 w-4 mr-2" />
            Instagram
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Globe className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Settings className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
        </TabsList>
        
        {/* Twilio Tab */}
        <TabsContent value="twilio">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <SiTwilio className="h-5 w-5 mr-2 text-blue-500" />
                    <CardTitle>SMS Messaging</CardTitle>
                  </div>
                  {isLoadingStatus ? (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-400 animate-pulse" />
                      <span className="text-sm text-gray-400">Checking...</span>
                    </div>
                  ) : integrationStatus?.twilio.configured ? (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-sm text-green-500">Configured</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <X className="h-4 w-4 mr-2 text-red-500" />
                      <span className="text-sm text-red-500">Not Configured</span>
                    </div>
                  )}
                </div>
                <CardDescription>
                  Send SMS messages to citizens and field agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                      {isLoadingStatus ? (
                        <p className="text-gray-500">Checking configuration...</p>
                      ) : statusError ? (
                        <p className="text-red-500">Error checking configuration</p>
                      ) : integrationStatus?.twilio.configured ? (
                        <p className="text-green-700">SMS messaging is configured and ready to use</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-orange-700">SMS messaging is not configured</p>
                          <p className="text-gray-500 text-sm">
                            Missing environment variables: {formatMissingVars('twilio')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => window.open('https://www.twilio.com/docs/sms', '_blank')}
                >
                  Documentation
                </Button>
                <Button 
                  onClick={() => openTestDialog('twilio_sms')}
                  disabled={!integrationStatus?.twilio.configured}
                >
                  Test SMS
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <SiWhatsapp className="h-5 w-5 mr-2 text-green-500" />
                    <CardTitle>WhatsApp Messaging</CardTitle>
                  </div>
                  {isLoadingStatus ? (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-400 animate-pulse" />
                      <span className="text-sm text-gray-400">Checking...</span>
                    </div>
                  ) : integrationStatus?.twilio.configured ? (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-sm text-green-500">Available</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <X className="h-4 w-4 mr-2 text-red-500" />
                      <span className="text-sm text-red-500">Not Available</span>
                    </div>
                  )}
                </div>
                <CardDescription>
                  Send WhatsApp messages via Twilio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                      {isLoadingStatus ? (
                        <p className="text-gray-500">Checking configuration...</p>
                      ) : statusError ? (
                        <p className="text-red-500">Error checking configuration</p>
                      ) : integrationStatus?.twilio.configured ? (
                        <p className="text-green-700">WhatsApp messaging is available through Twilio</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-orange-700">WhatsApp messaging is not configured</p>
                          <p className="text-gray-500 text-sm">
                            Missing environment variables: {formatMissingVars('twilio')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => window.open('https://www.twilio.com/docs/whatsapp', '_blank')}
                >
                  Documentation
                </Button>
                <Button 
                  onClick={() => openTestDialog('twilio_whatsapp')}
                  disabled={!integrationStatus?.twilio.configured}
                >
                  Test WhatsApp
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>SMS/WhatsApp Configuration</CardTitle>
                <CardDescription>
                  Configure Twilio for SMS and WhatsApp messaging
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-2">Required Environment Variables</h3>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                          <div>
                            <span className="font-medium">TWILIO_ACCOUNT_SID</span>
                            <p className="text-gray-500">Your Twilio account identifier</p>
                          </div>
                        </li>
                        <li className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                          <div>
                            <span className="font-medium">TWILIO_AUTH_TOKEN</span>
                            <p className="text-gray-500">Authentication token for your Twilio account</p>
                          </div>
                        </li>
                        <li className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                          <div>
                            <span className="font-medium">TWILIO_PHONE_NUMBER</span>
                            <p className="text-gray-500">Twilio phone number for sending messages</p>
                          </div>
                        </li>
                        <li className="flex items-start">
                          <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                            <Settings className="h-3 w-3" />
                          </div>
                          <div>
                            <span className="font-medium">TWILIO_WHATSAPP_NUMBER (Optional)</span>
                            <p className="text-gray-500">WhatsApp-enabled phone number for WhatsApp messaging</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">Implementation Guide</h3>
                      <ol className="space-y-3 text-sm list-decimal list-inside">
                        <li>Create a Twilio account at <a href="https://www.twilio.com" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">www.twilio.com</a></li>
                        <li>Purchase a phone number with SMS capabilities</li>
                        <li>Find your Account SID and Auth Token in the Twilio Console</li>
                        <li>Add the environment variables to your project</li>
                        <li>For WhatsApp, activate the WhatsApp Business API through Twilio</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open('https://www.twilio.com/try-twilio', '_blank')}
                >
                  Sign Up for Twilio
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Twitter Tab */}
        <TabsContent value="twitter">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <SiX className="h-5 w-5 mr-2 text-blue-400" />
                  <CardTitle>Twitter/X Integration</CardTitle>
                </div>
                {isLoadingStatus ? (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400 animate-pulse" />
                    <span className="text-sm text-gray-400">Checking...</span>
                  </div>
                ) : integrationStatus?.twitter.configured ? (
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm text-green-500">Configured</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <X className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-sm text-red-500">Not Configured</span>
                  </div>
                )}
              </div>
              <CardDescription>
                Post updates and monitor Twitter/X for early warnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                    {isLoadingStatus ? (
                      <p className="text-gray-500">Checking configuration...</p>
                    ) : statusError ? (
                      <p className="text-red-500">Error checking configuration</p>
                    ) : integrationStatus?.twitter.configured ? (
                      <p className="text-green-700">Twitter/X API is configured and ready to use</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-orange-700">Twitter/X API is not configured</p>
                        <p className="text-gray-500 text-sm">
                          Missing environment variables: {formatMissingVars('twitter')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Required Environment Variables</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">TWITTER_API_KEY</span>
                          <p className="text-gray-500">API Key from Twitter/X Developer Portal</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">TWITTER_API_SECRET</span>
                          <p className="text-gray-500">API Secret from Twitter/X Developer Portal</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">TWITTER_ACCESS_TOKEN</span>
                          <p className="text-gray-500">Access token for your Twitter/X account</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">TWITTER_ACCESS_SECRET</span>
                          <p className="text-gray-500">Access token secret for your Twitter/X account</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Features</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Post Alerts & Updates</span>
                          <p className="text-gray-500">Share alerts and updates on Twitter/X</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Monitor Keywords</span>
                          <p className="text-gray-500">Track relevant keywords for early warning</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Geolocation Monitoring</span>
                          <p className="text-gray-500">Monitor Twitter/X activity in specific regions</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={() => openTestDialog('twitter')}
                disabled={!integrationStatus?.twitter.configured}
              >
                Test Twitter/X API
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Facebook Tab */}
        <TabsContent value="facebook">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <SiFacebook className="h-5 w-5 mr-2 text-blue-600" />
                  <CardTitle>Facebook Integration</CardTitle>
                </div>
                {isLoadingStatus ? (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400 animate-pulse" />
                    <span className="text-sm text-gray-400">Checking...</span>
                  </div>
                ) : integrationStatus?.facebook.configured ? (
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm text-green-500">Configured</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <X className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-sm text-red-500">Not Configured</span>
                  </div>
                )}
              </div>
              <CardDescription>
                Post alerts and community outreach on Facebook
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                    {isLoadingStatus ? (
                      <p className="text-gray-500">Checking configuration...</p>
                    ) : statusError ? (
                      <p className="text-red-500">Error checking configuration</p>
                    ) : integrationStatus?.facebook.configured ? (
                      <p className="text-green-700">Facebook API is configured and ready to use</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-orange-700">Facebook API is not configured</p>
                        <p className="text-gray-500 text-sm">
                          Missing environment variables: {formatMissingVars('facebook')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Required Environment Variables</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">FACEBOOK_APP_ID</span>
                          <p className="text-gray-500">App ID from Facebook Developer Portal</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">FACEBOOK_APP_SECRET</span>
                          <p className="text-gray-500">App Secret from Facebook Developer Portal</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">FACEBOOK_ACCESS_TOKEN</span>
                          <p className="text-gray-500">Page or User access token with appropriate permissions</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Features</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Post to Pages</span>
                          <p className="text-gray-500">Share alerts and updates on Facebook Pages</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Post Photos</span>
                          <p className="text-gray-500">Share images related to alerts and incidents</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Search Posts</span>
                          <p className="text-gray-500">Search for relevant posts for monitoring</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={() => openTestDialog('facebook')}
                disabled={!integrationStatus?.facebook.configured}
              >
                Test Facebook API
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Instagram Tab */}
        <TabsContent value="instagram">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <SiInstagram className="h-5 w-5 mr-2 text-pink-600" />
                  <CardTitle>Instagram Integration</CardTitle>
                </div>
                {isLoadingStatus ? (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400 animate-pulse" />
                    <span className="text-sm text-gray-400">Checking...</span>
                  </div>
                ) : integrationStatus?.instagram.configured ? (
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm text-green-500">Configured</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <X className="h-4 w-4 mr-2 text-red-500" />
                    <span className="text-sm text-red-500">Not Configured</span>
                  </div>
                )}
              </div>
              <CardDescription>
                Share visual alerts and monitor Instagram for early warnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200">
                    {isLoadingStatus ? (
                      <p className="text-gray-500">Checking configuration...</p>
                    ) : statusError ? (
                      <p className="text-red-500">Error checking configuration</p>
                    ) : integrationStatus?.instagram.configured ? (
                      <p className="text-green-700">Instagram API is configured and ready to use</p>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-orange-700">Instagram API is not configured</p>
                        <p className="text-gray-500 text-sm">
                          Missing environment variables: {formatMissingVars('instagram')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Required Environment Variables</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">INSTAGRAM_USERNAME</span>
                          <p className="text-gray-500">Instagram account username</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-blue-100 text-blue-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">INSTAGRAM_PASSWORD</span>
                          <p className="text-gray-500">Instagram account password</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Features</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Post Photos</span>
                          <p className="text-gray-500">Share images for alerts and incidents</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Post Stories</span>
                          <p className="text-gray-500">Share temporary stories for immediate alerts</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <div className="bg-green-100 text-green-800 rounded-full p-1 mr-2 mt-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                        <div>
                          <span className="font-medium">Location Search</span>
                          <p className="text-gray-500">Find posts from specific locations</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={() => openTestDialog('instagram')}
                disabled={!integrationStatus?.instagram.configured}
              >
                Test Instagram API
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>
        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>
      </Tabs>
      
      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {currentService === 'twilio_sms' && 'Test SMS Message'}
              {currentService === 'twilio_whatsapp' && 'Test WhatsApp Message'}
              {currentService === 'twitter' && 'Test Twitter Post'}
              {currentService === 'facebook' && 'Test Facebook Post'}
              {currentService === 'instagram' && 'Test Instagram Post'}
            </DialogTitle>
            <DialogDescription>
              {currentService === 'twilio_sms' && 'Send a test SMS message to verify Twilio integration.'}
              {currentService === 'twilio_whatsapp' && 'Send a test WhatsApp message via Twilio.'}
              {currentService === 'twitter' && 'Create a test post on Twitter/X to verify the integration.'}
              {currentService === 'facebook' && 'Create a test post on Facebook to verify the integration.'}
              {currentService === 'instagram' && 'Create a test post on Instagram to verify the integration.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Recipient field for Twilio services */}
              {(currentService === 'twilio_sms' || currentService === 'twilio_whatsapp') && (
                <FormField
                  control={form.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient Phone Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+234xxxxxxxxxx" 
                          {...field} 
                          required
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the phone number in international format (+234...)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Message field for all services */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {(currentService === 'instagram') ? 'Caption' : 'Message'}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your message here..." 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Media URL field */}
              <FormField
                control={form.control}
                name="mediaUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {currentService === 'instagram' ? 'Image URL (Required)' : 
                       currentService === 'facebook' ? 'Link URL (Optional)' : 
                       'Media URL (Optional)'}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/image.jpg" 
                        {...field} 
                        required={currentService === 'instagram'}
                      />
                    </FormControl>
                    <FormDescription>
                      {currentService === 'instagram' ? 
                        'URL to an image to post on Instagram' : 
                        currentService === 'facebook' ? 
                        'URL to include in the Facebook post' : 
                        'URL to media to include with the message'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setTestDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={testIntegrationMutation.isPending}
                >
                  {testIntegrationMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}