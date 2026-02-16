import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageTemplate from "@/components/modules/PageTemplate";
import { Folder, CheckSquare, PenSquare, Link as LinkIcon, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Case, CaseNote, Incident, User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CaseManagementPage() {
  const [activeTab, setActiveTab] = useState("followup");
  const [showNewCase, setShowNewCase] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [newNote, setNewNote] = useState("");
  const { toast } = useToast();

  const { data: cases = [], isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const selectedCase = selectedCaseId ? cases.find((c) => c.id === selectedCaseId) : undefined;

  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/public/incidents"],
  });

  const incidentsById = new Map<number, Incident>();
  for (const i of incidents) incidentsById.set(i.id, i);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users");
        if (!res.ok) return [];
        return res.json();
      } catch {
        return [];
      }
    },
  });

  const usersById = new Map<number, User>();
  for (const u of users) usersById.set(u.id, u);

  const { data: notes = [], isLoading: isLoadingNotes } = useQuery<CaseNote[]>({
    queryKey: selectedCaseId ? [`/api/cases/${selectedCaseId}/notes`] : ["/api/cases/none/notes"],
    enabled: Boolean(selectedCaseId),
    queryFn: async () => {
      if (!selectedCaseId) return [];
      const res = await apiRequest("GET", `/api/cases/${selectedCaseId}/notes`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cases", {
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        status: "open",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setShowNewCase(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      toast({ title: "Case created" });
    },
    onError: (err: any) => {
      const message = typeof err?.message === "string" ? err.message : "Failed to create case";
      toast({ title: "Create failed", description: message, variant: "destructive" });
    },
  });

  const updateCaseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Case> }) => {
      const res = await apiRequest("PUT", `/api/cases/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    },
    onError: (err: any) => {
      const message = typeof err?.message === "string" ? err.message : "Failed to update case";
      toast({ title: "Update failed", description: message, variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCaseId) throw new Error("No case selected");
      const res = await apiRequest("POST", `/api/cases/${selectedCaseId}/notes`, { note: newNote });
      return res.json();
    },
    onSuccess: () => {
      if (selectedCaseId) {
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${selectedCaseId}/notes`] });
      }
      setNewNote("");
      toast({ title: "Note added" });
    },
    onError: (err: any) => {
      const message = typeof err?.message === "string" ? err.message : "Failed to add note";
      toast({ title: "Note failed", description: message, variant: "destructive" });
    },
  });
  
  const toolbar = (
    <>
      <Button variant="outline">
        <Folder className="h-4 w-4 mr-2" />
        Import Cases
      </Button>
      <Button onClick={() => setShowNewCase(true)}>
        <PenSquare className="h-4 w-4 mr-2" />
        New Case
      </Button>
    </>
  );
  
  // Format date for display
  const formatDate = (dateValue: string | Date) => {
    return new Date(dateValue).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };
  
  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "open":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Open</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-neutral-50 text-neutral-700 hover:bg-neutral-50">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Priority badge styling
  const getPriorityBadge = (priority: string) => {
    switch(priority) {
      case "critical":
        return <Badge className="bg-red-100 text-red-800">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };
  
  return (
    <PageTemplate 
      title="Case Management"
      description="Track, document, and resolve conflict cases"
      toolbar={toolbar}
    >
      <Dialog open={showNewCase} onOpenChange={setShowNewCase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Case</DialogTitle>
            <DialogDescription>Create a case to track follow-up and resolution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Title</div>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Case title" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Description</div>
              <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What happened?" />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Priority</div>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCase(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createCaseMutation.mutate()}
              disabled={createCaseMutation.isPending || newTitle.trim().length === 0}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1">
          <TabsTrigger value="followup" className="py-2">
            <CheckSquare className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Follow-up Logs</span>
            <span className="md:hidden">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="py-2">
            <PenSquare className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Status Tracking</span>
            <span className="md:hidden">Status</span>
          </TabsTrigger>
          <TabsTrigger value="attachments" className="py-2">
            <MessageSquare className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Notes & Attachments</span>
            <span className="md:hidden">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="linked" className="py-2">
            <LinkIcon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Linked Cases</span>
            <span className="md:hidden">Linked</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="followup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Follow-up Logs</CardTitle>
              <CardDescription>
                Track and document conflict case follow-up activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading cases...</div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Linked Incident</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((caseItem) => (
                    <TableRow
                      key={caseItem.id}
                      className={selectedCaseId === caseItem.id ? "bg-emerald-50/40" : undefined}
                      onClick={() => setSelectedCaseId(caseItem.id)}
                    >
                      <TableCell className="font-medium">{caseItem.title}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <Select
                          value={caseItem.incidentId ? String(caseItem.incidentId) : "none"}
                          onValueChange={(v) => {
                            const incidentId = v === "none" ? null : parseInt(v);
                            updateCaseMutation.mutate({ id: caseItem.id, data: { incidentId } });
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Link incident" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {incidents.map((i) => (
                              <SelectItem key={i.id} value={String(i.id)}>
                                {i.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {caseItem.incidentId && incidentsById.get(caseItem.incidentId) ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {incidentsById.get(caseItem.incidentId)!.region}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{getStatusBadge(caseItem.status)}</TableCell>
                      <TableCell>{getPriorityBadge(caseItem.priority)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <Select
                          value={caseItem.assignedTo ? String(caseItem.assignedTo) : "none"}
                          onValueChange={(v) => {
                            const assignedTo = v === "none" ? null : parseInt(v);
                            updateCaseMutation.mutate({ id: caseItem.id, data: { assignedTo } });
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Assign" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {users.length > 0 ? (
                              users.map((u) => (
                                <SelectItem key={u.id} value={String(u.id)}>
                                  {u.fullName}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value={caseItem.assignedTo ? String(caseItem.assignedTo) : "none"}>
                                {caseItem.assignedTo ? `User #${caseItem.assignedTo}` : "No users available"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {caseItem.assignedTo && usersById.get(caseItem.assignedTo) ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {usersById.get(caseItem.assignedTo)!.role}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{formatDate(caseItem.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateCaseMutation.mutate({
                              id: caseItem.id,
                              data: {
                                status:
                                  caseItem.status === "open"
                                    ? "in_progress"
                                    : caseItem.status === "in_progress"
                                      ? "resolved"
                                      : caseItem.status === "resolved"
                                        ? "closed"
                                        : "open",
                              },
                            })
                          }
                          disabled={updateCaseMutation.isPending}
                        >
                          Next Status
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Open Cases</CardTitle>
                <CardDescription>Cases requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {cases.filter(c => c.status === "open").length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {cases.filter(c => c.status === "open" && c.priority === "high").length} high priority
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">In Progress</CardTitle>
                <CardDescription>Cases currently being addressed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {cases.filter(c => c.status === "in_progress").length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {cases.filter(c => c.status === "in_progress" && c.priority === "critical").length} critical priority
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resolved</CardTitle>
                <CardDescription>Successfully resolved cases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {cases.filter(c => c.status === "resolved" || c.status === "closed").length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  In the past 30 days
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Tracking & Resolution Reports</CardTitle>
              <CardDescription>
                Track case status changes and document resolutions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 text-center">
                <div>
                  <PenSquare className="h-20 w-20 text-blue-400 mx-auto mb-4 opacity-70" />
                  <h3 className="text-lg font-medium">Status Tracking Module</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    This module will provide case status workflow tracking, resolution documentation, and performance metrics reporting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attachments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Notes and Attachments</CardTitle>
              <CardDescription>
                Add notes, reports, and file attachments to cases
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCase ? (
                <div className="text-sm text-muted-foreground">Select a case from the Follow-up Logs tab to view and add notes.</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border p-4">
                    <div className="font-medium">{selectedCase.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {selectedCase.description || "No description"}
                    </div>
                    {selectedCase.incidentId && incidentsById.get(selectedCase.incidentId) ? (
                      <div className="text-sm text-muted-foreground mt-2">
                        Linked incident: {incidentsById.get(selectedCase.incidentId)!.title}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Add note</div>
                    <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Type a note..." />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => addNoteMutation.mutate()}
                        disabled={addNoteMutation.isPending || newNote.trim().length === 0}
                      >
                        Add Note
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Notes</div>
                    {isLoadingNotes ? (
                      <div className="text-sm text-muted-foreground">Loading notes...</div>
                    ) : notes.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No notes yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((n) => (
                          <div key={n.id} className="rounded-md border p-3">
                            <div className="text-sm">{n.note}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              By {usersById.get(n.authorId)?.fullName || `User #${n.authorId}`} • {formatDate(n.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="linked" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linked Cases and Conflict Chains</CardTitle>
              <CardDescription>
                Identify relationships between cases and track conflict evolution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-6 text-center">
                <div>
                  <LinkIcon className="h-20 w-20 text-blue-400 mx-auto mb-4 opacity-70" />
                  <h3 className="text-lg font-medium">Linked Cases Module</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    This module will provide case linking, conflict chain visualization, and relationship mapping between related incidents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTemplate>
  );
}