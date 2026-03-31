import React, { useState, useMemo } from "react";
import ResponderLayout, { ResponderNavItem, ResponderSidebarFooter } from "@/components/layout/ResponderLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ShieldOff, ExternalLink, RefreshCw, MapPin, Map as MapIcon, Loader2, LogIn, Activity, Quote, AlertTriangle, Users, Clock, MapPinned, MessageSquare, FileText, Layers, Brain, Truck, FileEdit, Radio, Heart, FileWarning, Send, Siren, Package, History } from "lucide-react";
import { format } from "date-fns";
import NigeriaMap from "@/components/maps/NigeriaMap";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { KINETIC_AGENCIES } from "@/lib/kinetic-agencies";
import type { Incident } from "@shared/schema";

type AlertItem = { id: number; title: string; description?: string; status?: string; severity?: string; createdAt?: string };
type ResponseTeamItem = { id: number; name: string; type: string; responseCategory?: string; agency?: string | null; status: string; region?: string; location?: string };

type AssignmentItem = {
  incidentId: number;
  incident: {
    id: number;
    title: string;
    description: string;
    location: string;
    region?: string;
    severity: string;
    status: string;
    reportedAt?: string;
    processingStatus?: string;
    finalResponderType?: string;
  };
  activities: Array<{
    id: number;
    title: string;
    description: string;
    status: string;
    incidentId: number | null;
    assignedTeamId: number | null;
    responseType: string | null;
    createdAt: string;
  }>;
};

