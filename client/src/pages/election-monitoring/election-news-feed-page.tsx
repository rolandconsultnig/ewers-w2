import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Newspaper, Plus, Loader2, Calendar, Building2, Globe } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type FeedItem = {
  id: number;
  electionId: number;
  title: string;
  description: string | null;
  type: string;
  severity: string;
  eventDate: string;
  electionName: string;
  partyId: number | null;
};

type Election = { id: number; name: string };
type Party = { id: number; name: string; abbreviation: string | null };

export default function ElectionNewsFeedPage() {
  const [filter, setFilter] = useState<string>("all");
  const [shareOpen, setShareOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [electionId, setElectionId] = useState<string>("");
  const [partyId, setPartyId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery<FeedItem[]>({
    queryKey: ["/api/election-events", filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter === "news") params.set("type", "other");
      const res = await apiRequest("GET", `/api/election-events?${params.toString()}`);
      return res.json();
    },
  });
  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => (await apiRequest("GET", "/api/elections")).json(),
  });
  const { data: parties = [] } = useQuery<Party[]>({
    queryKey: ["/api/political-parties"],
    queryFn: async () => (await apiRequest("GET", "/api/political-parties")).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/elections/${electionId}/events`, {
        title,
        description: description || null,
        type: "other",
        severity: "low",
        partyId: partyId || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/election-events"] });
      setShareOpen(false);
      setTitle("");
      setDescription("");
      setElectionId("");
      setPartyId("");
      toast({ title: "News shared" });
    },
    onError: (e: Error) => toast({ title: "Failed to share", description: e.message, variant: "destructive" }),
  });

  type HarvestResult = { fetched: number; created: number; skipped: number; electionId?: number; error?: string };
  const harvestMutation = useMutation({
    mutationFn: async (limit?: number) => {
      const res = await apiRequest("POST", "/api/election-events/harvest-political-news", { limit: limit ?? 25 });
      return res.json() as Promise<HarvestResult>;
    },
    onSuccess: (data: HarvestResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/election-events"] });
      queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === "string" &&
          (q.queryKey[0].startsWith("/api/elections/") || q.queryKey[0] === "/api/elections"),
      });
      if (data.error) {
        toast({ title: "Harvest issue", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: "Political news harvested",
          description: `Fetched ${data.fetched}, created ${data.created}, skipped ${data.skipped}.`,
        });
      }
    },
    onError: (e: Error) =>
      toast({ title: "Failed to harvest political news", description: e.message, variant: "destructive" }),
  });

  const primariesRelated = events.filter(
    (e) =>
      e.type === "other" &&
      (e.title.toLowerCase().includes("primar") || e.description?.toLowerCase().includes("primar"))
  );
  const displayItems =
    filter === "primaries" ? primariesRelated : filter === "news" ? events.filter((e) => e.type === "other") : events;

  return (
    <MainLayout title="Election News Feed">
      <div className="container mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Newspaper className="h-8 w-8" />
              Election News Feed
            </h1>
            <p className="text-muted-foreground mt-1">
              Recent election news: political parties, primaries, timetable, and related updates.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => harvestMutation.mutate(25)}
              disabled={harvestMutation.isPending}
            >
              {harvestMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              Harvest political news
            </Button>
            <Button onClick={() => setShareOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Share news
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="news">News & updates</TabsTrigger>
            <TabsTrigger value="primaries">Primaries</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            <div className="space-y-4">
              {displayItems.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    {filter === "primaries"
                      ? "No primaries-related news yet."
                      : filter === "news"
                        ? "No news items yet. Share news or run npm run db:seed:election-2026 to load 2026 election news."
                        : "No election events yet. Share news or add events from Violence & Events."}
                  </CardContent>
                </Card>
              ) : (
                displayItems.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.type.replace("_", " ")}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {item.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.eventDate), "MMM d, yyyy")}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {item.electionName}
                        </span>
                      </div>
                      <CardTitle className="text-lg mt-2">{item.title}</CardTitle>
                    </CardHeader>
                    {item.description && (
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share election news</DialogTitle>
            <p className="text-sm text-muted-foreground">Add a news item (parties, primaries, timetable, or other updates).</p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Election</label>
              <Select value={electionId} onValueChange={setElectionId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select election" />
                </SelectTrigger>
                <SelectContent>
                  {elections.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. APC primaries schedule" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief summary or link to source" className="mt-1" rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium">Party (optional)</label>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select party" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} {p.abbreviation ? `(${p.abbreviation})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !electionId || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
