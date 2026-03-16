import { useMemo, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type WorkflowTemplateRow = {
  id: number;
  name: string;
  entityType: string;
  activityType: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
};

function parseStages(text: string): { name: string; stageOrder: number; allowedRoles?: string[] | null }[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map((line, idx) => {
    // Format: "Stage name | role1,role2" (roles optional)
    const parts = line.split("|").map((p) => p.trim());
    const name = parts[0];
    const roles = parts[1]
      ? parts[1]
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : null;

    return {
      name,
      stageOrder: idx + 1,
      allowedRoles: roles && roles.length > 0 ? roles : null,
    };
  });
}

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("reports");
  const [activityType, setActivityType] = useState("");
  const [stagesText, setStagesText] = useState(
    "Stage 1: Field report submitted | field_agent\nStage 2: Acknowledge | user\nStage 3: Review | analyst\nStage 4: Approve | coordinator"
  );

  const { data: templates = [], isLoading } = useQuery<WorkflowTemplateRow[]>({
    queryKey: ["/api/workflows/templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/workflows/templates");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const stages = parseStages(stagesText);
      if (!name.trim()) throw new Error("Name is required");
      if (stages.length < 1) throw new Error("At least one stage is required");

      const payload = {
        name: name.trim(),
        entityType,
        activityType: activityType.trim() || null,
        isActive: true,
        stages,
        transitions: null,
      };

      const res = await apiRequest("POST", "/api/workflows/templates", payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to create workflow");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/templates"] });
      toast({ title: "Workflow created" });
      setCreateOpen(false);
      setName("");
      setEntityType("reports");
      setActivityType("");
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const previewStages = useMemo(() => {
    try {
      return parseStages(stagesText);
    } catch {
      return [];
    }
  }, [stagesText]);

  return (
    <MainLayout title="Workflows">
      <div className="container mx-auto py-6 px-4 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Workflow Process Maker</h1>
            <p className="text-muted-foreground">
              Create workflow processes (stages + transitions) that the system can enforce.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Admin Only</Badge>
            <Button onClick={() => setCreateOpen(true)}>New Workflow</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Templates</CardTitle>
            <CardDescription>Templates you have created. Users will adhere to these processes once applied.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : templates.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No workflows yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.id}</TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.entityType}</TableCell>
                      <TableCell>{t.activityType ?? "—"}</TableCell>
                      <TableCell>
                        {t.isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Workflow</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Field Report Approval" />
                </div>

                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={entityType} onValueChange={setEntityType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reports">Reports</SelectItem>
                      <SelectItem value="incidents">Incidents</SelectItem>
                      <SelectItem value="response_activities">Response Activities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Activity Type (optional)</Label>
                <Input
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  placeholder="e.g. field_report, situation_report"
                />
              </div>

              <div className="space-y-2">
                <Label>Stages</Label>
                <Textarea
                  value={stagesText}
                  onChange={(e) => setStagesText(e.target.value)}
                  rows={7}
                  placeholder="One per line. Optionally specify roles after | e.g. Review | analyst,coordinator"
                />
                <p className="text-xs text-muted-foreground">
                  Stage format: <span className="font-mono">Stage name | role1,role2</span> (roles optional). If you omit roles, any role can do transitions.
                </p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Preview</CardTitle>
                  <CardDescription>Default transitions are linear (Stage 1 → Stage 2 → ...).</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {previewStages.map((s) => (
                      <div key={s.stageOrder} className="flex items-center justify-between gap-3">
                        <div className="text-sm">
                          <span className="font-medium">{s.stageOrder}.</span> {s.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(s.allowedRoles && s.allowedRoles.length > 0 ? s.allowedRoles.join(", ") : "All roles")}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
