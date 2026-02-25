import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Globe, Loader2, ChevronDown, ChevronRight, Calendar, MapPin, Target, AlertTriangle, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const NIGERIAN_REGIONS = [
  { value: "all", label: "All regions" },
  { value: "North East", label: "North East" },
  { value: "North West", label: "North West" },
  { value: "North Central", label: "North Central" },
  { value: "South West", label: "South West" },
  { value: "South East", label: "South East" },
  { value: "South South", label: "South South" },
];

type PeaceOpportunity = {
  id: string;
  title: string;
  description: string;
  region: string;
  confidence: number;
  priority: "low" | "medium" | "high" | "critical";
  timeWindow: { start: string; end: string; optimal: string };
  indicators: string[];
  prerequisites: string[];
  recommendations: string[];
  riskFactors: string[];
  successProbability: number;
  detectedAt: string;
};

type PeaceResult = {
  opportunities: PeaceOpportunity[];
  summary: {
    totalOpportunities: number;
    highPriorityOpportunities: number;
    optimalWindows: number;
    affectedRegions: string[];
  };
  generatedAt: string;
};

export default function PeaceIndicatorsPage() {
  const { toast } = useToast();
  const [timeframeDays, setTimeframeDays] = useState("90");
  const [regionFilter, setRegionFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"confidence" | "priority" | "success">("confidence");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PeaceResult | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const body: { timeframeDays: number; region?: string } = {
        timeframeDays: parseInt(timeframeDays, 10),
      };
      if (regionFilter !== "all") body.region = regionFilter;
      const res = await apiRequest("POST", "/api/ai/peace-opportunities", body);
      const data = await res.json();
      setResult(data);
      toast({
        title: "Analysis complete",
        description: `${data.summary.totalOpportunities} peace opportunities identified.`,
      });
    } catch (e) {
      toast({
        title: "Analysis failed",
        description: e instanceof Error ? e.message : "Could not run peace opportunity analysis.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportCsv = () => {
    if (!result?.opportunities.length) return;
    const headers = ["Title", "Region", "Priority", "Confidence %", "Success %", "Optimal Window", "Description"];
    const rows = result.opportunities.map((o) => [
      o.title,
      o.region,
      o.priority,
      o.confidence,
      o.successProbability,
      format(new Date(o.timeWindow.optimal), "yyyy-MM-dd"),
      o.description.replace(/"/g, '""'),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peace-opportunities-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "CSV downloaded." });
  };

  const filteredOpportunities = (result?.opportunities ?? []).filter((o) => {
    if (priorityFilter !== "all" && o.priority !== priorityFilter) return false;
    return true;
  });

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    if (sortBy === "confidence") return b.confidence - a.confidence;
    if (sortBy === "success") return b.successProbability - a.successProbability;
    const order = { critical: 4, high: 3, medium: 2, low: 1 };
    return (order[b.priority] ?? 0) - (order[a.priority] ?? 0);
  });

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-rose-100 text-rose-800 border-rose-200";
      case "high": return "bg-amber-100 text-amber-800 border-amber-200";
      case "medium": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <MainLayout title="Peace Opportunity Indicators">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-green-600" />
              Peace Opportunity Indicators
            </CardTitle>
            <CardDescription>
              Predict windows of opportunity for peace initiatives and conflict resolution based on incident trends,
              resolution patterns, seasonal stability, and reconciliation signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Analysis period</label>
                <Select value={timeframeDays} onValueChange={setTimeframeDays}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 6 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Region</label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NIGERIAN_REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runAnalysis} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Analyze Peace Opportunities
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total opportunities</p>
                  <p className="text-2xl font-bold text-green-700">{result.summary.totalOpportunities}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">High priority</p>
                  <p className="text-2xl font-bold text-amber-700">{result.summary.highPriorityOpportunities}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Optimal windows (next 30 days)</p>
                  <p className="text-2xl font-bold text-blue-700">{result.summary.optimalWindows}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Affected regions</p>
                  <p className="text-2xl font-bold text-purple-700">{result.summary.affectedRegions.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Opportunities</CardTitle>
                  <CardDescription>Generated at {format(new Date(result.generatedAt), "PPp")}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as "confidence" | "priority" | "success")}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confidence">Sort by confidence</SelectItem>
                      <SelectItem value="priority">Sort by priority</SelectItem>
                      <SelectItem value="success">Sort by success %</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={exportCsv} disabled={!result.opportunities.length}>
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sortedOpportunities.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No opportunities match the current filters.</p>
                ) : (
                  <div className="space-y-2">
                    {sortedOpportunities.map((opp) => (
                      <OpportunityCard key={opp.id} opportunity={opp} priorityColor={priorityColor} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!result && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="h-14 w-14 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">No analysis yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Choose an analysis period and optionally a region, then click &quot;Analyze Peace Opportunities&quot; to
                identify windows for peace initiatives, reconciliation, and conflict resolution.
              </p>
              <Button onClick={runAnalysis}>
                <Globe className="h-4 w-4 mr-2" />
                Run first analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}

function OpportunityCard({
  opportunity,
  priorityColor,
}: {
  opportunity: PeaceOpportunity;
  priorityColor: (p: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const o = opportunity;
  const timeWindow = o.timeWindow as unknown as { start: string; end: string; optimal: string };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-lg overflow-hidden bg-card">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
          >
            {open ? (
              <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            ) : (
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="font-semibold text-green-800">{o.title}</h4>
                <Badge variant="outline" className={priorityColor(o.priority)}>
                  {o.priority}
                </Badge>
                <Badge variant="secondary">{o.confidence}% confidence</Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1 inline" />
                  {o.region}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{o.description}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Success: {o.successProbability}%</span>
                <span>
                  Optimal: {timeWindow?.optimal ? format(new Date(timeWindow.optimal), "MMM d, yyyy") : "—"}
                </span>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-4 border-t bg-muted/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Time window
                </h5>
                <p className="text-sm">
                  {timeWindow?.start && timeWindow?.end
                    ? `${format(new Date(timeWindow.start), "MMM d, yyyy")} – ${format(new Date(timeWindow.end), "MMM d, yyyy")}`
                    : "—"}
                  {timeWindow?.optimal && (
                    <span className="block text-muted-foreground mt-1">
                      Optimal: {format(new Date(timeWindow.optimal), "PP")}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                <Target className="h-3 w-3" /> Indicators
              </h5>
              <ul className="text-sm list-disc list-inside space-y-0.5">
                {(o.indicators || []).map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-semibold text-green-700 uppercase mb-2">Recommendations</h5>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  {(o.recommendations || []).slice(0, 5).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Prerequisites</h5>
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  {(o.prerequisites || []).slice(0, 4).map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h5 className="text-xs font-semibold text-amber-700 uppercase mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Risk factors
              </h5>
              <ul className="text-sm list-disc list-inside space-y-0.5">
                {(o.riskFactors || []).map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
