import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Activity,
  BarChart3,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ExecutiveKpis {
  totalIncidents: number;
  activeIncidents: number;
  criticalAlerts: number;
  resolutionRate: number;
  avgResponseTimeHours: number;
  highRiskZones: number;
}

interface HeatMapItem {
  region: string;
  state?: string;
  incidentCount: number;
  activeCount: number;
  riskLevel: string;
}

interface TrendPoint {
  date: string;
  incidents: number;
  resolved: number;
  alerts: number;
}

interface SystemHealth {
  overall: string;
  services: { name: string; status: string; latencyMs?: number }[];
  timestamp: string;
}

export default function ExecutiveDashboardPage() {
  const [trendDays, setTrendDays] = useState(14);

  const { data: kpis, isLoading: kpisLoading } = useQuery<ExecutiveKpis>({
    queryKey: ["/api/enterprise/kpis"],
    staleTime: 60000,
  });

  const { data: heatMap = [] } = useQuery<HeatMapItem[]>({
    queryKey: ["/api/enterprise/heat-map"],
    staleTime: 60000,
  });

  const { data: trends = [] } = useQuery<TrendPoint[]>({
    queryKey: ["/api/enterprise/trends", trendDays],
    queryFn: async () => {
      const res = await fetch(`/api/enterprise/trends?days=${trendDays}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: health } = useQuery<SystemHealth>({
    queryKey: ["/api/enterprise/health"],
    staleTime: 30000,
  });

  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <MainLayout title="Executive Dashboard">
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Executive Dashboard</h1>
            <p className="text-muted-foreground">
              Enterprise early warning & early response overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTrendDays(7)}>
              7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTrendDays(14)}>
              14 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setTrendDays(30)}>
              30 Days
            </Button>
            <Link href="/internal">
              <Button size="sm">
                <Zap className="mr-2 h-4 w-4" />
                Situation Room
              </Button>
            </Link>
          </div>
        </div>

        {/* System Health Bar */}
        {health && (
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">System Status</span>
                  <Badge
                    variant={
                      health.overall === "healthy"
                        ? "default"
                        : health.overall === "degraded"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {health.overall.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  {health.services.map((s) => (
                    <span key={s.name}>
                      {s.name}: {s.status}
                      {s.latencyMs != null && ` (${s.latencyMs}ms)`}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Incidents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? "—" : kpis?.totalIncidents ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {kpisLoading ? "—" : kpis?.activeIncidents ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {kpisLoading ? "—" : kpis?.criticalAlerts ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Resolution Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {kpisLoading ? "—" : `${kpis?.resolutionRate ?? 0}%`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? "—" : `${kpis?.avgResponseTimeHours ?? 0}h`}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                High Risk Zones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpisLoading ? "—" : kpis?.highRiskZones ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Incident Trends
              </CardTitle>
              <CardDescription>Last {trendDays} days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="incidents"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Incidents"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      stackId="1"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.6}
                      name="Resolved"
                    />
                    <Area
                      type="monotone"
                      dataKey="alerts"
                      stackId="2"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.5}
                      name="Alerts"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Regional Heat Map */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Regional Risk Heat Map
              </CardTitle>
              <CardDescription>By region and state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[280px] overflow-y-auto space-y-2">
                {heatMap.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No regional data
                  </p>
                ) : (
                  heatMap.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-md border"
                    >
                      <div>
                        <span className="font-medium">{item.region}</span>
                        {item.state && (
                          <span className="text-muted-foreground text-sm ml-2">
                            / {item.state}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {item.activeCount} active / {item.incidentCount} total
                        </span>
                        <Badge
                          variant="outline"
                          className={riskColors[item.riskLevel] || ""}
                        >
                          {item.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common enterprise operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/alerts">
                <Button variant="outline">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  View Alerts
                </Button>
              </Link>
              <Link href="/crises">
                <Button variant="outline">
                  <Activity className="mr-2 h-4 w-4" />
                  Crisis Management
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="outline">
                  <MapPin className="mr-2 h-4 w-4" />
                  Crisis Map
                </Button>
              </Link>
              <Link href="/reporting">
                <Button variant="outline">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Reports
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
