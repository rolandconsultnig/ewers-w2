import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, AlertTriangle, MapPin, Calendar, User } from "lucide-react";
import type { Incident } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function IncidentReviewPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIncidents, setSelectedIncidents] = useState<number[]>([]);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [currentIncidentId, setCurrentIncidentId] = useState<number | null>(null);
  const [filterState, setFilterState] = useState("");
  const [filterLga, setFilterLga] = useState("");
  const [filterReportingMethod, setFilterReportingMethod] = useState<string>("");

  // Fetch pending incidents
  const { data: pendingIncidents = [], isLoading } = useQuery<Incident[]>({
    queryKey: ["/api/incidents/pending-review", filterState, filterLga, filterReportingMethod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterState.trim()) params.set("state", filterState.trim());
      if (filterLga.trim()) params.set("lga", filterLga.trim());
      if (filterReportingMethod) params.set("reportingMethod", filterReportingMethod);

      const url = params.toString()
        ? `/api/incidents/pending-review?${params.toString()}`
        : "/api/incidents/pending-review";

      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  // Fetch review stats
  const { data: stats } = useQuery({
    queryKey: ["/api/incidents/review-stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/incidents/review-stats");
      return await res.json();
    },
  });

  // Accept incident mutation
  const acceptMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/incidents/${id}/accept`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/review-stats"] });
      toast({ title: "Incident Accepted", description: "Incident has been published to the dashboard." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to accept incident", description: error.message, variant: "destructive" });
    },
  });

  // Discard incident mutation
  const discardMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/incidents/${id}/discard`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/review-stats"] });
      setDiscardDialogOpen(false);
      setDiscardReason("");
      toast({ title: "Incident Discarded", description: "Incident has been rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to discard incident", description: error.message, variant: "destructive" });
    },
  });

  // Batch accept mutation
  const batchAcceptMutation = useMutation({
    mutationFn: async (incidentIds: number[]) => {
      const res = await apiRequest("POST", "/api/incidents/batch-accept", { incidentIds });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/review-stats"] });
      setSelectedIncidents([]);
      toast({ title: "Batch Accepted", description: `${data.count} incidents published to dashboard.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to batch accept", description: error.message, variant: "destructive" });
    },
  });

  // Batch discard mutation
  const batchDiscardMutation = useMutation({
    mutationFn: async ({ incidentIds, reason }: { incidentIds: number[]; reason: string }) => {
      const res = await apiRequest("POST", "/api/incidents/batch-discard", { incidentIds, reason });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/pending-review"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents/review-stats"] });
      setSelectedIncidents([]);
      setDiscardDialogOpen(false);
      setDiscardReason("");
      toast({ title: "Batch Discarded", description: `${data.count} incidents rejected.` });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to batch discard", description: error.message, variant: "destructive" });
    },
  });

  const handleToggleSelect = (id: number) => {
    setSelectedIncidents(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAccept = (id: number) => {
    acceptMutation.mutate(id);
  };

  const handleDiscard = (id: number) => {
    setCurrentIncidentId(id);
    setDiscardDialogOpen(true);
  };

  const handleBatchAccept = () => {
    if (selectedIncidents.length === 0) return;
    batchAcceptMutation.mutate(selectedIncidents);
  };

  const handleBatchDiscard = () => {
    if (selectedIncidents.length === 0) return;
    setCurrentIncidentId(null);
    setDiscardDialogOpen(true);
  };

  const confirmDiscard = () => {
    if (currentIncidentId) {
      discardMutation.mutate({ id: currentIncidentId, reason: discardReason });
    } else {
      batchDiscardMutation.mutate({ incidentIds: selectedIncidents, reason: discardReason });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      default: return "bg-blue-100 text-blue-800";
    }
  };

  return (
    <MainLayout title="Incident Review">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.verified || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.rejected || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Actions */}
        {selectedIncidents.length > 0 && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {selectedIncidents.length} incident{selectedIncidents.length > 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBatchAccept}
                    disabled={batchAcceptMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept All
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBatchDiscard}
                    disabled={batchDiscardMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Discard All
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedIncidents([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Incidents List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Incidents for Review</CardTitle>
            <CardDescription>
              Review and approve or discard incidents sourced from automated systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">State</div>
                <Input value={filterState} onChange={(e) => setFilterState(e.target.value)} placeholder="e.g. Lagos" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Local Government (LGA)</div>
                <Input value={filterLga} onChange={(e) => setFilterLga(e.target.value)} placeholder="e.g. Ikeja" />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Incident Report Type</div>
                <Select value={filterReportingMethod} onValueChange={setFilterReportingMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="voice">Voice</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="web_form">Web Form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-neutral-500">Loading incidents...</div>
            ) : pendingIncidents.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No pending incidents to review
              </div>
            ) : (
              <div className="space-y-4">
                {pendingIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedIncidents.includes(incident.id)}
                        onCheckedChange={() => handleToggleSelect(incident.id)}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{incident.title}</h3>
                            <p className="text-sm text-neutral-600 mt-1">{incident.description}</p>
                          </div>
                          <Badge className={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-neutral-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {incident.location}, {incident.region}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(incident.reportedAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {incident.category}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(incident.id)}
                            disabled={acceptMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDiscard(incident.id)}
                            disabled={discardMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Discard
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discard Dialog */}
      <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Incident{selectedIncidents.length > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Please provide a reason for discarding {currentIncidentId ? 'this incident' : `${selectedIncidents.length} incidents`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter reason for discarding..."
            value={discardReason}
            onChange={(e) => setDiscardReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDiscardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDiscard}
              disabled={discardMutation.isPending || batchDiscardMutation.isPending}
            >
              Confirm Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
