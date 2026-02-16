import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Brain, Filter, Eye, RefreshCw, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProcessedData {
  id: number;
  rawDataId: number;
  result: any;
  processingMethod: string;
  confidence: number | null;
  relevanceScore: number | null;
  processedAt: string;
}

interface ProcessedDataStats {
  total: number;
  byMethod: Record<string, number>;
  avgConfidence: number;
  avgRelevance: number;
  highConfidence: number;
  highRelevance: number;
}

export default function ProcessedDataPage() {
  const queryClient = useQueryClient();
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<ProcessedData | null>(null);

  const { data: processedData = [], isLoading } = useQuery({
    queryKey: ["/api/processed-data", methodFilter],
    queryFn: async () => {
      const url = methodFilter === "all" 
        ? "/api/processed-data?limit=200"
        : `/api/processed-data?limit=200&method=${methodFilter}`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  const { data: stats } = useQuery<ProcessedDataStats>({
    queryKey: ["/api/processed-data/stats/summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/processed-data/stats/summary");
      return await res.json();
    },
  });

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return "bg-gray-500";
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const availableMethods = stats ? Object.keys(stats.byMethod) : [];

  return (
    <MainLayout title="Processed Data">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              Processed Data
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-analyzed and processed data insights
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/processed-data"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.avgConfidence}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.highConfidence}</div>
                <p className="text-xs text-muted-foreground">≥80% confidence</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Relevance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.avgRelevance}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {stats && Object.keys(stats.byMethod).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Processing Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.byMethod).map(([method, count]) => (
                  <div key={method} className="border rounded-lg p-3">
                    <div className="text-sm font-medium capitalize">{method.replace(/_/g, ' ')}</div>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Processed Items</CardTitle>
                <CardDescription>Browse AI-analyzed data</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {availableMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.replace(/_/g, ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : processedData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No processed data found
              </div>
            ) : (
              <div className="space-y-3">
                {processedData.map((item: ProcessedData) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="capitalize">
                            {item.processingMethod.replace(/_/g, ' ')}
                          </Badge>
                          {item.confidence !== null && (
                            <Badge className={getConfidenceColor(item.confidence)}>
                              {item.confidence}% confidence
                            </Badge>
                          )}
                          {item.relevanceScore !== null && (
                            <Badge variant="secondary">
                              {item.relevanceScore}% relevance
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm mb-2">
                          <strong>ID:</strong> {item.id} | <strong>Raw Data ID:</strong> {item.rawDataId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Processed {formatDistanceToNow(new Date(item.processedAt))} ago
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedItem(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
              <CardTitle>Analysis Results - ID: {selectedItem.id}</CardTitle>
              <CardDescription>Detailed processing output</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>Processing Method:</strong>{" "}
                    <Badge variant="outline" className="capitalize ml-2">
                      {selectedItem.processingMethod.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div>
                    <strong>Raw Data ID:</strong> {selectedItem.rawDataId}
                  </div>
                  {selectedItem.confidence !== null && (
                    <div>
                      <strong>Confidence:</strong>{" "}
                      <Badge className={getConfidenceColor(selectedItem.confidence)}>
                        {selectedItem.confidence}%
                      </Badge>
                    </div>
                  )}
                  {selectedItem.relevanceScore !== null && (
                    <div>
                      <strong>Relevance:</strong>{" "}
                      <Badge variant="secondary">
                        {selectedItem.relevanceScore}%
                      </Badge>
                    </div>
                  )}
                </div>
                <div>
                  <strong>Processed At:</strong>{" "}
                  {new Date(selectedItem.processedAt).toLocaleString()}
                </div>
                <div>
                  <strong>Analysis Result:</strong>
                  <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto max-h-96 text-xs">
                    {JSON.stringify(selectedItem.result, null, 2)}
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
