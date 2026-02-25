import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Party = { id: number; name: string; abbreviation: string | null; logoUrl: string | null; description: string | null };

export default function ElectionPartiesPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: parties = [] } = useQuery<Party[]>({
    queryKey: ["/api/political-parties"],
    queryFn: async () => (await apiRequest("GET", "/api/political-parties")).json(),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/political-parties", {
        name,
        abbreviation: abbreviation || null,
        description: description || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/political-parties"] });
      setOpen(false);
      setName("");
      setAbbreviation("");
      setDescription("");
      toast({ title: "Party created" });
    },
    onError: (e: Error) => toast({ title: "Failed to create", description: e.message, variant: "destructive" }),
  });

  return (
    <MainLayout title="Political Parties">
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Political Parties
            </CardTitle>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Abbreviation</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.abbreviation || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{p.description || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parties.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No parties yet. Click Add Party to create one.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Political Party</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. All Progressives Congress" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Abbreviation (optional)</label>
              <Input value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} placeholder="e.g. APC" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the party" className="mt-1" rows={2} />
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
