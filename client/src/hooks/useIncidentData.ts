import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Incident } from "@shared/schema";

export function useIncidentData() {
  const { data: incidents = [] } = useQuery<Incident[]>({
    queryKey: ["/api/incidents"],
    staleTime: 60000,
  });

  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({});

  const openIncidentDetailModal = (incident: Incident) => {
    const event = new CustomEvent("open-incident-detail", { detail: incident });
    window.dispatchEvent(event);
  };

  return {
    incidents,
    visibleTypes,
    openIncidentDetailModal,
  };
}
