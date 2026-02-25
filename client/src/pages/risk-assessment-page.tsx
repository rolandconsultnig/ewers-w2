import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageTemplate from "@/components/modules/PageTemplate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, TrendingUp, MapPin, Workflow, Bell, Loader2, Play, Plus, Pencil, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TrendChart from "@/components/dashboard/TrendChart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function RiskAssessmentPage() {
  const [activeTab, setActiveTab] = useState("modeling");
  
  const toolbar = (
    <Button>
      <LineChart className="h-4 w-4 mr-2" />
      Run Assessment
    </Button>
  );
  
  const riskScores = [
    { region: "North Central", score: 75, status: "High" },
    { region: "North East", score: 85, status: "Critical" },
    { region: "North West", score: 70, status: "High" },
    { region: "South East", score: 45, status: "Medium" },
    { region: "South South", score: 40, status: "Medium" },
    { region: "South West", score: 30, status: "Low" },
  ];
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case "Critical":
        return "bg-red-500";
      case "High":
        return "bg-orange-500";
      case "Medium":
        return "bg-yellow-500";
      case "Low":
        return "bg-green-500";
      default:
        return "bg-blue-500";
    }
  };
  
  return (
    <PageTemplate 
      title="Risk Assessment & Conflict Prediction"
      description="Assess conflict risks and predict potential crisis situations"
      toolbar={toolbar}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="modeling" className="py-2">
            <LineChart className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Risk Modeling</span>
            <span className="md:hidden">Model</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Trend Analysis</span>
            <span className="md:hidden">Trends</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="py-2">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Vulnerability Mapping</span>
            <span className="md:hidden">Map</span>
          </TabsTrigger>
          <TabsTrigger value="simulation" className="py-2">
            <Workflow className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Scenario Simulation</span>
            <span className="md:hidden">Sim</span>
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="py-2">
            <Bell className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Threshold Alerts</span>
            <span className="md:hidden">Alert</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="modeling" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conflict Risk Modeling</CardTitle>
              <CardDescription>
                Statistical and machine learning models for conflict risk assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Current Risk Assessment for Nigeria</h3>
                  <div className="space-y-3">
                    {riskScores.map((region) => (
                      <div key={region.region} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{region.region}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            region.status === "Critical" ? "bg-red-100 text-red-800" :
                            region.status === "High" ? "bg-orange-100 text-orange-800" :
                            region.status === "Medium" ? "bg-yellow-100 text-yellow-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {region.status}
                          </span>
                        </div>
                        <Progress value={region.score} className={getStatusColor(region.status)} />
                        <p className="text-xs text-muted-foreground">Risk Score: {region.score}/100</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <Card className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Statistical Models</CardTitle>
                      <CardDescription>Bayesian and time series analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Statistical models analyze historical conflict data using time series forecasting, Bayesian networks, and regression techniques to identify risk patterns.
                      </p>
                      <div className="mt-4">
                        <Button variant="outline" size="sm" className="w-full">
                          Configure Models
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-blue-100">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Machine Learning Models</CardTitle>
                      <CardDescription>AI-powered risk assessment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Advanced machine learning techniques including neural networks and ensemble methods to detect complex patterns and improve prediction accuracy.
                      </p>
                      <div className="mt-4">
                        <Button variant="outline" size="sm" className="w-full">
                          Train Models
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-6">
          <TrendAnalysisTab />
        </TabsContent>
        
        <TabsContent value="mapping" className="space-y-6">
          <VulnerabilityMappingTab />
        </TabsContent>
        
        <TabsContent value="simulation" className="space-y-6">
          <ScenarioSimulationTab />
        </TabsContent>
        
        <TabsContent value="thresholds" className="space-y-6">
          <ThresholdAlertsTab />
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}

// --- Trend Analysis tab: trends API + forecast (AI predict)
interface TrendDataPoint {
  date: string;
  incidents: number;
  resolved: number;
  alerts: number;
}

function TrendAnalysisTab() {
  const [days, setDays] = useState(30);
  const [forecastRegion, setForecastRegion] = useState("Nigeria");
  const [forecastDays, setForecastDays] = useState(30);
  const [forecastResult, setForecastResult] = useState<{
    region: string;
    timelineDays: number;
    forecast: unknown;
    generatedAt: string;
  } | null>(null);

  const { data: trends = [], isLoading: loadingTrends } = useQuery<TrendDataPoint[]>({
    queryKey: ["enterprise-trends", days],
    queryFn: async () => {
      const res = await fetch(`/api/enterprise/trends?days=${days}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    },
  });

  const chartData = trends.map((t) => ({
    name: t.date,
    incidents: t.incidents,
    displacement: t.alerts,
  }));

  const runForecast = async () => {
    try {
      const res = await fetch("/api/ai/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          region: forecastRegion,
          timeline: String(forecastDays),
          startDate: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Forecast failed");
      const data = await res.json();
      setForecastResult(data);
    } catch (e) {
      setForecastResult(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Analysis & Forecasting</CardTitle>
        <CardDescription>
          Analyze conflict trends and run AI-powered conflict forecasts by region
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Label>Time range</Label>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loadingTrends ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TrendChart data={chartData} title="Incidents & Alerts Over Time" />
        )}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-3">Conflict Forecast (AI)</h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label>Region</Label>
              <Input
                value={forecastRegion}
                onChange={(e) => setForecastRegion(e.target.value)}
                placeholder="e.g. Nigeria"
                className="w-40 mt-1"
              />
            </div>
            <div>
              <Label>Timeline (days)</Label>
              <Select value={String(forecastDays)} onValueChange={(v) => setForecastDays(Number(v))}>
                <SelectTrigger className="w-32 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={runForecast}>
              <Play className="h-4 w-4 mr-2" />
              Generate Forecast
            </Button>
          </div>
          {forecastResult && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                Forecast for {forecastResult.region} (next {forecastResult.timelineDays} days) — generated {new Date(forecastResult.generatedAt).toLocaleString()}
              </p>
              <pre className="mt-2 text-sm overflow-auto max-h-48 whitespace-pre-wrap">
                {JSON.stringify(forecastResult.forecast, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Vulnerability & Resilience tab
interface VulnerabilityPoint {
  region: string;
  state?: string;
  vulnerabilityScore: number;
  resilienceScore: number;
  riskLevel: string;
  incidentCount: number;
  activeCount: number;
  resolvedCount: number;
  avgIndicatorValue: number;
  resolutionRate: number;
}

function VulnerabilityMappingTab() {
  const { data: mapData = [], isLoading } = useQuery<VulnerabilityPoint[]>({
    queryKey: ["enterprise-vulnerability-map"],
    queryFn: async () => {
      const res = await fetch("/api/enterprise/vulnerability-map", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const riskBadge = (level: string) => {
    const v = level.toLowerCase();
    if (v === "critical") return <Badge variant="destructive">Critical</Badge>;
    if (v === "high") return <Badge className="bg-orange-500">High</Badge>;
    if (v === "medium") return <Badge className="bg-yellow-600">Medium</Badge>;
    return <Badge className="bg-green-600">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vulnerability and Resilience Mapping</CardTitle>
        <CardDescription>
          Per-region vulnerability and resilience scores derived from incidents and risk indicators
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Risk level</TableHead>
                  <TableHead>Vulnerability</TableHead>
                  <TableHead>Resilience</TableHead>
                  <TableHead>Incidents</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Resolution %</TableHead>
                  <TableHead>Avg indicator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapData.map((row) => (
                  <TableRow key={row.region}>
                    <TableCell className="font-medium">{row.region}</TableCell>
                    <TableCell>{riskBadge(row.riskLevel)}</TableCell>
                    <TableCell>{row.vulnerabilityScore}</TableCell>
                    <TableCell>{row.resilienceScore}</TableCell>
                    <TableCell>{row.incidentCount}</TableCell>
                    <TableCell>{row.activeCount}</TableCell>
                    <TableCell>{row.resolutionRate}%</TableCell>
                    <TableCell>{row.avgIndicatorValue}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Scenario Simulation tab
interface ScenarioParams {
  region: string;
  incidentIncreasePercent?: number;
  additionalCriticalIncidents?: number;
  additionalHighIncidents?: number;
  indicatorValueIncrease?: number;
}

interface ScenarioResultType {
  scenario: ScenarioParams;
  currentState: { incidentCount: number; activeCount: number; avgSeverityScore: number; avgIndicatorValue: number };
  simulatedState: { incidentCount: number; effectiveSeverityScore: number; effectiveIndicatorValue: number; riskLevel: string };
  recommendations: string[];
  generatedAt: string;
}

function ScenarioSimulationTab() {
  const [region, setRegion] = useState("North East");
  const [incidentIncreasePercent, setIncidentIncreasePercent] = useState<number | "">(20);
  const [additionalCritical, setAdditionalCritical] = useState<number | "">(0);
  const [additionalHigh, setAdditionalHigh] = useState<number | "">(0);
  const [indicatorIncrease, setIndicatorIncrease] = useState<number | "">(0);
  const [result, setResult] = useState<ScenarioResultType | null>(null);

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/analysis/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          region,
          incidentIncreasePercent: Number(incidentIncreasePercent) || undefined,
          additionalCriticalIncidents: Number(additionalCritical) || undefined,
          additionalHighIncidents: Number(additionalHigh) || undefined,
          indicatorValueIncrease: Number(indicatorIncrease) || undefined,
        }),
      });
      if (!res.ok) throw new Error("Scenario failed");
      return res.json();
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Simulation Tools</CardTitle>
        <CardDescription>
          Run what-if scenarios by region (incident increase %, additional incidents, indicator change)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="North East">North East</SelectItem>
                <SelectItem value="North West">North West</SelectItem>
                <SelectItem value="North Central">North Central</SelectItem>
                <SelectItem value="South East">South East</SelectItem>
                <SelectItem value="South South">South South</SelectItem>
                <SelectItem value="South West">South West</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Incident increase %</Label>
            <Input
              type="number"
              value={incidentIncreasePercent}
              onChange={(e) => setIncidentIncreasePercent(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="20"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Additional critical incidents</Label>
            <Input
              type="number"
              value={additionalCritical}
              onChange={(e) => setAdditionalCritical(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Additional high incidents</Label>
            <Input
              type="number"
              value={additionalHigh}
              onChange={(e) => setAdditionalHigh(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Indicator value increase</Label>
            <Input
              type="number"
              value={indicatorIncrease}
              onChange={(e) => setIndicatorIncrease(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
        <Button onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
          {runMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Run simulation
        </Button>
        {result && (
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-medium">Results</h3>
            <p className="text-sm text-muted-foreground">
              Current: {result.currentState.incidentCount} incidents, avg severity {result.currentState.avgSeverityScore}, avg indicator {result.currentState.avgIndicatorValue}
            </p>
            <p className="text-sm">
              Simulated: {result.simulatedState.incidentCount} incidents, severity {result.simulatedState.effectiveSeverityScore}, indicator {result.simulatedState.effectiveIndicatorValue} — Risk:{" "}
              <Badge>{result.simulatedState.riskLevel}</Badge>
            </p>
            <div>
              <p className="text-sm font-medium mb-1">Recommendations</p>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {result.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Threshold Alerts tab
interface ThresholdRule {
  id: number;
  name: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  severity: string;
  messageTemplate: string;
  active: boolean;
}

function ThresholdAlertsTab() {
  const queryClient = useQueryClient();
  const [editingRule, setEditingRule] = useState<ThresholdRule | null>(null);
  const [formName, setFormName] = useState("");
  const [formTriggerType, setFormTriggerType] = useState<"indicator" | "incident_count">("incident_count");
  const [formSeverity, setFormSeverity] = useState("high");
  const [formMessage, setFormMessage] = useState("");
  const [formConfig, setFormConfig] = useState("{}");
  const [evaluateResult, setEvaluateResult] = useState<{ triggered: number; created: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery<ThresholdRule[]>({
    queryKey: ["enterprise-threshold-rules"],
    queryFn: async () => {
      const res = await fetch("/api/enterprise/threshold-rules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Partial<ThresholdRule>) => {
      const res = await fetch("/api/enterprise/threshold-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Create failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprise-threshold-rules"] });
      setFormName("");
      setFormMessage("");
      setFormConfig("{}");
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Partial<ThresholdRule> }) => {
      const res = await fetch(`/api/enterprise/threshold-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enterprise-threshold-rules"] });
      setEditingRule(null);
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/enterprise/threshold-rules/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enterprise-threshold-rules"] }),
  });

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/enterprise/threshold-rules/evaluate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Evaluate failed");
      return res.json();
    },
    onSuccess: (data) => setEvaluateResult(data),
  });

  const saveRule = () => {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(formConfig);
    } catch {
      return;
    }
    if (editingRule) {
      updateMutation.mutate({
        id: editingRule.id,
        body: { name: formName, triggerType: formTriggerType, severity: formSeverity, messageTemplate: formMessage, triggerConfig: config },
      });
    } else {
      createMutation.mutate({
        name: formName,
        triggerType: formTriggerType,
        severity: formSeverity,
        messageTemplate: formMessage,
        triggerConfig: config,
        active: true,
      });
    }
  };

  const openEdit = (rule: ThresholdRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormTriggerType(rule.triggerType as "indicator" | "incident_count");
    setFormSeverity(rule.severity);
    setFormMessage(rule.messageTemplate);
    setFormConfig(JSON.stringify(rule.triggerConfig, null, 2));
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Threshold Alerts (Trigger Mechanisms)</CardTitle>
        <CardDescription>
          Define rules that create alerts when indicators or incident counts exceed thresholds. Run Evaluate to check rules now.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <Button onClick={() => evaluateMutation.mutate()} disabled={evaluateMutation.isPending}>
            {evaluateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
            Evaluate triggers
          </Button>
          {evaluateResult != null && (
            <span className="text-sm text-muted-foreground">
              Triggered: {evaluateResult.triggered}, alerts created: {evaluateResult.created}
            </span>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditingRule(null); setDialogOpen(false); } }}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => { setEditingRule(null); setFormName(""); setFormMessage(""); setFormConfig("{}"); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit rule" : "New threshold rule"}</DialogTitle>
              <DialogDescription>
                Trigger type: indicator (minValue/region/indicatorId) or incident_count (region, count, withinDays). Put JSON in Config.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label>Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Trigger type</Label>
                <Select value={formTriggerType} onValueChange={(v) => setFormTriggerType(v as "indicator" | "incident_count")}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indicator">Indicator</SelectItem>
                    <SelectItem value="incident_count">Incident count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message template</Label>
                <Textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} className="mt-1" rows={2} />
              </div>
              <div>
                <Label>Trigger config (JSON)</Label>
                <Textarea value={formConfig} onChange={(e) => setFormConfig(e.target.value)} className="mt-1 font-mono text-sm" rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
              <Button onClick={saveRule}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>{rule.triggerType}</TableCell>
                  <TableCell>{rule.severity}</TableCell>
                  <TableCell>
                    <Switch
                      checked={!!rule.active}
                      onCheckedChange={(checked) =>
                        updateMutation.mutate({ id: rule.id, body: { active: checked } })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(rule.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}