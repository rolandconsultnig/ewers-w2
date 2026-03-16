import { useEffect, useMemo, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type WorkflowStageEditorRow = {
  name: string;
  allowedRolesText: string;
};

type WorkflowTransitionEditorRow = {
  fromStageOrder: number;
  toStageOrder: number;
  allowedRolesText: string;
};

type WorkflowTemplateGraph = {
  template: WorkflowTemplateRow;
  stages: Array<{ id: number; name: string; stageOrder: number; allowedRoles: string[] | null }>;
  transitions: Array<{ id: number; fromStageId: number; toStageId: number; allowedRoles: string[] | null }>;
};

function rolesTextToArray(text: string): string[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const roles = trimmed
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return roles.length > 0 ? roles : null;
}

function rolesArrayToText(roles: string[] | null | undefined): string {
  return roles && roles.length > 0 ? roles.join(", ") : "";
}

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("reports");
  const [activityType, setActivityType] = useState("");

  const [createStages, setCreateStages] = useState<WorkflowStageEditorRow[]>([
    { name: "Field report submitted", allowedRolesText: "field_agent" },
    { name: "Acknowledge", allowedRolesText: "user" },
    { name: "Review", allowedRolesText: "analyst" },
    { name: "Approve", allowedRolesText: "coordinator" },
  ]);
  const [createTransitions, setCreateTransitions] = useState<WorkflowTransitionEditorRow[]>([]);

  const [editName, setEditName] = useState("");
  const [editEntityType, setEditEntityType] = useState("reports");
  const [editActivityType, setEditActivityType] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editStages, setEditStages] = useState<WorkflowStageEditorRow[]>([]);
  const [editTransitions, setEditTransitions] = useState<WorkflowTransitionEditorRow[]>([]);

  const { data: templates = [], isLoading } = useQuery<WorkflowTemplateRow[]>({
    queryKey: ["/api/workflows/templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/workflows/templates");
      return res.json();
    },
  });

  const { data: selectedGraph } = useQuery<WorkflowTemplateGraph>({
    queryKey: selectedTemplateId ? ["/api/workflows/templates", selectedTemplateId] : ["/api/workflows/templates", "none"],
    enabled: selectedTemplateId != null,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/workflows/templates/${selectedTemplateId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to load workflow");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (createStages.length < 1) throw new Error("At least one stage is required");

      const stages = createStages.map((s, idx) => ({
        name: s.name.trim(),
        stageOrder: idx + 1,
        allowedRoles: rolesTextToArray(s.allowedRolesText),
      }));
      if (stages.some((s) => !s.name)) throw new Error("Stage names cannot be empty");

      const transitions =
        createTransitions.length > 0
          ? createTransitions.map((t) => ({
              fromStageOrder: t.fromStageOrder,
              toStageOrder: t.toStageOrder,
              allowedRoles: rolesTextToArray(t.allowedRolesText),
            }))
          : null;

      const payload = {
        name: name.trim(),
        entityType,
        activityType: activityType.trim() || null,
        isActive: true,
        stages,
        transitions,
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
      setCreateStages([
        { name: "Field report submitted", allowedRolesText: "field_agent" },
        { name: "Acknowledge", allowedRolesText: "user" },
        { name: "Review", allowedRolesText: "analyst" },
        { name: "Approve", allowedRolesText: "coordinator" },
      ]);
      setCreateTransitions([]);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (selectedTemplateId == null) throw new Error("No template selected");
      if (!editName.trim()) throw new Error("Name is required");
      if (editStages.length < 1) throw new Error("At least one stage is required");

      const stages = editStages.map((s, idx) => ({
        name: s.name.trim(),
        stageOrder: idx + 1,
        allowedRoles: rolesTextToArray(s.allowedRolesText),
      }));
      if (stages.some((s) => !s.name)) throw new Error("Stage names cannot be empty");

      const transitions =
        editTransitions.length > 0
          ? editTransitions.map((t) => ({
              fromStageOrder: t.fromStageOrder,
              toStageOrder: t.toStageOrder,
              allowedRoles: rolesTextToArray(t.allowedRolesText),
            }))
          : null;

      const payload = {
        name: editName.trim(),
        entityType: editEntityType,
        activityType: editActivityType.trim() || null,
        isActive: editIsActive,
        stages,
        transitions,
      };

      const res = await apiRequest("PUT", `/api/workflows/templates/${selectedTemplateId}`, payload);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to update workflow");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/templates"] });
      if (selectedTemplateId != null) {
        queryClient.invalidateQueries({ queryKey: ["/api/workflows/templates", selectedTemplateId] });
      }
      toast({ title: "Workflow updated" });
      setEditOpen(false);
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const stageOptions = useMemo(() => {
    return editStages.map((s, idx) => ({ stageOrder: idx + 1, label: `${idx + 1}. ${s.name || "(unnamed)"}` }));
  }, [editStages]);

  const createStageOptions = useMemo(() => {
    return createStages.map((s, idx) => ({ stageOrder: idx + 1, label: `${idx + 1}. ${s.name || "(unnamed)"}` }));
  }, [createStages]);

  const canAddTransitionInCreate = createStages.length >= 2;
  const canAddTransitionInEdit = editStages.length >= 2;

  function openEditorForTemplate(id: number) {
    setSelectedTemplateId(id);
    setEditOpen(true);
  }

  function moveStage(list: WorkflowStageEditorRow[], setList: (next: WorkflowStageEditorRow[]) => void, index: number, dir: -1 | 1) {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    const next = list.slice();
    const tmp = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = tmp;
    setList(next);
  }

  function deleteStage(
    list: WorkflowStageEditorRow[],
    setList: (next: WorkflowStageEditorRow[]) => void,
    transitions: WorkflowTransitionEditorRow[],
    setTransitions: (next: WorkflowTransitionEditorRow[]) => void,
    index: number,
  ) {
    const stageOrderToRemove = index + 1;
    const nextStages = list.slice();
    nextStages.splice(index, 1);
    setList(nextStages);

    // Drop transitions that referenced that stageOrder and re-map any stageOrders above it.
    const nextTransitions = transitions
      .filter((t) => t.fromStageOrder !== stageOrderToRemove && t.toStageOrder !== stageOrderToRemove)
      .map((t) => ({
        ...t,
        fromStageOrder: t.fromStageOrder > stageOrderToRemove ? t.fromStageOrder - 1 : t.fromStageOrder,
        toStageOrder: t.toStageOrder > stageOrderToRemove ? t.toStageOrder - 1 : t.toStageOrder,
      }));
    setTransitions(nextTransitions);
  }

  // When the selected graph loads, populate editor state.
  useEffect(() => {
    if (!editOpen) return;
    if (!selectedGraph) return;

    setEditName(selectedGraph.template.name ?? "");
    setEditEntityType(selectedGraph.template.entityType ?? "reports");
    setEditActivityType(selectedGraph.template.activityType ?? "");
    setEditIsActive(!!selectedGraph.template.isActive);

    const sortedStages = selectedGraph.stages.slice().sort((a, b) => a.stageOrder - b.stageOrder);
    setEditStages(
      sortedStages.map((s) => ({
        name: s.name,
        allowedRolesText: rolesArrayToText(s.allowedRoles),
      }))
    );

    const stageIdToOrder = new Map<number, number>();
    for (const s of sortedStages) stageIdToOrder.set(s.id, s.stageOrder);
    setEditTransitions(
      (selectedGraph.transitions || [])
        .map((t) => ({
          fromStageOrder: stageIdToOrder.get(t.fromStageId) ?? 1,
          toStageOrder: stageIdToOrder.get(t.toStageId) ?? 1,
          allowedRolesText: rolesArrayToText(t.allowedRoles),
        }))
        .filter((t) => t.fromStageOrder !== t.toStageOrder)
    );
  }, [editOpen, selectedGraph]);

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
                    <TableHead></TableHead>
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
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEditorForTemplate(t.id)}>
                          Edit
                        </Button>
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
                <div className="flex items-center justify-between gap-3">
                  <Label>Stages</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateStages((s) => [...s, { name: "", allowedRolesText: "" }])}
                  >
                    Add Stage
                  </Button>
                </div>

                <div className="space-y-3">
                  {createStages.map((s, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">Stage {idx + 1}</div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => moveStage(createStages, setCreateStages, idx, -1)}>
                              Up
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => moveStage(createStages, setCreateStages, idx, 1)}>
                              Down
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteStage(createStages, setCreateStages, createTransitions, setCreateTransitions, idx)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={s.name}
                              onChange={(e) => {
                                const next = createStages.slice();
                                next[idx] = { ...next[idx], name: e.target.value };
                                setCreateStages(next);
                              }}
                              placeholder="e.g. Review"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Allowed Roles (optional)</Label>
                            <Input
                              value={s.allowedRolesText}
                              onChange={(e) => {
                                const next = createStages.slice();
                                next[idx] = { ...next[idx], allowedRolesText: e.target.value };
                                setCreateStages(next);
                              }}
                              placeholder="e.g. analyst, coordinator"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transitions (Movement)</CardTitle>
                  <CardDescription>
                    Add the exact movements you want. If you leave this empty, the system will create a default linear flow.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Define allowed stage-to-stage movements.</div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canAddTransitionInCreate}
                      onClick={() => {
                        const from = 1;
                        const to = 2;
                        setCreateTransitions((t) => [...t, { fromStageOrder: from, toStageOrder: to, allowedRolesText: "" }]);
                      }}
                    >
                      Add Transition
                    </Button>
                  </div>

                  {createTransitions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No transitions defined</div>
                  ) : (
                    <div className="space-y-3">
                      {createTransitions.map((t, idx) => (
                        <Card key={idx}>
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">Transition {idx + 1}</div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const next = createTransitions.slice();
                                  next.splice(idx, 1);
                                  setCreateTransitions(next);
                                }}
                              >
                                Delete
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>From</Label>
                                <Select
                                  value={String(t.fromStageOrder)}
                                  onValueChange={(v) => {
                                    const next = createTransitions.slice();
                                    next[idx] = { ...next[idx], fromStageOrder: parseInt(v, 10) };
                                    setCreateTransitions(next);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {createStageOptions.map((s) => (
                                      <SelectItem key={s.stageOrder} value={String(s.stageOrder)}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>To</Label>
                                <Select
                                  value={String(t.toStageOrder)}
                                  onValueChange={(v) => {
                                    const next = createTransitions.slice();
                                    next[idx] = { ...next[idx], toStageOrder: parseInt(v, 10) };
                                    setCreateTransitions(next);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {createStageOptions.map((s) => (
                                      <SelectItem key={s.stageOrder} value={String(s.stageOrder)}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Allowed Roles (optional)</Label>
                                <Input
                                  value={t.allowedRolesText}
                                  onChange={(e) => {
                                    const next = createTransitions.slice();
                                    next[idx] = { ...next[idx], allowedRolesText: e.target.value };
                                    setCreateTransitions(next);
                                  }}
                                  placeholder="e.g. coordinator"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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

        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setSelectedTemplateId(null);
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Edit Workflow</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Entity Type</Label>
                  <Select value={editEntityType} onValueChange={setEditEntityType}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Activity Type (optional)</Label>
                  <Input value={editActivityType} onChange={(e) => setEditActivityType(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editIsActive ? "active" : "inactive"} onValueChange={(v) => setEditIsActive(v === "active")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Stages</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditStages((s) => [...s, { name: "", allowedRolesText: "" }])}>
                      Add Stage
                    </Button>
                  </div>
                  <CardDescription>Add, remove, rename, and reorder stages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editStages.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No stages</div>
                  ) : (
                    editStages.map((s, idx) => (
                      <Card key={idx}>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium">Stage {idx + 1}</div>
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => moveStage(editStages, setEditStages, idx, -1)}>
                                Up
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => moveStage(editStages, setEditStages, idx, 1)}>
                                Down
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteStage(editStages, setEditStages, editTransitions, setEditTransitions, idx)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input
                                value={s.name}
                                onChange={(e) => {
                                  const next = editStages.slice();
                                  next[idx] = { ...next[idx], name: e.target.value };
                                  setEditStages(next);
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Allowed Roles (optional)</Label>
                              <Input
                                value={s.allowedRolesText}
                                onChange={(e) => {
                                  const next = editStages.slice();
                                  next[idx] = { ...next[idx], allowedRolesText: e.target.value };
                                  setEditStages(next);
                                }}
                                placeholder="e.g. analyst, coordinator"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">Transitions (Movement)</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canAddTransitionInEdit}
                      onClick={() => setEditTransitions((t) => [...t, { fromStageOrder: 1, toStageOrder: 2, allowedRolesText: "" }])}
                    >
                      Add Transition
                    </Button>
                  </div>
                  <CardDescription>Define allowed movements between stages (non-linear is supported).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editTransitions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No transitions defined (default linear flow will be used)</div>
                  ) : (
                    <div className="space-y-3">
                      {editTransitions.map((t, idx) => (
                        <Card key={idx}>
                          <CardContent className="pt-6 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-sm font-medium">Transition {idx + 1}</div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const next = editTransitions.slice();
                                  next.splice(idx, 1);
                                  setEditTransitions(next);
                                }}
                              >
                                Delete
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>From</Label>
                                <Select
                                  value={String(t.fromStageOrder)}
                                  onValueChange={(v) => {
                                    const next = editTransitions.slice();
                                    next[idx] = { ...next[idx], fromStageOrder: parseInt(v, 10) };
                                    setEditTransitions(next);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {stageOptions.map((s) => (
                                      <SelectItem key={s.stageOrder} value={String(s.stageOrder)}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>To</Label>
                                <Select
                                  value={String(t.toStageOrder)}
                                  onValueChange={(v) => {
                                    const next = editTransitions.slice();
                                    next[idx] = { ...next[idx], toStageOrder: parseInt(v, 10) };
                                    setEditTransitions(next);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {stageOptions.map((s) => (
                                      <SelectItem key={s.stageOrder} value={String(s.stageOrder)}>
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Allowed Roles (optional)</Label>
                                <Input
                                  value={t.allowedRolesText}
                                  onChange={(e) => {
                                    const next = editTransitions.slice();
                                    next[idx] = { ...next[idx], allowedRolesText: e.target.value };
                                    setEditTransitions(next);
                                  }}
                                  placeholder="e.g. coordinator"
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
