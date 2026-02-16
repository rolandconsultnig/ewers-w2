import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Plus, Trash2, Loader2 } from "lucide-react";

type TeamMember = {
  userId: number;
  role: string;
  user?: { id: number; username: string; fullName: string; email?: string };
};

interface TeamMembersDialogProps {
  teamId: number | null;
  teamName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamMembersDialog({ teamId, teamName, open, onOpenChange }: TeamMembersDialogProps) {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: teamId ? [`/api/response-teams/${teamId}/members`] : ["none"],
    queryFn: async () => {
      if (!teamId) return [];
      const res = await apiRequest("GET", `/api/response-teams/${teamId}/members`);
      return res.json();
    },
    enabled: !!teamId && open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return res.json();
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/response-teams/${teamId}/members`, { userId, role: "member" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/response-teams/${teamId}/members`] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/response-teams/${teamId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/response-teams/${teamId}/members`] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("PUT", `/api/response-teams/${teamId}/members/${userId}`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/response-teams/${teamId}/members`] });
    },
  });

  const availableUsers = users.filter(
    (u: any) => !members.some((m) => m.userId === u.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members: {teamName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Select
              value=""
              onValueChange={(v) => {
                const id = parseInt(v);
                if (id) addMutation.mutate(id);
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Add member" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">All users already added</div>
                ) : (
                  availableUsers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullName || u.username}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell>
                      {m.user?.fullName || m.user?.username || `User ${m.userId}`}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.role}
                        onValueChange={(role) => updateRoleMutation.mutate({ userId: m.userId, role })}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="coordinator">Coordinator</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeMutation.mutate(m.userId)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {members.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">No members yet. Add one above.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
