import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Users, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SmsLog {
  id: number;
  recipient: string;
  message: string;
  status: string;
  sentAt: string;
}

interface SmsTemplate {
  id: number;
  name: string;
  content: string;
}

export default function SmsPage() {
  const { toast } = useToast();
  const [smsText, setSmsText] = useState("");
  const [recipient, setRecipient] = useState("");
  const [selectedTab, setSelectedTab] = useState("compose");
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);

  // Fetch logs and templates from API
  const { data: logs = [], isLoading: logsLoading } = useQuery<SmsLog[]>({
    queryKey: ["/api/sms/logs"],
    queryFn: async () => {
      const res = await fetch("/api/sms/logs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms/templates"],
    queryFn: async () => {
      const res = await fetch("/api/sms/templates", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { to: string; body: string }) => {
      const res = await apiRequest("POST", "/api/integration/sms/send", data);
      return res.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: "SMS Sent", description: "Your message has been sent successfully." });
        setRecipient("");
        setSmsText("");
        queryClient.invalidateQueries({ queryKey: ["/api/sms/logs"] });
      } else {
        toast({ title: "SMS Failed", description: result.error || "Failed to send.", variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "SMS Failed", description: error.message, variant: "destructive" });
    },
  });

  // Set active tab based on URL
  const location = window.location.pathname;
  useEffect(() => {
    if (location.includes("/compose")) setSelectedTab("compose");
    else if (location.includes("/templates")) setSelectedTab("templates");
    else if (location.includes("/logs")) setSelectedTab("logs");
  }, [location]);

  const handleSelectTemplate = (template: SmsTemplate) => {
    setSelectedTemplate(template);
    setSmsText(template.content);
  };

  const handleSendSms = () => {
    if (!recipient || !smsText) {
      toast({
        title: "Missing Information",
        description: "Please provide both recipient phone number and message content.",
        variant: "destructive",
      });
      return;
    }
    sendSmsMutation.mutate({ to: recipient, body: smsText });
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <MainLayout title="SMS Management">
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">SMS Management</h1>

      <Tabs defaultValue="compose" value={selectedTab} onValueChange={setSelectedTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">Compose SMS</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Message Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Compose SMS
              </CardTitle>
              <CardDescription>
                Send SMS messages to individuals or groups for alerts, notifications and updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Phone Number</Label>
                <Input
                  id="recipient"
                  placeholder="+234 Phone Number"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Include country code (e.g., +234 for Nigeria)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  rows={5}
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                />
                <div className="flex justify-between">
                  <p className="text-sm text-muted-foreground">
                    <span className={smsText.length > 160 ? "text-red-500" : ""}>
                      {smsText.length} characters
                    </span>
                    {smsText.length > 160 && " (multiple SMS will be sent)"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTab("templates")}
                  >
                    Use Template
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => { setSmsText(""); setRecipient(""); }}>
                Clear
              </Button>
              <Button
                onClick={handleSendSms}
                disabled={sendSmsMutation.isPending}
              >
                {sendSmsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send SMS
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>SMS Templates</CardTitle>
              <CardDescription>
                Standard message templates for common scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border rounded-lg hover:bg-blue-50 cursor-pointer"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="font-medium mb-1">{template.name}</div>
                      <div className="text-sm text-gray-600">{template.content}</div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTemplate(template);
                            setSelectedTab("compose");
                          }}
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedTab("compose")}
              >
                Return to Compose
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>SMS Logs</CardTitle>
              <CardDescription>
                History of sent messages and their delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of recent SMS messages sent through the system.</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No SMS messages sent yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.recipient}</TableCell>
                          <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                          <TableCell>
                            {log.status === "delivered" && (
                              <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Delivered
                              </Badge>
                            )}
                            {log.status === "failed" && (
                              <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                            {log.status === "pending" && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-600 hover:bg-yellow-50">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {!["delivered", "failed", "pending"].includes(log.status) && (
                              <Badge variant="outline">{log.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatTimestamp(log.sentAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </MainLayout>
  );
}
