import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Incident } from "@shared/schema";
import { crisisTypes } from "@/lib/crisis-constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

interface IncidentDetailModalProps {
  incident: Incident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncidentDetailModal({ incident, open, onOpenChange }: IncidentDetailModalProps) {
  const queryClient = useQueryClient();
  const [internalIncident, setInternalIncident] = useState<Incident | null>(incident);

  useEffect(() => {
    setInternalIncident(incident);
  }, [incident]);

  const { data: recommendationsData, isLoading: loadingRecs, refetch: refetchRecs, isFetching: fetchingRecs, isError: recsError } = useQuery({
    queryKey: incident ? [`/api/ai/recommendations/${incident.id}`] : ["none"],
    queryFn: async () => {
      if (!incident) return null;
      const res = await fetch(`/api/ai/recommendations/${incident.id}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to load recommendations");
      }
      return res.json();
    },
    enabled: !!incident && open,
  });
  const recommendations: string[] = Array.isArray(recommendationsData?.recommendations)
    ? recommendationsData.recommendations
    : typeof recommendationsData?.recommendations === "string"
      ? recommendationsData.recommendations.split(/\n|(?:\d+\.)/).filter(Boolean).map((s: string) => s.trim()).filter(Boolean)
      : [];

  const createAlertMutation = useMutation({
    mutationFn: async (incidentData: Incident) => {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: incidentData.title,
          description: incidentData.description,
          severity: incidentData.severity,
          status: "active",
          source: "system",
          region: incidentData.region,
          location: incidentData.location,
          incidentId: incidentData.id,
          escalationLevel: incidentData.severity === "critical" ? 5 : incidentData.severity === "high" ? 4 : 3,
        }),
      });
      if (!res.ok) throw new Error("Failed to create alert");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      onOpenChange(false);
    },
  });

  if (!internalIncident) return null;

  const info = crisisTypes[internalIncident.category] || {
    color: "#8884d8",
    label: internalIncident.category,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: info.color }}
            />
            {internalIncident.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{internalIncident.severity}</Badge>
            <Badge variant="secondary">{internalIncident.status}</Badge>
            <Badge style={{ backgroundColor: info.color, color: "#fff" }}>
              {info.label}
            </Badge>
            {internalIncident.verificationStatus && (
              <Badge variant="outline">{internalIncident.verificationStatus}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{internalIncident.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-muted-foreground">Location:</span>
              <p>{internalIncident.location}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Region:</span>
              <p>{internalIncident.region}</p>
            </div>
            {internalIncident.state && (
              <div>
                <span className="font-medium text-muted-foreground">State:</span>
                <p>{internalIncident.state}</p>
              </div>
            )}
            <div>
              <span className="font-medium text-muted-foreground">Reported:</span>
              <p>{new Date(internalIncident.reportedAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="border rounded-lg p-3 bg-blue-50/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">AI Recommendations</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchRecs()}
                disabled={loadingRecs || fetchingRecs}
              >
                {fetchingRecs ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            {recommendations.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {recommendations.slice(0, 8).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : loadingRecs ? (
              <p className="text-sm text-muted-foreground">Loading AI recommendations...</p>
            ) : recsError ? (
              <p className="text-sm text-destructive">Failed to load recommendations. Try refreshing.</p>
            ) : recommendationsData && !recommendationsData.recommendations ? (
              <p className="text-sm text-muted-foreground">No recommendations available. Check AI configuration.</p>
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Link href="/alerts">
            <Button variant="outline">View All Alerts</Button>
          </Link>
          <Button
            onClick={() => createAlertMutation.mutate(internalIncident)}
            disabled={createAlertMutation.isPending}
          >
            {createAlertMutation.isPending ? "Creating..." : "Create Alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