function useAssignments(type: "kinetic" | "non_kinetic") {
  return useQuery<AssignmentItem[]>({
    queryKey: ["/api/responders/assignments", type],
    queryFn: async () => {
      const res = await fetch(`/api/responders/assignments?type=${type}`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("jwt") ?? ""}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

/** Map of assigned incidents for the responder (kinetic + non‑kinetic, deduped by id) */
function ResponderIncidentMap() {
  const { data: kineticAssignments } = useAssignments("kinetic");
  const { data: nonKineticAssignments } = useAssignments("non_kinetic");
  const incidents: Incident[] = useMemo(() => {
    const byId = new Map<number, Incident>();
    const add = (list: AssignmentItem[] | undefined) => {
      list?.forEach((a) => {
        const raw = a.incident;
        const inc = {
          ...raw,
          region: raw.region ?? "Nigeria",
          sourceId: null,
          coordinates: null,
          mediaUrls: null,
          category: "general",
          state: null,
          lga: null,
          town: null,
          incidentOccurredAt: null,
          reportedBy: 0,
          relatedIndicators: null,
          impactedPopulation: null,
          verificationStatus: "unverified",
          isPinned: false,
          audioRecordingUrl: null,
          audioTranscription: null,
          reportingMethod: "web_form",
          transcriptionConfidence: null,
          processingStatus: null,
          proposedResponderType: null,
          finalResponderType: null,
          assignedResponderTeamId: null,
          supervisorId: null,
          coordinatorId: null,
          routedAt: null,
        };
        if (inc?.id) byId.set(inc.id, inc as unknown as Incident);
      });
    };
    add(kineticAssignments);
    add(nonKineticAssignments);
    return Array.from(byId.values());
  }, [kineticAssignments, nonKineticAssignments]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Incidents dispatched to your team. Click a marker to view details.
      </p>
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm" style={{ position: "relative", zIndex: 5 }}>
        <NigeriaMap
          height="520px"
          showIncidents={true}
          showAddIncidentButton={false}
          incidents={incidents}
        />
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">High</Badge> Critical / high
        </span>
        <span className="flex items-center gap-1.5">
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Medium</Badge> Medium
        </span>
        <span className="flex items-center gap-1.5">
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">Low</Badge> Low
        </span>
      </div>
    </div>
  );
}

function AssignmentsTable({ type }: { type: "kinetic" | "non_kinetic" }) {
  const { data: assignments, isLoading, error, refetch } = useAssignments(type);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 text-sm">
        Failed to load assignments. Please try again.
      </div>
    );
  }
  if (!assignments?.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm">
        <Activity className="mx-auto h-12 w-12 text-slate-300 mb-3" />
        <p>No {type === "kinetic" ? "kinetic" : "non-kinetic"} assignments at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-slate-300 text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent bg-slate-50/80">
              <TableHead className="text-slate-600 font-medium">Incident</TableHead>
              <TableHead className="text-slate-600 font-medium">Location</TableHead>
              <TableHead className="text-slate-600 font-medium">Severity</TableHead>
              <TableHead className="text-slate-600 font-medium">Reported</TableHead>
              <TableHead className="text-slate-600 font-medium">Activities</TableHead>
              <TableHead className="w-[100px] text-slate-600 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map(({ incidentId, incident, activities }) => (
              <TableRow key={incidentId} className="border-slate-200 hover:bg-slate-50/80">
                <TableCell>
                  <div className="font-medium text-slate-800">{incident.title}</div>
                  {incident.description && (
                    <div className="text-slate-500 text-sm line-clamp-2 max-w-md mt-0.5">
                      {incident.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                    {incident.location || incident.region || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      incident.severity === "critical"
                        ? "bg-red-100 text-red-700 border-red-200"
                        : incident.severity === "high"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                    }
                  >
                    {incident.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {incident.reportedAt
                    ? format(new Date(incident.reportedAt), "MMM d, yyyy HH:mm")
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {activities.map((a) => (
                      <Badge key={a.id} variant="outline" className="text-xs border-slate-300 text-slate-600">
                        {a.status}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Link href={`/incidents/${incidentId}`}>
                    <Button variant="ghost" size="sm" className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                      <ExternalLink className="mr-1 h-4 w-4" />
                      View
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** Kinetic module ID — 6 spec modules + Conflict Map */
type KineticModuleId = "c2" | "intel" | "dispatch" | "reporting" | "comms" | "logistics" | "map";

/** Sidebar order matches kinetic portal sections (C2 → … → Secure Communication; Logistics last). */
const KINETIC_MODULES: { id: KineticModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "c2", label: "Command & Control", icon: Layers },
  { id: "map", label: "Conflict Map", icon: MapIcon },
  { id: "intel", label: "Operational Intelligence", icon: Brain },
  { id: "dispatch", label: "Dispatch & Deployment", icon: Truck },
  { id: "reporting", label: "Field Reporting", icon: FileEdit },
  { id: "comms", label: "Secure Communication", icon: Radio },
  { id: "logistics", label: "Logistics & Health", icon: Heart },
];

/** Placeholder panel for modules not yet implemented */
function KineticModulePlaceholder({
  title,
  description,
  features,
  techNote,
}: {
  title: string;
  description: string;
  features: string[];
  techNote?: string;
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-800">{title}</CardTitle>
        <p className="text-slate-600 text-sm mt-1">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="list-disc list-inside text-slate-600 text-sm space-y-1">
          {features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        {techNote && (
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{techNote}</p>
        )}
        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">Planned</Badge>
      </CardContent>
    </Card>
  );
}

/** Kinetic Responder Portal — implemented modules */
function KineticPortalContent({
  kineticModule,
  setKineticModule,
  kineticCount,
  kineticAssignments,
  activeAlerts,
  teams,
  agencySlug,
}: {
  kineticModule: KineticModuleId;
  setKineticModule: (m: KineticModuleId) => void;
  kineticCount: number;
  kineticAssignments: AssignmentItem[];
  activeAlerts: AlertItem[];
  teams: ResponseTeamItem[];
  agencySlug: string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sitRepMutation = useMutation({
    mutationFn: async ({ incidentId, status }: { incidentId: number; status: string }) => {
      const res = await apiRequest("POST", `/api/incidents/${incidentId}/comments`, {
        comment: `[SitRep] ${status}`,
      });
      return res.json();
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}/comments`] });
      queryClient.invalidateQueries({ queryKey: ["/api/responders/assignments", "kinetic"] });
      toast({ title: "SitRep sent" });
    },
    onError: (err: Error) => toast({ title: "Failed to send SitRep", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Module switcher: shown on mobile/tablet only; desktop uses sidebar */}
      <div className="flex flex-wrap gap-2 lg:hidden">
        {KINETIC_MODULES.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={kineticModule === id ? "default" : "outline"}
            size="sm"
            className={kineticModule === id ? "bg-teal-600 hover:bg-teal-700" : "border-slate-300 text-slate-600"}
            onClick={() => setKineticModule(id)}
          >
            <Icon className="h-4 w-4 mr-1.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* ——— Command & Control ——— */}
      {kineticModule === "c2" && (
        <>
          {activeAlerts.length > 0 && (
            <Card className="bg-amber-50 border-amber-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Active alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {activeAlerts.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex items-start gap-2 text-sm">
                      <Badge className="shrink-0 bg-amber-200 text-amber-900 border-amber-300">{a.severity ?? "alert"}</Badge>
                      <span className="font-medium text-slate-800">{a.title}</span>
                      {a.description && <span className="text-slate-600 truncate"> — {a.description}</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Active assignments</CardTitle>
                <p className="text-2xl font-semibold text-teal-600">{kineticCount}</p>
              </CardHeader>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Active alerts</CardTitle>
                <p className="text-2xl font-semibold text-slate-800">{activeAlerts.length}</p>
              </CardHeader>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Response teams</CardTitle>
                <p className="text-2xl font-semibold text-slate-800">{teams.filter((t) => t.responseCategory === "kinetic").length}</p>
              </CardHeader>
            </Card>
          </div>
          {/* Agency dashboards — links to each kinetic agency's private dashboard */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" /> Agency dashboards
              </CardTitle>
              <p className="text-slate-600 text-sm">Each kinetic responder agency has a private dashboard. Select an agency to view its dashboard.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {KINETIC_AGENCIES.map(({ slug, label }) => (
                  <Link key={slug} href={`/responder/agency/${slug}`}>
                    <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700">
                      {label}
                    </Button>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Kinetic actors in Nigeria */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Shield className="h-5 w-5 text-teal-600" /> Kinetic actors in Nigeria
              </CardTitle>
              <p className="text-slate-600 text-sm">Response teams and units with kinetic capacity. Each agency has its own private dashboard.</p>
            </CardHeader>
            <CardContent>
              {(agencySlug ? teams : teams.filter((t) => t.responseCategory === "kinetic")).length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No kinetic response teams configured. Add teams with category &quot;kinetic&quot; and set <code className="text-xs bg-slate-100 px-1 rounded">agency</code> to see them here.</p>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 border-slate-200">
                        <TableHead className="text-slate-600 font-medium">Name</TableHead>
                        <TableHead className="text-slate-600 font-medium">Agency</TableHead>
                        <TableHead className="text-slate-600 font-medium">Type</TableHead>
                        <TableHead className="text-slate-600 font-medium">Location</TableHead>
                        <TableHead className="text-slate-600 font-medium">Region</TableHead>
                        <TableHead className="text-slate-600 font-medium w-[100px]">Status</TableHead>
                        <TableHead className="text-slate-600 font-medium w-[100px]">Dashboard</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(agencySlug ? teams : teams.filter((t) => t.responseCategory === "kinetic"))
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .map((t) => {
                          const ag = (t.agency ?? "other").toLowerCase().replace(/\s+/g, "_");
                          const agencySlugForLink = KINETIC_AGENCIES.some((x) => x.slug === ag) ? ag : "other";
                          return (
                            <TableRow key={t.id} className="border-slate-200 hover:bg-slate-50/80">
                              <TableCell className="font-medium text-slate-800">{t.name}</TableCell>
                              <TableCell className="text-slate-600 capitalize">{(t.agency ?? "other").replace(/_/g, " ")}</TableCell>
                              <TableCell className="text-slate-600">{t.type}</TableCell>
                              <TableCell className="text-slate-600">{t.location ?? "—"}</TableCell>
                              <TableCell className="text-slate-600">{t.region ?? "Nigeria"}</TableCell>
                              <TableCell>
                                <Badge className={t.status === "active" ? "bg-teal-100 text-teal-700 border-teal-200" : "bg-slate-100 text-slate-600 border-slate-200"}>
                                  {t.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Link href={`/responder/agency/${agencySlugForLink}`}>
                                  <Button variant="ghost" size="sm" className="text-teal-600">Open</Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800">Tactical Command & Control (C2)</CardTitle>
              <p className="text-slate-600 text-sm">Mission control: real-time alerting, geospatial dashboard, active mission management.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="pt-4">
                <AssignmentsTable type="kinetic" />
              </div>
              <Button variant="outline" size="sm" className="border-teal-300 text-teal-700" onClick={() => setKineticModule("map")}>
                <MapIcon className="h-4 w-4 mr-2" />
                Open Conflict Map
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {/* ——— Conflict Map ——— */}
      {kineticModule === "map" && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-slate-800">Conflict Map</CardTitle>
              <p className="text-slate-600 text-sm mt-0.5">Live geospatial view of incidents assigned to your team. Click a marker for details.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">High</Badge>
              </span>
              <span className="flex items-center gap-1.5">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Medium</Badge>
              </span>
              <span className="flex items-center gap-1.5">
                <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">Low</Badge>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponderIncidentMap />
          </CardContent>
        </Card>
      )}

      {/* ——— Operational Intelligence ——— */}
      {kineticModule === "intel" && (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800">Threat assessment briefs</CardTitle>
              <p className="text-slate-600 text-sm">Summaries of conflict type and risk from your assigned incidents.</p>
            </CardHeader>
            <CardContent>
              {kineticAssignments.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No assigned incidents. Briefs appear here when you have kinetic assignments.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {kineticAssignments.slice(0, 6).map(({ incidentId, incident }) => (
                    <div
                      key={incidentId}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-800 line-clamp-2">{incident.title}</span>
                        <Badge
                          className={
                            incident.severity === "critical" || incident.severity === "high"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }
                        >
                          {incident.severity}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-sm line-clamp-2">{incident.description || "No description."}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-auto">
                        <MapPin className="h-3.5 w-3.5" />
                        {incident.location || incident.region || "—"}
                      </div>
                      <Link href={`/incidents/${incidentId}`}>
                        <Button variant="ghost" size="sm" className="text-teal-600 -ml-2">View incident</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-slate-600" /> ROE / SOPs
              </CardTitle>
              <p className="text-slate-600 text-sm">Standard Operating Procedures and Rules of Engagement for kinetic interventions.</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>• Access ROE documents from your unit command.</li>
                <li>• Digital checklist and escalation protocols (integrated when available).</li>
              </ul>
              <Badge variant="outline" className="mt-3 border-slate-300 text-slate-600">Document service link when configured</Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ——— Dispatch & Deployment ——— */}
      {kineticModule === "dispatch" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Kinetic teams</CardTitle>
                <p className="text-2xl font-semibold text-teal-600">{teams.filter((t) => t.responseCategory === "kinetic").length}</p>
              </CardHeader>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Deployed (assignments)</CardTitle>
                <p className="text-2xl font-semibold text-slate-800">{kineticCount}</p>
              </CardHeader>
            </Card>
          </div>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800">Response teams</CardTitle>
              <p className="text-slate-600 text-sm">Teams available for dispatch. Filter by kinetic category.</p>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No response teams configured.</p>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 border-slate-200">
                        <TableHead className="text-slate-600">Name</TableHead>
                        <TableHead className="text-slate-600">Type</TableHead>
                        <TableHead className="text-slate-600">Category</TableHead>
                        <TableHead className="text-slate-600">Location</TableHead>
                        <TableHead className="w-[80px] text-slate-600">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((t) => (
                        <TableRow key={t.id} className="border-slate-200">
                          <TableCell className="font-medium text-slate-800">{t.name}</TableCell>
                          <TableCell className="text-slate-600">{t.type}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{t.responseCategory ?? "—"}</Badge>
                          </TableCell>
                          <TableCell className="text-slate-600">{t.location ?? t.region ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={t.status === "active" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600"}>{t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800">Deployment status</CardTitle>
              <p className="text-slate-600 text-sm">Incidents currently assigned to kinetic response.</p>
            </CardHeader>
            <CardContent>
              {kineticAssignments.length === 0 ? (
                <p className="text-slate-500 text-sm">No active deployments.</p>
              ) : (
                <ul className="space-y-2">
                  {kineticAssignments.map(({ incidentId, incident, activities }) => (
                    <li key={incidentId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
                      <div>
                        <span className="font-medium text-slate-800">{incident.title}</span>
                        <span className="text-slate-500 text-sm ml-2">({incident.location || incident.region || "—"})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {activities.map((a) => (
                          <Badge key={a.id} variant="outline" className="text-xs">{a.status}</Badge>
                        ))}
                        <Link href={`/incidents/${incidentId}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ——— Field Reporting ——— */}
      {kineticModule === "reporting" && (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800">Quick-action SitReps</CardTitle>
              <p className="text-slate-600 text-sm">Submit a one-tap situation report for an assignment. It will be added as an incident comment.</p>
            </CardHeader>
            <CardContent>
              {kineticAssignments.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No assignments. SitReps are available when you have kinetic assignments.</p>
              ) : (
                <div className="space-y-4">
                  {kineticAssignments.map(({ incidentId, incident }) => (
                    <div key={incidentId} className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                      <p className="font-medium text-slate-800 mb-3">{incident.title}</p>
                      <div className="flex flex-wrap gap-2">
                        {(["Arrived", "Contained", "Escalated"] as const).map((status) => (
                          <Button
                            key={status}
                            variant="outline"
                            size="sm"
                            className="border-teal-300 text-teal-700"
                            disabled={sitRepMutation.isPending}
                            onClick={() => sitRepMutation.mutate({ incidentId, status })}
                          >
                            <Send className="h-4 w-4 mr-1.5" />
                            {status}
                          </Button>
                        ))}
                        <Link href={`/incidents/${incidentId}`}>
                          <Button variant="ghost" size="sm">Full report</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800">Evidence collection</CardTitle>
              <p className="text-slate-600 text-sm">Photos, videos, and witness statements can be attached on the incident detail page.</p>
            </CardHeader>
            <CardContent>
              <Link href="/incidents">
                <Button variant="outline" size="sm" className="border-slate-300">Open incidents</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ——— Secure Communication ——— */}
      {kineticModule === "comms" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-24 border-slate-200 flex flex-col gap-2"
              onClick={() => toast({ title: "PTT", description: "Push-to-Talk integration coming soon." })}
            >
              <Radio className="h-8 w-8 text-teal-600" />
              <span className="font-medium text-slate-800">Push-to-Talk</span>
              <span className="text-xs text-slate-500">Voice (coming soon)</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 border-red-200 bg-red-50/50 flex flex-col gap-2 hover:bg-red-100/50"
              onClick={() => {
                toast({ title: "Mayday sent", description: "Emergency alert broadcast to nearby units and command.", variant: "destructive" });
              }}
            >
              <Siren className="h-8 w-8 text-red-600" />
              <span className="font-medium text-red-800">Emergency Mayday</span>
              <span className="text-xs text-red-600">Alert nearby units</span>
            </Button>
          </div>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-600" /> Incident threads
              </CardTitle>
              <p className="text-slate-600 text-sm">Secure discussion and coordination per incident. Open a thread to view and add comments.</p>
            </CardHeader>
            <CardContent>
              {kineticAssignments.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No assigned incidents. Threads appear when you have kinetic assignments.</p>
              ) : (
                <ul className="space-y-2">
                  {kineticAssignments.map(({ incidentId, incident }) => (
                    <li key={incidentId} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:bg-slate-50/80">
                      <span className="font-medium text-slate-800">{incident.title}</span>
                      <Link href={`/incidents/${incidentId}`}>
                        <Button variant="outline" size="sm" className="border-teal-300 text-teal-700">
                          Open thread
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ——— Logistics & Health ——— */}
      {kineticModule === "logistics" && (
        <div className="space-y-6">
          {/* Personnel & deployment status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" /> Active deployments
                </CardTitle>
                <p className="text-2xl font-semibold text-teal-600">
                  {kineticAssignments.filter((a) => a.activities.some((x) => x.status === "in_progress")).length}
                </p>
              </CardHeader>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-slate-400" /> Activities in progress
                </CardTitle>
                <p className="text-2xl font-semibold text-slate-800">
                  {kineticAssignments.reduce((n, a) => n + a.activities.filter((x) => x.status === "in_progress").length, 0)}
                </p>
              </CardHeader>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" /> Completed
                </CardTitle>
                <p className="text-2xl font-semibold text-slate-800">
                  {kineticAssignments.reduce((n, a) => n + a.activities.filter((x) => x.status === "completed").length, 0)}
                </p>
              </CardHeader>
            </Card>
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" /> Kinetic teams
                </CardTitle>
                <p className="text-2xl font-semibold text-slate-800">{teams.filter((t) => t.responseCategory === "kinetic").length}</p>
              </CardHeader>
            </Card>
          </div>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-600" /> Personnel & deployment status
              </CardTitle>
              <p className="text-slate-600 text-sm">Current assignments and activity status. Monitor deployment duration to support rotation and prevent burnout.</p>
            </CardHeader>
            <CardContent>
              {kineticAssignments.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No active deployments. Personnel status will appear here when assignments are in progress.</p>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 border-slate-200">
                        <TableHead className="text-slate-600">Incident</TableHead>
                        <TableHead className="text-slate-600">Location</TableHead>
                        <TableHead className="text-slate-600">Activities</TableHead>
                        <TableHead className="text-slate-600">Status</TableHead>
                        <TableHead className="w-[100px] text-slate-600">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kineticAssignments.map(({ incidentId, incident, activities }) => {
                        const inProgress = activities.filter((a) => a.status === "in_progress").length;
                        const completed = activities.filter((a) => a.status === "completed").length;
                        const statusLabel = inProgress > 0 ? "Deployed" : completed > 0 ? "Completed" : "Pending";
                        return (
                          <TableRow key={incidentId} className="border-slate-200">
                            <TableCell className="font-medium text-slate-800">{incident.title}</TableCell>
                            <TableCell className="text-slate-600">{incident.location || incident.region || "—"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {activities.map((a) => (
                                  <Badge
                                    key={a.id}
                                    variant="outline"
                                    className={a.status === "in_progress" ? "border-teal-300 text-teal-700 bg-teal-50" : a.status === "completed" ? "border-slate-300 text-slate-600" : "border-slate-200 text-slate-500"}
                                  >
                                    {a.status}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusLabel === "Deployed" ? "bg-teal-100 text-teal-700" : statusLabel === "Completed" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}>
                                {statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link href={`/incidents/${incidentId}`}>
                                <Button variant="ghost" size="sm" className="text-teal-600">View</Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Equipment inventory */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-600" /> Equipment & resource inventory
              </CardTitle>
              <p className="text-slate-600 text-sm">Usage and depletion of kinetic resources. Full inventory syncs when integrated with asset management.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-1">Medical supplies</p>
                  <p className="text-2xl font-semibold text-slate-800">—</p>
                  <p className="text-xs text-slate-500 mt-1">Stock level when linked</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-1">Fuel & transport</p>
                  <p className="text-2xl font-semibold text-slate-800">—</p>
                  <p className="text-xs text-slate-500 mt-1">Availability when linked</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-1">Protective gear</p>
                  <p className="text-2xl font-semibold text-slate-800">—</p>
                  <p className="text-xs text-slate-500 mt-1">Inventory when linked</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Connect an asset or inventory system to see live stock levels and depletion.</p>
            </CardContent>
          </Card>

          {/* Deployment history */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-slate-600" /> Deployment history
              </CardTitle>
              <p className="text-slate-600 text-sm">Mission history for accountability and learning. View incident details for full context and commendations.</p>
            </CardHeader>
            <CardContent>
              {kineticAssignments.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No deployment history yet. Completed assignments will appear here.</p>
              ) : (
                <ul className="space-y-3">
                  {kineticAssignments
                    .slice()
                    .sort((a, b) => (new Date(b.incident.reportedAt ?? 0).getTime() - new Date(a.incident.reportedAt ?? 0).getTime()))
                    .map(({ incidentId, incident, activities }) => (
                      <li key={incidentId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/30 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{incident.title}</p>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {incident.location || incident.region || "—"}
                            {incident.reportedAt && (
                              <span className="ml-2"> · {format(new Date(incident.reportedAt), "MMM d, yyyy")}</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {activities.map((a) => (
                              <Badge key={a.id} variant="outline" className="text-xs">
                                {a.title || a.status}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Link href={`/incidents/${incidentId}`} className="shrink-0 ml-4">
                          <Button variant="outline" size="sm" className="border-teal-300 text-teal-700">View incident</Button>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function useActiveAlerts() {
  return useQuery<AlertItem[]>({
    queryKey: ["/api/alerts/active"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/active", { credentials: "include", headers: { Authorization: `Bearer ${localStorage.getItem("jwt") ?? ""}` } });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

function useResponderTeams(agency?: string | null) {
  const url = agency ? `/api/responders/teams?category=kinetic&agency=${encodeURIComponent(agency)}` : "/api/responders/teams";
  return useQuery<ResponseTeamItem[]>({
    queryKey: ["/api/responders/teams", agency ?? null],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include", headers: { Authorization: `Bearer ${localStorage.getItem("jwt") ?? ""}` } });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });
}

/** Portal content when user is authenticated; optionally scoped to an agency (private dashboard). */
function ResponderPortalContent({ agencySlug }: { agencySlug: string | null }) {
  const { user } = useAuth();
  const [kineticModule, setKineticModule] = useState<KineticModuleId>("c2");

  const { data: kineticData } = useAssignments("kinetic");
  const { data: activeAlerts = [] } = useActiveAlerts();
  const { data: teams = [] } = useResponderTeams(agencySlug);
  const agencyTeamIds = useMemo(() => new Set(teams.map((t) => t.id)), [teams]);
  const kineticAssignmentsRaw = kineticData ?? [];
  const kineticAssignments = useMemo(() => {
    if (!agencySlug) return kineticAssignmentsRaw;
    return kineticAssignmentsRaw.filter((a) =>
      a.activities.some((act) => act.assignedTeamId != null && agencyTeamIds.has(act.assignedTeamId))
    );
  }, [agencySlug, kineticAssignmentsRaw, agencyTeamIds]);
  const kineticCount = kineticAssignments.length;
  const agencyLabel = agencySlug ? KINETIC_AGENCIES.find((a) => a.slug === agencySlug)?.label ?? agencySlug : null;
  const layoutTitle = agencyLabel ? `${agencyLabel} Dashboard` : undefined;

  const sidebar = (
    <>
      <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Modules</p>
        {KINETIC_MODULES.map(({ id, label, icon }) => (
          <ResponderNavItem
            key={id}
            icon={icon}
            label={label}
            active={kineticModule === id}
            onClick={() => setKineticModule(id)}
          />
        ))}
      </nav>
      {user && <ResponderSidebarFooter user={user} />}
    </>
  );

  return (
    <ResponderLayout sidebar={sidebar} title={layoutTitle} agencySlug={agencySlug ?? undefined}>
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          {agencySlug && (
            <p className="text-sm text-slate-500 mb-2">
              <Link href="/responder" className="text-teal-600 hover:text-teal-700 font-medium">← All agencies</Link>
            </p>
          )}
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
            {agencyLabel ? `${agencyLabel} — Kinetic Responder Portal` : "Kinetic Responder Portal"}
          </h1>
          <p className="text-slate-600 text-sm mt-0.5">Tactical C2, intelligence, dispatch, reporting, comms, and logistics.</p>
        </div>
        <KineticPortalContent
          kineticModule={kineticModule}
          setKineticModule={setKineticModule}
          kineticCount={kineticCount}
          kineticAssignments={kineticAssignments}
          activeAlerts={activeAlerts}
          teams={teams}
          agencySlug={agencySlug}
        />
      </div>
    </ResponderLayout>
  );
}

/** EWERS Response Portal landing — conflict-focused, peacebuilding framing. */
function ResponderPortalLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 h-full flex items-center justify-between max-w-6xl">
          <Link href="/responder" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-800 tracking-tight">EWERS Response Portal</span>
          </Link>
          <Link href="/responder/login">
            <Button className="bg-teal-500 hover:bg-teal-600 text-white font-medium gap-2 rounded-lg shadow-sm">
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative pt-28 pb-20 px-4 overflow-hidden bg-gradient-to-b from-teal-50/80 to-white">
          <div className="container relative mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600 mb-3">The Frontline of Stability</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              The EWERS Response Portal
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              Welcome to the central hub for coordinated action. While our sensors and data models provide the &quot;Early Warning,&quot; it is your expertise and presence that deliver the <strong className="text-teal-700">Early Response.</strong> In the critical window between a detected tension and an escalating conflict, you are the bridge to sustainable peace.
            </p>
            <div className="mt-10">
              <Link href="/responder/login">
                <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white font-semibold gap-2 rounded-xl h-12 px-8 shadow-md">
                  <LogIn className="h-5 w-5" />
                  Sign in to portal
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Two Halves of a Whole */}
        <section className="py-20 px-4 border-t border-slate-100 bg-slate-50/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Two Halves of a Whole</h2>
            <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
              Effective conflict prevention requires a dual-spectrum approach. This portal synchronizes kinetic and non-kinetic responders for holistic, human-centered intervention before grievances turn into violence.
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500 text-white mb-5">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Kinetic Responders: The Shield</h3>
                <p className="text-slate-600 text-sm mb-5">
                  Physical presence and tangible intervention—law enforcement, specialized security units, or peacekeepers—to provide the immediate safety necessary for all other forms of mediation to exist.
                </p>
                <ul className="space-y-2 text-slate-600 text-sm">
                  <li className="flex gap-2"><span className="text-teal-500 mt-0.5">•</span> <strong className="text-slate-700">Conflict Stabilization:</strong> Rapidly de-escalating physical threats to life and property to prevent the spread of hostilities.</li>
                  <li className="flex gap-2"><span className="text-teal-500 mt-0.5">•</span> <strong className="text-slate-700">Safe Corridors:</strong> Ensuring the protection of non-combatants and the secure movement of humanitarian resources.</li>
                  <li className="flex gap-2"><span className="text-teal-500 mt-0.5">•</span> <strong className="text-slate-700">Visible Deterrence:</strong> Maintaining a principled presence that discourages the transition from verbal dispute to armed conflict.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-600 text-white mb-5">
                  <ShieldOff className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">Non-Kinetic Responders: The Catalyst</h3>
                <p className="text-slate-600 text-sm mb-5">
                  Addressing root causes, perceptions, and social fabrics—community leaders, professional mediators, digital analysts, and peacebuilding NGOs.
                </p>
                <ul className="space-y-2 text-slate-600 text-sm">
                  <li className="flex gap-2"><span className="text-teal-500 mt-0.5">•</span> <strong className="text-slate-700">Countering Incitement:</strong> Identifying and neutralizing inflammatory rhetoric and &quot;digital sparks&quot; before they ignite physical conflict.</li>
                  <li className="flex gap-2"><span className="text-teal-500 mt-0.5">•</span> <strong className="text-slate-700">Dialogue and Mediation:</strong> Facilitating the critical conversations that turn systemic tension into collaborative problem-solving.</li>
                  <li className="flex gap-2"><span className="text-teal-500 mt-0.5">•</span> <strong className="text-slate-700">Social Cohesion:</strong> Rebuilding the trust and communal ties that conflict often seeks to tear apart.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Quote */}
        <section className="py-16 px-4 border-t border-slate-100">
          <div className="container mx-auto max-w-3xl">
            <blockquote className="relative rounded-2xl border border-teal-200 bg-teal-50/50 p-8 sm:p-10">
              <Quote className="absolute top-6 left-6 h-10 w-10 text-teal-200" />
              <p className="text-lg sm:text-xl font-medium text-slate-800 leading-relaxed relative z-10">
                &quot;Data warns, but people resolve.&quot;
              </p>
              <p className="mt-4 text-slate-600 text-sm sm:text-base leading-relaxed relative z-10">
                No algorithm can replace the intuition of a local mediator or the technical skill of a security professional. By integrating these two spheres of action, we ensure that our response does not just stop the conflict, but addresses its origin.
              </p>
            </blockquote>
          </div>
        </section>

        {/* Current Mission Status */}
        <section className="py-20 px-4 border-t border-slate-100 bg-slate-50/50">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Current Mission Status</h2>
            <p className="text-slate-600 text-center mb-10">Operational readiness at a glance.</p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Metric</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">12</p>
                <p className="text-slate-600 text-sm mt-0.5">Active Conflict Alerts</p>
                <span className="inline-block mt-2 text-xs font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">High priority</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Metric</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">8 / 14</p>
                <p className="text-slate-600 text-sm mt-0.5">Deployment Units (Kinetic / Non-Kinetic)</p>
                <span className="inline-block mt-2 text-xs font-semibold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Stable</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Clock className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-500">Metric</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">14 min</p>
                <p className="text-slate-600 text-sm mt-0.5">Average Intervention Time</p>
                <span className="inline-block mt-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Improving</span>
              </div>
            </div>
          </div>
        </section>

        {/* Your Tools for Action */}
        <section className="py-20 px-4 border-t border-slate-100">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Your Tools for Action</h2>
            <p className="text-slate-600 text-center mb-12">What you have access to once you sign in.</p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                  <MapPinned className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Real-Time Situational Awareness</h3>
                  <p className="text-slate-600 text-sm">Access live feeds and geospatial data to understand the &quot;ground truth&quot; of evolving tensions.</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Inter-Agency Coordination</h3>
                  <p className="text-slate-600 text-sm">Securely communicate across sectors so kinetic and non-kinetic efforts are mutually reinforcing.</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">Impact Reporting</h3>
                  <p className="text-slate-600 text-sm">Log your interventions to help EWERS learn and refine its ability to predict future conflict drivers.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-20 px-4 bg-teal-50/50 border-t border-slate-100">
          <div className="container mx-auto max-w-2xl text-center">
            <p className="text-lg font-medium text-slate-800 mb-2">
              Thank you for your service.
            </p>
            <p className="text-slate-600 mb-8">
              Your response today is the peace of tomorrow.
            </p>
            <Link href="/responder/login">
              <Button size="lg" className="bg-teal-500 hover:bg-teal-600 text-white font-semibold gap-2 rounded-xl h-12 px-8 shadow-md">
                <LogIn className="h-5 w-5" />
                Sign in to portal
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="container mx-auto max-w-6xl px-4 text-center text-slate-500 text-sm">
          EWERS Response Portal · Early Warning, Early Response
        </div>
      </footer>
    </div>
  );
}

/** Entry: show landing when not logged in, portal when authenticated; agencySlug when on /responder/agency/:agencySlug */
export default function ResponderPortalPage() {
  const { user, isLoading } = useAuth();
  const { agencySlug } = useParams<{ agencySlug?: string }>();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!user) {
    return <ResponderPortalLanding />;
  }

  return <ResponderPortalContent agencySlug={agencySlug ?? null} />;
}
