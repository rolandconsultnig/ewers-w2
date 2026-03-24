import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { severityBadgeClass, severityListRowClass } from "@/lib/severity-colors";

interface AlertsListProps {
  onTakeAction: (alertId: number) => void;
}

export default function AlertsList({ onTakeAction }: AlertsListProps) {
  const { data: alerts, isLoading, error } = useQuery<Alert[]>({
    queryKey: ["/api/alerts/active"],
  });

  // Setup WebSocket connection for real-time updates
  const [wsConnected, setWsConnected] = useState(false);
  
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("WebSocket connection established");
      setWsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'alerts' || data.type === 'new-alert' || data.type === 'updated-alert') {
        // Refetch alerts when we get a WebSocket notification
        // queryClient.invalidateQueries(["/api/alerts/active"]); // Uncomment if needed
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    ws.onclose = () => {
      console.log("WebSocket connection closed");
      setWsConnected(false);
    };
    
    return () => {
      ws.close();
    };
  }, []);

  const getSeverityColor = (severity: string) => severityListRowClass(severity);

  const getBadgeClass = (severity: string) => severityBadgeClass(severity);

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  return (
    <Card className="bg-white rounded-lg shadow border border-neutral-200">
      <CardHeader className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <CardTitle className="font-medium text-lg">Active Alerts</CardTitle>
        <Button variant="link" className="text-primary text-sm font-medium hover:text-primary-dark p-0">
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-2 overflow-y-auto max-h-96">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="p-3 mb-2">
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="p-4 text-center text-error">
            Failed to load alerts. Please try again.
          </div>
        ) : alerts?.length === 0 ? (
          <div className="p-4 text-center text-neutral-500">
            No active alerts at this time.
          </div>
        ) : (
          alerts?.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 hover:bg-neutral-50 border-l-4 ${getSeverityColor(
                alert.severity
              )} rounded-r-md mb-2`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-neutral-900">{alert.title}</h3>
                  <p className="text-sm text-neutral-600 mt-1">{alert.description}</p>
                </div>
                <Badge className={getBadgeClass(alert.severity)}>
                  {alert.severity.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-neutral-500">
                  {formatDate(alert.generatedAt)}
                </span>
                <Button
                  variant="link"
                  className="text-xs text-primary font-medium hover:text-primary-dark p-0"
                  onClick={() => onTakeAction(alert.id)}
                >
                  Take Action
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
