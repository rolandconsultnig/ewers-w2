import { useState } from "react";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle, FileText, Database, User, Loader2 } from "lucide-react";
import { format } from "date-fns";

type SearchResult = {
  id: number;
  type: string;
  title?: string;
  description?: string;
  location?: string;
  severity?: string;
  status?: string;
  region?: string;
  reportedAt?: string;
  generatedAt?: string;
  name?: string;
  username?: string;
  fullName?: string;
  role?: string;
};

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [globalQuery, setGlobalQuery] = useState("");
  const [incidentFilters, setIncidentFilters] = useState({
    keyword: "",
    region: "",
    severity: "",
    status: "",
    category: "",
    startDate: "",
    endDate: "",
  });
  const [alertFilters, setAlertFilters] = useState({
    keyword: "",
    severity: "",
    status: "",
    startDate: "",
    endDate: "",
  });

  const globalSearchMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/search/global", { query: q, limit: 50 });
      return res.json();
    },
  });

  const incidentSearchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/search/incidents", {
        ...incidentFilters,
        limit: 100,
      });
      return res.json();
    },
  });

  const alertSearchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/search/alerts", {
        ...alertFilters,
        limit: 100,
      });
      return res.json();
    },
  });

  const { data: filterSuggestions } = useQuery({
    queryKey: ["/api/filter/suggestions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/filter/suggestions");
      return res.json();
    },
  });

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalQuery.trim().length >= 2) {
      globalSearchMutation.mutate(globalQuery.trim());
    }
  };

  const navigateTo = (r: SearchResult) => {
    if (r.type === "incident") setLocation(`/incidents?incident=${r.id}`);
    else if (r.type === "alert") setLocation(`/alerts?alert=${r.id}`);
    else if (r.type === "dataSource") setLocation(`/data-collection`);
    else if (r.type === "user") setLocation(`/user-management`);
  };

  const globalResults = globalSearchMutation.data?.results;
  const incidentResults = incidentSearchMutation.data?.results || [];
  const alertResults = alertSearchMutation.data?.results || [];

  return (
    <MainLayout title="Advanced Search">
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-6 w-6" />
              Advanced Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="global">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="global">Global Search</TabsTrigger>
                <TabsTrigger value="incidents">Incident Search</TabsTrigger>
                <TabsTrigger value="alerts">Alert Search</TabsTrigger>
              </TabsList>

              <TabsContent value="global" className="mt-4">
                <form onSubmit={handleGlobalSearch} className="flex gap-2 mb-4">
                  <Input
                    placeholder="Search incidents, alerts, data sources, users..."
                    value={globalQuery}
                    onChange={(e) => setGlobalQuery(e.target.value)}
                    minLength={2}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={globalQuery.length < 2 || globalSearchMutation.isPending}>
                    {globalSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </form>
                {globalSearchMutation.data && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Found {globalSearchMutation.data.totalResults} results
                    </p>
                    {Object.entries(globalSearchMutation.data.results || {}).map(([key, items]: [string, any]) =>
                      (items || []).map((r: SearchResult) => (
                        <div
                          key={`${r.type}-${r.id}`}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigateTo(r)}
                        >
                          {r.type === "incident" && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                          {r.type === "alert" && <AlertTriangle className="h-5 w-5 text-red-500" />}
                          {r.type === "dataSource" && <Database className="h-5 w-5 text-blue-500" />}
                          {r.type === "user" && <User className="h-5 w-5 text-green-500" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{r.title || r.name || r.fullName || r.username}</p>
                            {(r.description || r.location) && (
                              <p className="text-sm text-muted-foreground truncate">{r.description || r.location}</p>
                            )}
                          </div>
                          <Badge variant="outline">{r.type}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="incidents" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                  <Input
                    placeholder="Keyword"
                    value={incidentFilters.keyword}
                    onChange={(e) => setIncidentFilters((f) => ({ ...f, keyword: e.target.value }))}
                  />
                  <Select
                    value={incidentFilters.region || "all"}
                    onValueChange={(v) => setIncidentFilters((f) => ({ ...f, region: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {(filterSuggestions?.regions || []).map((r: string) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={incidentFilters.severity || "all"}
                    onValueChange={(v) => setIncidentFilters((f) => ({ ...f, severity: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(filterSuggestions?.severities || []).map((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={incidentFilters.status || "all"}
                    onValueChange={(v) => setIncidentFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {(filterSuggestions?.statuses || []).map((s: string) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={incidentFilters.startDate}
                    onChange={(e) => setIncidentFilters((f) => ({ ...f, startDate: e.target.value }))}
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={incidentFilters.endDate}
                    onChange={(e) => setIncidentFilters((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <Button onClick={() => incidentSearchMutation.mutate()} disabled={incidentSearchMutation.isPending}>
                  {incidentSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Search Incidents
                </Button>
                <div className="mt-4 space-y-2">
                  {incidentResults.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setLocation(`/incidents?incident=${r.id}`)}
                    >
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{r.description || r.location}</p>
                      </div>
                      <Badge>{r.severity}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.reportedAt ? format(new Date(r.reportedAt), "MMM d, yyyy") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="alerts" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <Input
                    placeholder="Keyword"
                    value={alertFilters.keyword}
                    onChange={(e) => setAlertFilters((f) => ({ ...f, keyword: e.target.value }))}
                  />
                  <Select
                    value={alertFilters.severity || "all"}
                    onValueChange={(v) => setAlertFilters((f) => ({ ...f, severity: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={alertFilters.status || "all"}
                    onValueChange={(v) => setAlertFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={alertFilters.startDate}
                    onChange={(e) => setAlertFilters((f) => ({ ...f, startDate: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={alertFilters.endDate}
                    onChange={(e) => setAlertFilters((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <Button onClick={() => alertSearchMutation.mutate()} disabled={alertSearchMutation.isPending}>
                  {alertSearchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Search Alerts
                </Button>
                <div className="mt-4 space-y-2">
                  {alertResults.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setLocation(`/alerts?alert=${r.id}`)}
                    >
                      <FileText className="h-5 w-5 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{r.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{r.description}</p>
                      </div>
                      <Badge>{r.severity}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {r.generatedAt ? format(new Date(r.generatedAt), "MMM d, yyyy") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
