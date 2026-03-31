import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId: number | null;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
  successful: boolean;
  details: Record<string, unknown> | null;
  user?: { id: number; username: string; fullName: string; role: string } | null;
}

export default function AuditLogsPage() {
  const [limit, setLimit] = useState(100);
  const [userId, setUserId] = useState("all");
  const [action, setAction] = useState("all");
  const [resource, setResource] = useState("all");
  const [successful, setSuccessful] = useState("all");
  const [event, setEvent] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (userId !== "all") params.set("userId", userId);
    if (action !== "all") params.set("action", action);
    if (resource !== "all") params.set("resource", resource);
    if (successful !== "all") params.set("successful", successful);
    if (event.trim()) params.set("event", event.trim());
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    return params.toString();
  }, [limit, userId, action, resource, successful, event, from, to]);

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/enterprise/audit-logs", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/enterprise/audit-logs?${queryString}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 30000,
  });

  return (
    <MainLayout title="Audit Logs">
      <div className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Audit Logs</h1>
            <p className="text-muted-foreground">
              System activity and security audit trail
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Event search"
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="w-[180px]"
            />
            <Select value={String(limit)} onValueChange={(v) => setLimit(parseInt(v, 10))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 entries</SelectItem>
                <SelectItem value="100">100 entries</SelectItem>
                <SelectItem value="200">200 entries</SelectItem>
                <SelectItem value="500">500 entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {Array.from(new Set(logs.map((l) => l.userId))).map((id) => (
                <SelectItem key={id} value={String(id)}>
                  {logs.find((l) => l.userId === id)?.user?.fullName || `User #${id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="login">login</SelectItem>
              <SelectItem value="logout">logout</SelectItem>
              <SelectItem value="view">view</SelectItem>
              <SelectItem value="create">create</SelectItem>
              <SelectItem value="update">update</SelectItem>
              <SelectItem value="delete">delete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={resource} onValueChange={setResource}>
            <SelectTrigger><SelectValue placeholder="Resource" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resources</SelectItem>
              {Array.from(new Set(logs.map((l) => l.resource))).map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={successful} onValueChange={setSuccessful}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="true">Success</SelectItem>
              <SelectItem value="false">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              All system actions are logged for compliance and security
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading audit logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Resource ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{log.user?.fullName || `User #${log.userId}`}</div>
                          <div className="text-xs text-muted-foreground">{log.user?.username || "-"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.resource}</TableCell>
                      <TableCell>{log.resourceId ?? "—"}</TableCell>
                      <TableCell>
                        {log.successful ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                        {log.ipAddress ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
