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
import { UserCircle, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Politician = { id: number; fullName: string; partyId: number | null; electionId: number | null; position: string | null; state: string | null; party?: { name: string } };
type Party = { id: number; name: string; abbreviation: string | null };
type Election = { id: number; name: string; type: string };

export default function ElectionPoliticiansPage() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [partyId, setPartyId] = useState<string>("");
  const [electionId, setElectionId] = useState<string>("");
  const [position, setPosition] = useState("");
  const [state, setState] = useState("");
  const [bio, setBio] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: politicians = [] } = useQuery<Politician[]>({
    queryKey: ["/api/politicians"],
    queryFn: async () => (await apiRequest("GET", "/api/politicians")).json(),
  });
  const { data: parties = [] } = useQuery<Party[]>({
    queryKey: ["/api/political-parties"],
    queryFn: async () => (await apiRequest("GET", "/api/political-parties")).json(),
  });
  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => (await apiRequest("GET", "/api/elections")).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/politicians", {
        fullName,
        partyId: partyId ? parseInt(partyId) : null,
        electionId: electionId ? parseInt(electionId) : null,
        position: position || null,
        state: state || null,
        bio: bio || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/politicians"] });
      setOpen(false);
      setFullName("");
      setPartyId("");
      setElectionId("");
      setPosition("");
      setState("");
      setBio("");
      toast({ title: "Politician added" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const partyById = new Map(parties.map((p) => [p.id, p]));
  const electionById = new Map(elections.map((e) => [e.id, e]));

  return (
    <MainLayout title="Politicians">
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-6 w-6" />
              Politicians
            </CardTitle>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Politician
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Election</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>State</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {politicians.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell>{p.partyId ? partyById.get(p.partyId)?.name ?? "—" : "—"}</TableCell>
                    <TableCell>{p.electionId ? electionById.get(p.electionId)?.name ?? "—" : "—"}</TableCell>
                    <TableCell>{p.position || "—"}</TableCell>
                    <TableCell>{p.state || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {politicians.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No politicians yet. Add one to track candidates and officials.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Politician</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. John Doe" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Party</label>
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
              <div>
                <label className="text-sm font-medium">Election</label>
                <Select value={electionId} onValueChange={setElectionId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select election" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {elections.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Position</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Presidential Candidate" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">State</label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Lagos" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Bio (optional)</label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Brief bio or role" className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!fullName.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
