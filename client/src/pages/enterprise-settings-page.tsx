import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, FileText, MapPin, Zap, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AlertTemplate {
  id: number;
  name: string;
  category: string;
  severity: string;
  titleTemplate: string;
  bodyTemplate: string;
  channels: string[] | null;
  escalationLevel: number | null;
}

interface RiskZone {
  id: number;
  name: string;
  region: string;
  state: string | null;
  riskLevel: string;
  description: string | null;
}

interface EscalationRule {
  id: number;
  name: string;
  triggerSeverity: string;
  slaMinutes: number;
  escalateToLevel: number;
  notifyRoles: string[] | null;
  active: boolean | null;
}

const api = (path: string, options?: RequestInit) =>
  fetch(path, { ...options, credentials: "include" });

export default function EnterpriseSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertTemplate | null>(null);
  const [editingRisk, setEditingRisk] = useState<RiskZone | null>(null);
  const [editingEscalation, setEditingEscalation] = useState<EscalationRule | null>(null);

  const { data: alertTemplates = [], isLoading: loadingAlerts } = useQuery<AlertTemplate[]>({
    queryKey: ["/api/enterprise/alert-templates"],
    queryFn: () => api("/api/enterprise/alert-templates").then((r) => (r.ok ? r.json() : [])),
  });
  const { data: riskZones = [], isLoading: loadingRiskZones } = useQuery<RiskZone[]>({
    queryKey: ["/api/enterprise/risk-zones"],
    queryFn: () => api("/api/enterprise/risk-zones").then((r) => (r.ok ? r.json() : [])),
  });
  const { data: escalationRules = [], isLoading: loadingEscalation } = useQuery<EscalationRule[]>({
    queryKey: ["/api/enterprise/escalation-rules"],
    queryFn: () => api("/api/enterprise/escalation-rules").then((r) => (r.ok ? r.json() : [])),
  });
  const { data: watchWords = [], isLoading: loadingWatchWords } = useQuery<string[]>({
    queryKey: ["/api/watch-words"],
    queryFn: () => api("/api/watch-words").then((r) => (r.ok ? r.json() : [])),
  });

  const alertMutation = useMutation({
    mutationFn: async (data: Partial<AlertTemplate> & { id?: number }) => {
      if (data.id) {
        const res = await api(`/api/enterprise/alert-templates/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
      }
      const res = await api("/api/enterprise/alert-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/alert-templates"] });
      setAlertDialogOpen(false);
      setEditingAlert(null);
      toast({ title: "Alert template saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const riskMutation = useMutation({
    mutationFn: async (data: Partial<RiskZone> & { id?: number }) => {
      if (data.id) {
        const res = await api(`/api/enterprise/risk-zones/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
      }
      const res = await api("/api/enterprise/risk-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/risk-zones"] });
      setRiskDialogOpen(false);
      setEditingRisk(null);
      toast({ title: "Risk zone saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const escalationMutation = useMutation({
    mutationFn: async (data: Partial<EscalationRule> & { id?: number }) => {
      if (data.id) {
        const res = await api(`/api/enterprise/escalation-rules/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update");
        return res.json();
      }
      const res = await api("/api/enterprise/escalation-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/escalation-rules"] });
      setEscalationDialogOpen(false);
      setEditingEscalation(null);
      toast({ title: "Escalation rule saved" });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const deleteAlert = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    const res = await api(`/api/enterprise/alert-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/alert-templates"] });
      toast({ title: "Template deleted" });
    }
  };
  const deleteRisk = async (id: number) => {
    if (!confirm("Delete this risk zone?")) return;
    const res = await api(`/api/enterprise/risk-zones/${id}`, { method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/risk-zones"] });
      toast({ title: "Risk zone deleted" });
    }
  };
  const deleteEscalation = async (id: number) => {
    if (!confirm("Delete this rule?")) return;
    const res = await api(`/api/enterprise/escalation-rules/${id}`, { method: "DELETE" });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["/api/enterprise/escalation-rules"] });
      toast({ title: "Rule deleted" });
    }
  };

  const [watchWordsDraft, setWatchWordsDraft] = useState("");
  useEffect(() => {
    setWatchWordsDraft(watchWords.join("\n"));
  }, [watchWords]);
  const saveWatchWordsMutation = useMutation({
    mutationFn: async () => {
      const words = watchWordsDraft
        .split("\n")
        .map((w) => w.trim())
        .filter(Boolean);
      const res = await api("/api/watch-words", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watch-words"] });
      toast({ title: "Watch words saved" });
    },
    onError: () => toast({ title: "Failed to save watch words", variant: "destructive" }),
  });

  return (
    <MainLayout title="Enterprise Settings">
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-2">Enterprise Settings</h1>
        <p className="text-muted-foreground mb-6">
          Configure alert templates, risk zones, and escalation rules for the EWER system
        </p>

        <Tabs defaultValue="templates">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Alert Templates
            </TabsTrigger>
            <TabsTrigger value="zones" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Risk Zones
            </TabsTrigger>
            <TabsTrigger value="escalation" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Escalation Rules
            </TabsTrigger>
            <TabsTrigger value="watchwords" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Watch Words
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Alert Templates</CardTitle>
                  <CardDescription>Reusable templates for crisis alerts</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingAlert(null);
                    setAlertDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </Button>
              </CardHeader>
              <CardContent>
                {loadingAlerts ? (
                  <p className="text-muted-foreground py-8 text-center">Loading...</p>
                ) : alertTemplates.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No templates yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Escalation</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertTemplates.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.category}</TableCell>
                          <TableCell>
                            <Badge variant={t.severity === "critical" ? "destructive" : "secondary"}>
                              {t.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>Level {t.escalationLevel ?? "—"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingAlert(t); setAlertDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteAlert(t.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zones">
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Risk Zones</CardTitle>
                  <CardDescription>Geographic areas with defined risk levels</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingRisk(null);
                    setRiskDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              </CardHeader>
              <CardContent>
                {loadingRiskZones ? (
                  <p className="text-muted-foreground py-8 text-center">Loading...</p>
                ) : riskZones.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No risk zones yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskZones.map((z) => (
                        <TableRow key={z.id}>
                          <TableCell className="font-medium">{z.name}</TableCell>
                          <TableCell>{z.region}</TableCell>
                          <TableCell>{z.state ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant={z.riskLevel === "critical" ? "destructive" : "secondary"}>
                              {z.riskLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingRisk(z); setRiskDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteRisk(z.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escalation">
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Escalation Rules</CardTitle>
                  <CardDescription>SLA and escalation configuration by severity</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setEditingEscalation(null);
                    setEscalationDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </CardHeader>
              <CardContent>
                {loadingEscalation ? (
                  <p className="text-muted-foreground py-8 text-center">Loading...</p>
                ) : escalationRules.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No escalation rules yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Trigger Severity</TableHead>
                        <TableHead>SLA (min)</TableHead>
                        <TableHead>Escalate To</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {escalationRules.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.triggerSeverity}</Badge>
                          </TableCell>
                          <TableCell>{r.slaMinutes}</TableCell>
                          <TableCell>Level {r.escalateToLevel}</TableCell>
                          <TableCell>{r.active ? "Yes" : "No"}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingEscalation(r); setEscalationDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteEscalation(r.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="watchwords">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Content filtering: words to watch
                </CardTitle>
                <CardDescription>
                  Posts containing any of these words are flagged in Social Media Monitoring. One word per line; matching is case-insensitive and whole-word.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingWatchWords ? (
                  <p className="text-muted-foreground py-8 text-center">Loading...</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="watch-words-list">Watch words (one per line)</Label>
                      <Textarea
                        id="watch-words-list"
                        className="mt-2 min-h-[240px] font-mono text-sm"
                        placeholder="violence\nattack\ncrisis\nprotest"
                        value={watchWordsDraft}
                        onChange={(e) => setWatchWordsDraft(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={() => saveWatchWordsMutation.mutate()}
                      disabled={saveWatchWordsMutation.isPending}
                    >
                      {saveWatchWordsMutation.isPending ? "Saving..." : "Save watch words"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Alert Template Dialog */}
      <AlertTemplateDialog
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        template={editingAlert}
        onSubmit={(data) => alertMutation.mutate(data)}
        isPending={alertMutation.isPending}
      />

      {/* Risk Zone Dialog */}
      <RiskZoneDialog
        open={riskDialogOpen}
        onOpenChange={setRiskDialogOpen}
        zone={editingRisk}
        onSubmit={(data) => riskMutation.mutate(data)}
        isPending={riskMutation.isPending}
      />

      {/* Escalation Rule Dialog */}
      <EscalationRuleDialog
        open={escalationDialogOpen}
        onOpenChange={setEscalationDialogOpen}
        rule={editingEscalation}
        onSubmit={(data) => escalationMutation.mutate(data)}
        isPending={escalationMutation.isPending}
      />
    </MainLayout>
  );
}

function AlertTemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: AlertTemplate | null;
  onSubmit: (data: Partial<AlertTemplate>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? "conflict");
  const [severity, setSeverity] = useState(template?.severity ?? "medium");
  const [titleTemplate, setTitleTemplate] = useState(template?.titleTemplate ?? "");
  const [bodyTemplate, setBodyTemplate] = useState(template?.bodyTemplate ?? "");
  const [escalationLevel, setEscalationLevel] = useState(String(template?.escalationLevel ?? 3));

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setCategory(template?.category ?? "conflict");
      setSeverity(template?.severity ?? "medium");
      setTitleTemplate(template?.titleTemplate ?? "");
      setBodyTemplate(template?.bodyTemplate ?? "");
      setEscalationLevel(String(template?.escalationLevel ?? 3));
    }
  }, [open, template]);

  const reset = () => {
    setName(template?.name ?? "");
    setCategory(template?.category ?? "conflict");
    setSeverity(template?.severity ?? "medium");
    setTitleTemplate(template?.titleTemplate ?? "");
    setBodyTemplate(template?.bodyTemplate ?? "");
    setEscalationLevel(String(template?.escalationLevel ?? 3));
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Add Alert Template"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conflict">Conflict</SelectItem>
                  <SelectItem value="disaster">Disaster</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Title Template</Label>
            <Input value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} placeholder="e.g. [CATEGORY] Alert in {location}" />
          </div>
          <div className="grid gap-2">
            <Label>Body Template</Label>
            <Textarea value={bodyTemplate} onChange={(e) => setBodyTemplate(e.target.value)} rows={3} placeholder="Alert body with {placeholders}" />
          </div>
          <div className="grid gap-2">
            <Label>Escalation Level</Label>
            <Select value={escalationLevel} onValueChange={setEscalationLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!name || !titleTemplate || !bodyTemplate || isPending}
            onClick={() => onSubmit({
              id: template?.id,
              name,
              category,
              severity,
              titleTemplate,
              bodyTemplate,
              escalationLevel: parseInt(escalationLevel),
            })}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RiskZoneDialog({
  open,
  onOpenChange,
  zone,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  zone: RiskZone | null;
  onSubmit: (data: Partial<RiskZone>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(zone?.name ?? "");
  const [region, setRegion] = useState(zone?.region ?? "Nigeria");
  const [state, setState] = useState(zone?.state ?? "");
  const [riskLevel, setRiskLevel] = useState(zone?.riskLevel ?? "medium");
  const [description, setDescription] = useState(zone?.description ?? "");

  useEffect(() => {
    if (open) {
      setName(zone?.name ?? "");
      setRegion(zone?.region ?? "Nigeria");
      setState(zone?.state ?? "");
      setRiskLevel(zone?.riskLevel ?? "medium");
      setDescription(zone?.description ?? "");
    }
  }, [open, zone]);

  const reset = () => {
    setName(zone?.name ?? "");
    setRegion(zone?.region ?? "Nigeria");
    setState(zone?.state ?? "");
    setRiskLevel(zone?.riskLevel ?? "medium");
    setDescription(zone?.description ?? "");
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{zone ? "Edit Risk Zone" : "Add Risk Zone"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Zone name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Region</Label>
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Nigeria" />
            </div>
            <div className="grid gap-2">
              <Label>State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Lagos" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Risk Level</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional description" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!name || !region || isPending}
            onClick={() => onSubmit({
              id: zone?.id,
              name,
              region,
              state: state || null,
              riskLevel,
              description: description || null,
            })}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EscalationRuleDialog({
  open,
  onOpenChange,
  rule,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rule: EscalationRule | null;
  onSubmit: (data: Partial<EscalationRule>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(rule?.name ?? "");
  const [triggerSeverity, setTriggerSeverity] = useState(rule?.triggerSeverity ?? "high");
  const [slaMinutes, setSlaMinutes] = useState(String(rule?.slaMinutes ?? 60));
  const [escalateToLevel, setEscalateToLevel] = useState(String(rule?.escalateToLevel ?? 4));
  const [active, setActive] = useState(rule?.active ?? true);

  useEffect(() => {
    if (open) {
      setName(rule?.name ?? "");
      setTriggerSeverity(rule?.triggerSeverity ?? "high");
      setSlaMinutes(String(rule?.slaMinutes ?? 60));
      setEscalateToLevel(String(rule?.escalateToLevel ?? 4));
      setActive(rule?.active ?? true);
    }
  }, [open, rule]);

  const reset = () => {
    setName(rule?.name ?? "");
    setTriggerSeverity(rule?.triggerSeverity ?? "high");
    setSlaMinutes(String(rule?.slaMinutes ?? 60));
    setEscalateToLevel(String(rule?.escalateToLevel ?? 4));
    setActive(rule?.active ?? true);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? "Edit Escalation Rule" : "Add Escalation Rule"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rule name" />
          </div>
          <div className="grid gap-2">
            <Label>Trigger Severity</Label>
            <Select value={triggerSeverity} onValueChange={setTriggerSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>SLA (minutes)</Label>
              <Input type="number" value={slaMinutes} onChange={(e) => setSlaMinutes(e.target.value)} min={1} />
            </div>
            <div className="grid gap-2">
              <Label>Escalate To Level</Label>
              <Select value={escalateToLevel} onValueChange={setEscalateToLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={active} onCheckedChange={setActive} />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!name || !slaMinutes || isPending}
            onClick={() => onSubmit({
              id: rule?.id,
              name,
              triggerSeverity,
              slaMinutes: parseInt(slaMinutes) || 60,
              escalateToLevel: parseInt(escalateToLevel) || 4,
              active,
            })}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
