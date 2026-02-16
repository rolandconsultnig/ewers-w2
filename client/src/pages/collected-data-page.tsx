import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Filter, Trash2, Eye, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CollectedData {
  id: number;
  sourceId: number | null;
  content: any;
  location: string;
  region: string;
  collectedAt: string;
  status: string;
}

interface CollectedDataStats {
  total: number;
  pending: number;
  processed: number;
  failed: number;
  bySource: Record<number, number>;
}

export default function CollectedDataPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<CollectedData | null>(null);

  const { data: collectedData = [], isLoading } = useQuery({
    queryKey: ["/api/collected-data", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all" 
        ? "/api/collected-data?limit=200"
        : `/api/collected-data?limit=200&status=${statusFilter}`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  const { data: stats } = useQuery<CollectedDataStats>({
    queryKey: ["/api/collected-data/stats/summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/collected-data/stats/summary");
      return await res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/collected-data/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collected-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collected-data/stats/summary"] });
      toast({ title: "Deleted", description: "Collected data deleted successfully" });
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/collected-data/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collected-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collected-data/stats/summary"] });
      toast({ title: "Updated", description: "Status updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "processed": return "bg-green-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <MainLayout title="Collected Data">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              Collected Data
            </h1>
            <p className="text-muted-foreground mt-1">
              Raw data collected from various sources
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/collected-data"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.processed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Items</CardTitle>
                <CardDescription>Browse and manage collected data</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : collectedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No collected data found
              </div>
            ) : (
              <div className="space-y-3">
                {collectedData.map((item: CollectedData) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ID: {item.id}
                          </span>
                          {item.sourceId && (
                            <span className="text-sm text-muted-foreground">
                              Source: {item.sourceId}
                            </span>
                          )}
                        </div>
                        <div className="text-sm mb-2">
                          <strong>Location:</strong> {item.location} ({item.region})
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Collected {formatDistanceToNow(new Date(item.collectedAt))} ago
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: item.id, status: "processed" })}
                          >
                            Mark Processed
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedItem && (
          <Card>
            <CardHeader>
              <CardTitle>Data Details - ID: {selectedItem.id}</CardTitle>
              <CardDescription>Full content of collected data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <strong>Status:</strong>{" "}
                  <Badge className={getStatusColor(selectedItem.status)}>
                    {selectedItem.status}
                  </Badge>
                </div>
                <div>
                  <strong>Location:</strong> {selectedItem.location}
                </div>
                <div>
                  <strong>Region:</strong> {selectedItem.region}
                </div>
                <div>
                  <strong>Collected At:</strong>{" "}
                  {new Date(selectedItem.collectedAt).toLocaleString()}
                </div>
                <div>
                  <strong>Content:</strong>
                  <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto max-h-96 text-xs">
                    {JSON.stringify(selectedItem.content, null, 2)}
                  </pre>
                </div>
                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
