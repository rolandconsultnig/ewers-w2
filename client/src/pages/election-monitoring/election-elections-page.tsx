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
import { Calendar, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type Election = { id: number; name: string; type: string; region: string; state: string | null; electionDate: string; status: string; description: string | null };

const ELECTION_TYPES = ["presidential", "gubernatorial", "senate", "house", "state_assembly", "lga"];
const STATUSES = ["pre_election", "ongoing", "post_election", "completed"];

export default function ElectionElectionsPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("presidential");
  const [region, setRegion] = useState("Nigeria");
  const [state, setState] = useState("");
  const [electionDate, setElectionDate] = useState("");
  const [status, setStatus] = useState("pre_election");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => (await apiRequest("GET", "/api/elections")).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/elections", {
        name,
        type,
        region,
        state: state || null,
        electionDate: electionDate || new Date().toISOString().slice(0, 10),
        status,
        description: description || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/elections"] });
      setOpen(false);
      setName("");
      setElectionDate("");
      setDescription("");
      toast({ title: "Election created" });
    },
    onError: (e: Error) => toast({ title: "Failed to create", description: e.message, variant: "destructive" }),
  });

  return (
    <MainLayout title="Elections">
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Elections
            </CardTitle>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Election
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region / State</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {elections.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="capitalize">{e.type.replace("_", " ")}</TableCell>
                    <TableCell>{e.state ? `${e.region} · ${e.state}` : e.region}</TableCell>
                    <TableCell>{format(new Date(e.electionDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "completed" ? "secondary" : "default"} className="capitalize">
                        {e.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {elections.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No elections yet. Click Add Election to create one.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Election</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2027 General Elections" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select election type" />
                </SelectTrigger>
                <SelectContent>
                  {ELECTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Region</label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Nigeria" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">State (optional)</label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Lagos (optional)" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Election Date</label>
                <Input type="date" value={electionDate} onChange={(e) => setElectionDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. General elections for president and NASS" className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
