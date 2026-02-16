import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Filter, ExternalLink, Bell } from "lucide-react";
import { useIncidentData } from "@/hooks/useIncidentData";
import { crisisTypes } from "@/lib/crisis-constants";
import { SocialMediaMonitor } from "@/components/SocialMediaMonitor";
import { SmsMonitor } from "@/components/SmsMonitor";
import { IncidentDetailModal } from "@/components/IncidentDetailModal";
import { useQuery } from "@tanstack/react-query";
import { Alert, Incident } from "@shared/schema";
import { Link } from "wouter";

export default function PeaceTrackerInternalDashboard() {
  const { incidents, openIncidentDetailModal } = useIncidentData();
  const [activeTab, setActiveTab] = useState("notifications");
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent<Incident>) => {
      setSelectedIncident(e.detail);
      setIncidentModalOpen(true);
    };
    window.addEventListener("open-incident-detail", handler as EventListener);
    return () => window.removeEventListener("open-incident-detail", handler as EventListener);
  }, []);

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    staleTime: 60000,
  });

  const unconfirmedReports = incidents.filter((i) => i.status === "active" && i.verificationStatus === "unverified");
  const urgentIncidents = incidents.filter(
    (i) => i.status === "active" && (i.severity === "high" || i.severity === "critical")
  );

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const recentReports = incidents.filter((i) => new Date(i.reportedAt) > oneDayAgo);

  const formatTimeAgo = (dateInput: string | Date) => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    if (diffInMins < 60) return `${diffInMins} min${diffInMins !== 1 ? "s" : ""} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  };

  const getCategoryInfo = (cat: string) => crisisTypes[cat] || { color: "#8884d8", label: cat };

  return (
    <MainLayout title="IPCR Situation Monitoring Room">
    <IncidentDetailModal
      incident={selectedIncident}
      open={incidentModalOpen}
      onOpenChange={setIncidentModalOpen}
    />
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">IPCR Situation Monitoring Room</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" variant="outline" className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
              <span>Urgent Incidents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{urgentIncidents.length}</div>
            <p className="text-sm text-red-600">High severity incidents requiring immediate action</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Clock className="mr-2 h-5 w-5 text-yellow-600" />
              <span>Pending Verification</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{unconfirmedReports.length}</div>
            <p className="text-sm text-yellow-600">Unconfirmed reports awaiting verification</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Bell className="mr-2 h-5 w-5 text-blue-600" />
              <span>Recent Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{recentReports.length}</div>
            <p className="text-sm text-blue-600">New incidents reported in the last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="mb-6" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="notifications" className="flex gap-2 items-center">
            <Bell className="h-4 w-4" />
            Notifications
            <Badge className="ml-1 bg-primary">{alerts.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="unconfirmed" className="flex gap-2 items-center">
            <Clock className="h-4 w-4" />
            Unconfirmed Reports
            <Badge className="ml-1 bg-yellow-500">{unconfirmedReports.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="feed" className="flex gap-2 items-center">
            <RefreshCw className="h-4 w-4" />
            Live Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">System Alerts</CardTitle>
              <CardDescription>Recent alerts and updates from the system</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="py-8 text-center">Loading alerts...</div>
              ) : alerts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No new alerts</div>
              ) : (
                <div className="space-y-4">
                  {alerts.slice(0, 10).map((alert) => (
                    <div key={alert.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex justify-between">
                        <h3 className="font-medium">{alert.title}</h3>
                        <span className="text-sm text-muted-foreground">
                          {formatTimeAgo(alert.generatedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <Badge variant="outline" className="mt-2">{alert.severity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unconfirmed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Pending Verification</CardTitle>
              <CardDescription>Reports that need to be verified before action</CardDescription>
            </CardHeader>
            <CardContent>
              {unconfirmedReports.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No pending reports requiring verification
                </div>
              ) : (
                <div className="space-y-4">
                  {unconfirmedReports.map((report) => {
                    const info = getCategoryInfo(report.category);
                    return (
                      <div
                        key={report.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
                        onClick={() => openIncidentDetailModal(report)}
                      >
                        <div className="flex justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: info.color }}
                            />
                            <h3 className="font-medium">{info.label}</h3>
                          </div>
                          <Badge variant="outline">{report.severity}</Badge>
                        </div>
                        <p className="text-sm mb-2 line-clamp-2">{report.description}</p>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{report.location}</span>
                          <span>{formatTimeAgo(report.reportedAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Social Media Feed</CardTitle>
                <CardDescription>Real-time monitoring from social platforms</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SocialMediaMonitor />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">SMS Reports</CardTitle>
                <CardDescription>Text messages from field agents and citizens</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <SmsMonitor />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Recent Activity</CardTitle>
              <CardDescription>Latest updates and actions taken</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentReports.slice(0, 5).map((report) => {
                  const info = getCategoryInfo(report.category);
                  return (
                    <div key={report.id} className="flex gap-4">
                      <div className="relative mt-1">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            report.status === "active"
                              ? "bg-yellow-100 text-yellow-600"
                              : report.status === "pending"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {report.status === "active" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : report.status === "pending" ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </div>
                        <div className="absolute top-10 bottom-0 left-4 w-0.5 bg-muted" />
                      </div>
                      <div className="pb-6">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {info.label} reported in {report.location}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {report.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground my-1 line-clamp-2">
                          {report.description}
                        </p>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{new Date(report.reportedAt).toLocaleString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs flex items-center gap-1 text-primary"
                            onClick={() => openIncidentDetailModal(report)}
                          >
                            View Details
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {recentReports.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">No recent activity</div>
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <Link href="/alerts">
                  <Button variant="outline">View All Alerts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Regional Hotspots</CardTitle>
              <CardDescription>Areas with high incident activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["North East", "Middle Belt", "Niger Delta", "Lagos State", "Kaduna State"].map(
                  (region, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            index === 0
                              ? "bg-red-500"
                              : index === 1
                              ? "bg-orange-500"
                              : index === 2
                              ? "bg-yellow-500"
                              : index === 3
                              ? "bg-blue-500"
                              : "bg-green-500"
                          }`}
                        />
                        <span>{region}</span>
                      </div>
                      <Badge variant={index < 2 ? "destructive" : "outline"}>
                        {index === 0 ? "Critical" : index === 1 ? "High" : index === 2 ? "Moderate" : "Low"}
                      </Badge>
                    </div>
                  )
                )}
              </div>
              <div className="mt-6">
                <Link href="/map">
                  <Button className="w-full">View Crisis Map</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </MainLayout>
  );
}
