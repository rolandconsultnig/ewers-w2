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
import { Users, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Election = { id: number; name: string; type: string };
type Actor = { id: number; electionId: number; name: string; type: string; role: string | null; description: string | null };

export default function ElectionActorsPage() {
  const [electionId, setElectionId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("actor");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: elections = [] } = useQuery<Election[]>({
    queryKey: ["/api/elections"],
    queryFn: async () => (await apiRequest("GET", "/api/elections")).json(),
  });
  const { data: actors = [] } = useQuery<Actor[]>({
    queryKey: electionId ? [`/api/elections/${electionId}/actors`] : ["none"],
    queryFn: async () => (await apiRequest("GET", `/api/elections/${electionId}/actors`)).json(),
    enabled: !!electionId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/elections/${electionId}/actors`, { name, type, role: role || null, description: description || null });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/elections/${electionId}/actors`] });
      setOpen(false);
      setName("");
      setRole("");
      setDescription("");
      toast({ title: "Actor added" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <MainLayout title="Actors & Non-Actors">
      <div className="container mx-auto p-6 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              Actors & Non-Actors
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
                Add Actor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!electionId ? (
              <p className="text-muted-foreground py-8 text-center">Select an election to view and manage actors (e.g. INEC, security agencies) and non-actors (CSOs, media, observers).</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actors.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>
                        <Badge variant={a.type === "actor" ? "default" : "secondary"} className="capitalize">{a.type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>{a.role || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{a.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {electionId && actors.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No actors for this election yet. Click Add Actor.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Actor / Non-Actor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. INEC, Police, CSO" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actor">Actor</SelectItem>
                  <SelectItem value="non_actor">Non-Actor</SelectItem>
                  <SelectItem value="observer">Observer</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="security_agency">Security Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Role (optional)</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Electoral body, Observer" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of role" className="mt-1" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
