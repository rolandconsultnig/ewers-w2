import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import NigeriaMap from "@/components/maps/NigeriaMap";
import type { Incident } from "@shared/schema";

export default function PublicMapPage() {
  const [, setLocation] = useLocation();
  const [isMapReady, setIsMapReady] = useState(false);

  const { data: incidents } = useQuery<Incident[]>({
    queryKey: ["/api/public/incidents"],
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsMapReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-white">
      {!isMapReady ? (
        <div className="h-full w-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-sm text-gray-500">Loading map and incidents...</p>
          </div>
        </div>
      ) : (
        <NigeriaMap
          height="100vh"
          showIncidents={true}
          showAddIncidentButton={true}
          onAddIncident={(lat, lng) =>
            setLocation(`/report-incident?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`)
          }
          incidents={incidents}
        />
      )}
    </div>
  );
}
