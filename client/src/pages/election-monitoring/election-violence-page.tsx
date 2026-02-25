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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Swords, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Election = { id: number; name: string };
type Event = { id: number; electionId: number; title: string; type: string; severity: string; location: string | null; state: string | null; eventDate: string };

const EVENT_TYPES = ["violence", "intimidation", "fraud", "hate_speech", "violation", "other"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export default function ElectionViolencePage() {
  const [electionId, setElectionId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("violence");
  const [severity, setSeverity] = useState("medium");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => (await apiRequest("GET", "/api/elections")).json(),
  });
  const { data: events = [] } = useQuery<Event[]>({
    queryKey: electionId ? [`/api/elections/${electionId}/events`] : ["none"],
    queryFn: async () => (await apiRequest("GET", `/api/elections/${electionId}/events`)).json(),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/elections/${electionId}/events`, {
        title,
        description: description || null,
        type,
        severity,
        location: location || null,
        state: state || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/elections/${electionId}/events`] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setState("");
      toast({ title: "Event recorded" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <MainLayout title="Violence & Events">
      <div className="container mx-auto p-6 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-6 w-6" />
              Violence & Events
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={electionId} onValueChange={setElectionId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select election" />
                </SelectTrigger>
                <SelectContent>
                  {elections.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setOpen(true)} disabled={!electionId}>
                <Plus className="h-4 w-4 mr-2" />
                Record Event
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!electionId ? (
              <p className="text-muted-foreground py-8 text-center">Select an election to view and record violence, intimidation, fraud, or other election-related events.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium">{ev.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{ev.type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ev.severity === "critical" ? "destructive" : ev.severity === "high" ? "default" : "secondary"} className="capitalize">
                          {ev.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{ev.state ? `${ev.location || ""} · ${ev.state}` : ev.location || "—"}</TableCell>
                      <TableCell>{format(new Date(ev.eventDate), "MMM d, yyyy HH:mm")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {electionId && events.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No events for this election yet. Click Record Event to add one.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Violence / Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Polling unit violence, Abuja" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, where, and who was involved" className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Ward 5, PU 012" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Lagos" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
