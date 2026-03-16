import { useState } from "react";
import { useRoute, Link } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Send,
  MessageSquare,
  UserCheck,
  ArrowRight,
  CheckCircle,
  RotateCcw,
  Loader2,
  MapPin,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import type { Incident, User } from "@shared/schema";
import { KINETIC_AGENCIES } from "@/lib/kinetic-agencies";

type IncidentWithWorkflow = Incident & {
  processingStatus?: string;
  proposedResponderType?: string;
  finalResponderType?: string;
  assignedResponderTeamId?: number | null;
  supervisorId?: number | null;
  coordinatorId?: number | null;
  routedAt?: string | null;
};

type CommentItem = {
  id: number;
  incidentId: number;
  authorId: number;
  role: string;
  comment: string;
  createdAt: string;
  authorName?: string;
};

type ResponseTeam = {
  id: number;
  name: string;
  type: string;
  responseCategory?: string | null;
  status: string;
  region: string;
  location: string;
};

function isSupervisorOrAbove(user: User | null): boolean {
  if (!user) return false;
  return user.role === "admin" || (user as any).securityLevel >= 5;
}

function isCoordinatorOrAbove(user: User | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "coordinator" || (user as any).securityLevel >= 6;
}

export default function IncidentDetailPage() {
  const [, params] = useRoute("/incidents/:id");
  const incidentId = params?.id ? parseInt(params.id, 10) : null;
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentText, setCommentText] = useState("");
  const [dispatchTeamId, setDispatchTeamId] = useState<string>("");
  const [dispatchType, setDispatchType] = useState<"kinetic" | "non_kinetic" | "mixed">("non_kinetic");
  const [routeComment, setRouteComment] = useState("");
  const [dispatchAgencies, setDispatchAgencies] = useState<string[]>([]);

  const { data: incident, isLoading: loadingIncident, error: incidentError } = useQuery<IncidentWithWorkflow>({
    queryKey: incidentId != null ? [`/api/incidents/${incidentId}`] : ["skip"],
    enabled: incidentId != null && !Number.isNaN(incidentId),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/incidents/${incidentId}`);
      return res.json();
    },
  });

  const { data: comments = [], refetch: refetchComments } = useQuery<CommentItem[]>({
    queryKey: incidentId != null ? [`/api/incidents/${incidentId}/comments`] : ["skip"],
    enabled: incidentId != null && !Number.isNaN(incidentId),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/incidents/${incidentId}/comments`);
      return res.json();
    },
  });

  const { data: teams = [] } = useQuery<ResponseTeam[]>({
    queryKey: ["/api/response-teams"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/response-teams");
      return res.json();
    },
    enabled: isCoordinatorOrAbove(user) && incidentId != null,
  });

  const dispatchAgenciesMutation = useMutation({
    mutationFn: async () => {
      if (incidentId == null) throw new Error("Missing incident id");
      const res = await apiRequest("POST", `/api/incidents/${incidentId}/dispatch-to-agencies`, {
        agencies: dispatchAgencies,
        comment: routeComment.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Incident dispatched to agencies" });
      setDispatchAgencies([]);
    },
    onError: (e: Error) => toast({ title: "Dispatch failed", description: e.message, variant: "destructive" }),
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const res = await apiRequest("POST", `/api/incidents/${incidentId}/comments`, { comment });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}/comments`] });
      setCommentText("");
      toast({ title: "Comment added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add comment", description: err.message, variant: "destructive" });
    },
  });

  const routeMutation = useMutation({
    mutationFn: async (body: {
      action: string;
      proposedResponderType?: string;
      finalResponderType?: string;
      assignedResponderTeamId?: number;
      comment?: string;
    }) => {
      const res = await apiRequest("PUT", `/api/incidents/${incidentId}/route`, body);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/responders/assignments"] });
      if (variables.comment) {
        queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}/comments`] });
      }
      toast({ title: "Status updated" });
      setRouteComment("");
      if (variables.action === "approve_and_dispatch") {
        setDispatchTeamId("");
      }
    },
    onError: (err: Error) => {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (processingStatus: string) => {
      const res = await apiRequest("PUT", `/api/incidents/${incidentId}`, { processingStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}`] });
      toast({ title: "Processing status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  if (incidentId == null || Number.isNaN(incidentId)) {
    return (
      <MainLayout title="Incident">
        <div className="container max-w-4xl py-6">
          <p className="text-muted-foreground">Invalid incident ID.</p>
          <Link href="/incident-review">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Incident Review
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (loadingIncident) {
    return (
      <MainLayout title="Incident">
        <div className="container max-w-4xl py-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (incidentError || !incident) {
    return (
      <MainLayout title="Incident">
        <div className="container max-w-4xl py-6">
          <p className="text-destructive">Incident not found or you don’t have access.</p>
          <Link href="/incident-review">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Incident Review
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const status = incident.processingStatus ?? "draft";
  const canStartAnalysis = user && status === "draft";
  const canMarkAnalysisComplete = user && status === "under_analysis";
  const canSendToSupervisor =
    user && (status === "under_analysis" || status === "analysis_complete");
  const canForwardToCoordinator =
    user && isSupervisorOrAbove(user) && status === "supervisor_review";
  const canApproveAndDispatch =
    user && isCoordinatorOrAbove(user) && status === "coordinator_review";
  const canSendBack = user && isSupervisorOrAbove(user) && (status === "supervisor_review" || status === "coordinator_review");

  return (
    <MainLayout title={incident.title ?? "Incident details"}>
      <div className="container max-w-4xl py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/incident-review">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl">{incident.title}</CardTitle>
              <Badge variant="outline">{incident.severity}</Badge>
              <Badge variant="secondary">{incident.status}</Badge>
              <Badge variant="outline">
                {status.replace(/_/g, " ")}
              </Badge>
              {incident.proposedResponderType && (
                <Badge variant="outline">Proposed: {incident.proposedResponderType}</Badge>
              )}
              {incident.finalResponderType && (
                <Badge variant="default">Dispatched: {incident.finalResponderType}</Badge>
              )}
            </div>
            <CardDescription>{incident.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{incident.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {incident.reportedAt
                    ? format(new Date(incident.reportedAt), "PPp")
                    : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Routing actions */}
        {(canStartAnalysis || canMarkAnalysisComplete || canSendToSupervisor || canForwardToCoordinator || canApproveAndDispatch || canSendBack) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Workflow actions
              </CardTitle>
              <CardDescription>
                Move this incident through the responder workflow. Optional comment is added to the discussion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Optional comment for this action
                </label>
                <Textarea
                  placeholder="Add a note (optional)"
                  value={routeComment}
                  onChange={(e) => setRouteComment(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {canApproveAndDispatch && (
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assign to team</label>
                    <Select value={dispatchTeamId} onValueChange={setDispatchTeamId}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name} ({t.responseCategory ?? t.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Responder type</label>
                    <Select
                      value={dispatchType}
                      onValueChange={(v: "kinetic" | "non_kinetic" | "mixed") => setDispatchType(v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kinetic">Kinetic</SelectItem>
                        <SelectItem value="non_kinetic">Non-kinetic</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      routeMutation.mutate({
                        action: "approve_and_dispatch",
                        assignedResponderTeamId: parseInt(dispatchTeamId, 10),
                        finalResponderType: dispatchType,
                        comment: routeComment.trim() || undefined,
                      })
                    }
                    disabled={!dispatchTeamId || routeMutation.isPending}
                  >
                    {routeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Approve and dispatch
                  </Button>
                </div>
              )}

              {isCoordinatorOrAbove(user) && incidentId != null && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Actionable incident dispatch</p>
                      <p className="text-xs text-muted-foreground">Send this incident to one or more responder agencies.</p>
                    </div>
                    <Button
                      variant="default"
                      onClick={() => dispatchAgenciesMutation.mutate()}
                      disabled={dispatchAgencies.length === 0 || dispatchAgenciesMutation.isPending}
                    >
                      {dispatchAgenciesMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send to agencies
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {KINETIC_AGENCIES.map((a) => {
                      const checked = dispatchAgencies.includes(a.slug);
                      return (
                        <label key={a.slug} className="flex items-center gap-2 text-sm rounded-md border px-3 py-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const nextChecked = v === true;
                              setDispatchAgencies((prev) => {
                                if (nextChecked) return Array.from(new Set([...prev, a.slug]));
                                return prev.filter((x) => x !== a.slug);
                              });
                            }}
                          />
                          <span>{a.label}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDispatchAgencies(KINETIC_AGENCIES.map((a) => a.slug))}
                    >
                      Select all
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDispatchAgencies([])}>
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {canStartAnalysis && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate("under_analysis")}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Start analysis
                  </Button>
                )}
                {canMarkAnalysisComplete && (
                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate("analysis_complete")}
                    disabled={updateStatusMutation.isPending}
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Mark analysis complete
                  </Button>
                )}
                {canSendToSupervisor && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      routeMutation.mutate({
                        action: "send_to_supervisor",
                        comment: routeComment.trim() || undefined,
                      })
                    }
                    disabled={routeMutation.isPending}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Send to supervisor
                  </Button>
                )}
                {canForwardToCoordinator && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      routeMutation.mutate({
                        action: "forward_to_coordinator",
                        comment: routeComment.trim() || undefined,
                      })
                    }
                    disabled={routeMutation.isPending}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Forward to coordinator
                  </Button>
                )}
                {canSendBack && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      routeMutation.mutate({
                        action: "send_back",
                        comment: routeComment.trim() || undefined,
                      })
                    }
                    disabled={routeMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Send back
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discussion
            </CardTitle>
            <CardDescription>
              Comments from analysts, supervisors, and coordinators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button
                onClick={() => {
                  const t = commentText.trim();
                  if (t) addCommentMutation.mutate(t);
                }}
                disabled={!commentText.trim() || addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Add comment
              </Button>
            </div>

            <ul className="space-y-3 border-t pt-4">
              {comments.length === 0 ? (
                <li className="text-sm text-muted-foreground">No comments yet.</li>
              ) : (
                comments.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{c.authorName ?? `User ${c.authorId}`}</span>
                      <Badge variant="outline" className="text-xs">
                        {c.role}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {format(new Date(c.createdAt), "PPp")}
                      </span>
                    </div>
                    <p className="text-sm pl-0 break-words">{c.comment}</p>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
