import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccessLog, User, insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getDefaultPermissionsForRole, getFeaturesByCategory, ROLE_LABELS, ROLE_IDS } from "@shared/permissions";
import { DEPARTMENT_IDS, DEPARTMENT_LABELS, normalizeDepartmentId } from "@shared/department-access";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link } from "wouter";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  RefreshCw,
  Shield,
  UserCog,
  Key,
  Edit,
  Trash2,
  CheckCircle,
  ShieldCheck
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Create a schema for the user creation form
const userFormSchema = insertUserSchema
  .pick({
    username: true,
    password: true,
    fullName: true,
    role: true,
    securityLevel: true,
    permissions: true,
    department: true,
    position: true,
    phoneNumber: true,
    email: true,
  })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    securityLevel: z.coerce.number().min(1).max(7).default(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type UserFormValues = z.infer<typeof userFormSchema>;

const editUserSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(2, "Username must be at least 2 characters"),
  role: z.string().min(1, "Role is required"),
  securityLevel: z.coerce.number().min(1).max(7),
  permissionsText: z.string().optional(),
  department: z.enum(DEPARTMENT_IDS),
  position: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  active: z.boolean().optional(),
});

type EditUserValues = z.infer<typeof editUserSchema>;

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function UserManagementPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [roleTemplateDialogOpen, setRoleTemplateDialogOpen] = useState(false);
  const [roleTemplateRole, setRoleTemplateRole] = useState<string | null>(null);
  const [roleTemplatePermissionIds, setRoleTemplatePermissionIds] = useState<string[]>([]);

  // Fetch users
  const { 
    data: users, 
    isLoading: isLoadingUsers, 
    error: usersError,
    refetch: refetchUsers 
  } = useQuery<User[]>({
    queryKey: ["/api/user/all"]
  });

  const {
    data: auditLogs,
    isLoading: isLoadingAuditLogs,
    error: auditLogsError,
  } = useQuery<AccessLog[]>({
    queryKey: ["/api/enterprise/audit-logs?limit=50"],
  });

  const { data: permissionsData } = useQuery<{ features: { id: string; label: string; category: string; description?: string }[]; byCategory: Record<string, { id: string; label: string; category: string; description?: string }[]> }>({
    queryKey: ["/api/permissions/features"],
    enabled: !!users && users.length >= 0,
  });
  const { data: roleTemplates } = useQuery<Record<string, string[]>>({
    queryKey: ["/api/permissions/roles"],
    enabled: !!users && users.length >= 0,
  });
  const featuresByCategory = permissionsData?.byCategory ?? getFeaturesByCategory();
  const allFeatures = permissionsData?.features ?? [];

  const saveRoleTemplateMutation = useMutation({
    mutationFn: async ({ role, permissions }: { role: string; permissions: string[] }) => {
      const res = await apiRequest("PUT", `/api/permissions/roles/${role}`, { permissions });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/roles"] });
      toast({ title: "Role permissions saved", description: "Template updated. New users of this role will get these permissions." });
      setRoleTemplateDialogOpen(false);
      setRoleTemplateRole(null);
    },
    onError: (e: Error) => toast({ title: "Failed to save", description: e.message, variant: "destructive" }),
  });
  
  // Create form using react-hook-form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      role: "user",
      securityLevel: 1,
      department: "early_warning",
      position: "",
      phoneNumber: "",
      email: "",
    },
  });

  const editForm = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      fullName: "",
      username: "",
      role: "user",
      securityLevel: 1,
      permissionsText: "",
      department: "early_warning",
      position: "",
      phoneNumber: "",
      email: "",
      active: true,
    },
  });

  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (payload: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/users/${payload.id}`, payload.data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/all"] });
      toast({ title: "User Updated", description: "User details were updated successfully." });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update user", description: error.message, variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: { id: number; newPassword: string }) => {
      const res = await apiRequest("POST", `/api/users/${payload.id}/reset-password`, { newPassword: payload.newPassword });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Password Reset", description: "The user's password was reset successfully." });
      resetPasswordForm.reset();
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reset password", description: error.message, variant: "destructive" });
    },
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const { confirmPassword, ...userData } = data;
      const permissions = Array.isArray(userData.permissions) && userData.permissions.length > 0
        ? userData.permissions
        : getDefaultPermissionsForRole(userData.role || "user");
      const res = await apiRequest("POST", "/api/user/create", { ...userData, permissions });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/all"] });
      toast({
        title: "User Created",
        description: "The user has been created successfully.",
      });
      form.reset();
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create user",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/all"] });
      toast({ title: "User Deleted", description: "The user has been removed." });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete user", description: error.message, variant: "destructive" });
    },
  });

  // Handle form submission
  function onSubmit(data: UserFormValues) {
    createUserMutation.mutate(data);
  }

  function onEditSubmit(data: EditUserValues) {
    if (!selectedUser) return;
    const permissions = (data.permissionsText || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { permissionsText: _permissionsText, ...rest } = data;
    updateUserMutation.mutate({ id: selectedUser.id, data: { ...rest, permissions } });
  }

  function onResetPasswordSubmit(data: ResetPasswordValues) {
    if (!selectedUser) return;
    resetPasswordMutation.mutate({ id: selectedUser.id, newPassword: data.newPassword });
  }
  
  // Filter users based on search query and role filter
  const filteredUsers = users?.filter(user => {
    // Apply role filter
    const roleMatch = roleFilter === "all" || user.role === roleFilter;
    
    // Apply search filter if search query exists
    const searchMatch = !searchQuery || 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return roleMatch && searchMatch;
  });
  
  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary/10 text-primary">Admin</Badge>;
      case "coordinator":
        return <Badge className="bg-green-100 text-green-800">Coordinator</Badge>;
      case "analyst":
        return <Badge className="bg-blue-100 text-blue-800">Analyst</Badge>;
      case "field_agent":
        return <Badge className="bg-amber-100 text-amber-800">Field Agent</Badge>;
      default:
        return <Badge className="bg-neutral-100 text-neutral-800">User</Badge>;
    }
  };

  return (
    <MainLayout title="User Management">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs defaultValue="all" className="w-auto">
            <TabsList>
              <TabsTrigger 
                value="all" 
                onClick={() => setRoleFilter("all")}
              >
                All Users
              </TabsTrigger>
              <TabsTrigger 
                value="admin" 
                onClick={() => setRoleFilter("admin")}
              >
                Admins
              </TabsTrigger>
              <TabsTrigger 
                value="coordinator" 
                onClick={() => setRoleFilter("coordinator")}
              >
                Coordinators
              </TabsTrigger>
              <TabsTrigger 
                value="analyst" 
                onClick={() => setRoleFilter("analyst")}
              >
                Analysts
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search users..."
              className="pl-9 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="p-6 pb-2">
          <CardTitle>User Directory</CardTitle>
          <CardDescription>
            Manage system users and their access permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-neutral-500">Loading users...</p>
            </div>
          ) : usersError ? (
            <div className="text-center py-8 text-red-500">
              <Shield className="h-8 w-8 mx-auto mb-4" />
              <p>Failed to load users. Please try again.</p>
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar || ""} />
                          <AvatarFallback className="bg-primary text-white">
                            {user.fullName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {DEPARTMENT_LABELS[normalizeDepartmentId(user.department)]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Manage permissions"
                          onClick={() => {
                            setPermissionUser(user);
                            const perms = (user as any).permissions;
                            const hasRealPerms = Array.isArray(perms) && perms.length > 0 && !(perms.length === 1 && perms[0] === "view");
                            setSelectedPermissionIds(hasRealPerms ? [...perms] : getDefaultPermissionsForRole(user.role || "user"));
                            setPermissionsDialogOpen(true);
                          }}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            editForm.reset({
                              fullName: user.fullName,
                              username: user.username,
                              role: user.role,
                              securityLevel: user.securityLevel,
                              permissionsText: Array.isArray((user as any).permissions) ? (user as any).permissions.join(", ") : "",
                              department: normalizeDepartmentId(user.department),
                              position: user.position || "",
                              phoneNumber: user.phoneNumber || "",
                              email: user.email || "",
                              active: user.active ?? true,
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            resetPasswordForm.reset();
                            setResetPasswordDialogOpen(true);
                          }}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto mb-4 text-neutral-400" />
              <p className="text-neutral-500">No users found</p>
              <p className="text-neutral-400 text-sm mt-1">
                {searchQuery ? "Try adjusting your search or filters" : "Add users to the system"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Edit permissions by role</CardTitle>
          <CardDescription>
            Set On/Off for each function per role. New users get these defaults; you can still override per user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {ROLE_IDS.map((roleId) => (
              <div key={roleId} className="border rounded-lg p-4 flex flex-col">
                <p className="font-medium">{ROLE_LABELS[roleId] ?? roleId}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {roleId === "admin" ? "Full system access" : roleId === "coordinator" ? "Manages response activities" : roleId === "analyst" ? "Analyzes risk indicators" : roleId === "field_agent" ? "Collects field data" : "Standard access"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setRoleTemplateRole(roleId);
                    const perms = roleTemplates?.[roleId];
                    setRoleTemplatePermissionIds(Array.isArray(perms) ? [...perms] : getDefaultPermissionsForRole(roleId));
                    setRoleTemplateDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit permissions
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Overview</CardTitle>
            <CardDescription>System roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-primary mr-3" />
                  <div>
                    <p className="font-medium">Administrator</p>
                    <p className="text-sm text-neutral-500">Full system access</p>
                  </div>
                </div>
                <p className="text-sm font-medium">
                  {users?.filter(u => u.role === "admin").length || 0} users
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCog className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium">Response Coordinator</p>
                    <p className="text-sm text-neutral-500">Manages response activities</p>
                  </div>
                </div>
                <p className="text-sm font-medium">
                  {users?.filter(u => u.role === "coordinator").length || 0} users
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCog className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-medium">Data Analyst</p>
                    <p className="text-sm text-neutral-500">Analyzes risk indicators</p>
                  </div>
                </div>
                <p className="text-sm font-medium">
                  {users?.filter(u => u.role === "analyst").length || 0} users
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCog className="h-5 w-5 text-amber-600 mr-3" />
                  <div>
                    <p className="font-medium">Field Agent</p>
                    <p className="text-sm text-neutral-500">Collects field data</p>
                  </div>
                </div>
                <p className="text-sm font-medium">
                  {users?.filter(u => u.role === "field_agent").length || 0} users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>Module-level permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Control which modules each user can access. Permissions are set per user via feature checkboxes.
            </p>
            <div className="space-y-2">
              {Object.keys(featuresByCategory).length > 0 ? (
                Object.keys(featuresByCategory).map((cat) => (
                  <div key={cat} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                    <span className="font-medium">{cat}</span>
                    <span className="text-muted-foreground text-xs">Per-user</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-2">Main Navigation, AI Assistant, Data Management, Election Monitoring, Risk Assessment, Response Management, Communications, Social Media, Administration</div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPermissionUser(null);
                setSelectedPermissionIds([]);
                if (users && users.length > 0) {
                  const first = users[0];
                  setPermissionUser(first);
                  const perms = (first as any).permissions;
                  const hasRealPerms = Array.isArray(perms) && perms.length > 0 && !(perms.length === 1 && perms[0] === "view");
                  setSelectedPermissionIds(hasRealPerms ? [...perms] : getDefaultPermissionsForRole(first.role || "user"));
                }
                setPermissionsDialogOpen(true);
              }}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Configure Role Permissions
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent user activities</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAuditLogs ? (
              <div className="text-sm text-neutral-500">Loading activity…</div>
            ) : auditLogsError ? (
              <div className="text-sm text-red-500">Failed to load activity.</div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-4">
                {auditLogs.slice(0, 10).map((log) => {
                  const u = users?.find((x) => x.id === log.userId);
                  const display = u?.fullName || u?.username || `User #${log.userId}`;
                  const initials = (u?.fullName || u?.username || "U")
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p.charAt(0).toUpperCase())
                    .join("");
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-white text-xs">
                            {initials || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{display}</p>
                        <p className="text-xs text-neutral-500">
                          {log.action} {log.resource}
                          {log.resourceId != null ? ` #${log.resourceId}` : ""}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          {new Date(log.timestamp as any).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No activity recorded.</div>
            )}
          </CardContent>
          <CardFooter>
            <Link href="/audit-logs">
              <Button variant="outline" className="w-full">
                View Full Activity Log
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      
      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.fullName} ({userToDelete?.username})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with appropriate permissions
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Create password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm password" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Role</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="coordinator">Response Coordinator</SelectItem>
                          <SelectItem value="analyst">Data Analyst</SelectItem>
                          <SelectItem value="field_agent">Field Agent</SelectItem>
                          <SelectItem value="user">Standard User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This determines the user's permissions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="securityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Clearance Level</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString() || "1"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select clearance level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Level 1 - Basic</SelectItem>
                          <SelectItem value="2">Level 2 - Low</SelectItem>
                          <SelectItem value="3">Level 3 - Medium</SelectItem>
                          <SelectItem value="4">Level 4 - High</SelectItem>
                          <SelectItem value="5">Level 5 - Very High</SelectItem>
                          <SelectItem value="6">Level 6 - Extreme</SelectItem>
                          <SelectItem value="7">Level 7 - Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Determines access to sensitive information
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEPARTMENT_IDS.map((id) => (
                          <SelectItem key={id} value={id}>
                            {DEPARTMENT_LABELS[id]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Users only access modules allowed for this department.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email" type="email" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedUser(null);
            editForm.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details, role, and access level
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={editForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="coordinator">Response Coordinator</SelectItem>
                          <SelectItem value="analyst">Data Analyst</SelectItem>
                          <SelectItem value="field_agent">Field Agent</SelectItem>
                          <SelectItem value="user">Standard User</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="securityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Clearance Level</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString() || "1"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select clearance level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Level 1 - Basic</SelectItem>
                          <SelectItem value="2">Level 2 - Low</SelectItem>
                          <SelectItem value="3">Level 3 - Medium</SelectItem>
                          <SelectItem value="4">Level 4 - High</SelectItem>
                          <SelectItem value="5">Level 5 - Very High</SelectItem>
                          <SelectItem value="6">Level 6 - Extreme</SelectItem>
                          <SelectItem value="7">Level 7 - Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEPARTMENT_IDS.map((id) => (
                            <SelectItem key={id} value={id}>
                              {DEPARTMENT_LABELS[id]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Users only access modules allowed for this department.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter position" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={editForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter email" type="email" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem>
                <FormLabel>Feature permissions</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedUser) return;
                    setPermissionUser(selectedUser);
                    const perms = (selectedUser as any).permissions;
                    const hasRealPerms = Array.isArray(perms) && perms.length > 0 && !(perms.length === 1 && perms[0] === "view");
                    setSelectedPermissionIds(hasRealPerms ? [...perms] : getDefaultPermissionsForRole(selectedUser.role || "user"));
                    setEditDialogOpen(false);
                    setPermissionsDialogOpen(true);
                  }}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Manage permissions (checkboxes)
                </Button>
                <FormDescription>
                  Choose which features this user can access. Use the shield icon in the table for the same.
                </FormDescription>
              </FormItem>
              <FormField
                control={editForm.control}
                name="permissionsText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissions (advanced)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. view, dashboard, incidents:edit" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Comma-separated permission IDs; or use "Manage permissions" above
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Disable an account to block login
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending || !selectedUser}>
                  {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage Permissions Dialog */}
      <Dialog
        open={permissionsDialogOpen}
        onOpenChange={(open) => {
          setPermissionsDialogOpen(open);
          if (!open) {
            setPermissionUser(null);
            setSelectedPermissionIds([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Feature permissions</DialogTitle>
            <DialogDescription>
              Choose what each user can see and do on the platform. Admins always have full access.
            </DialogDescription>
          </DialogHeader>
          {users && users.length > 0 ? (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">User</label>
              <Select
                value={permissionUser ? String(permissionUser.id) : String(users[0].id)}
                onValueChange={(id) => {
                  const u = users.find((x) => String(x.id) === id);
                  if (u) {
                    setPermissionUser(u);
                    const perms = (u as any).permissions;
                    const hasRealPerms = Array.isArray(perms) && perms.length > 0 && !(perms.length === 1 && perms[0] === "view");
                    setSelectedPermissionIds(hasRealPerms ? [...perms] : getDefaultPermissionsForRole(u.role || "user"));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user to configure" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullName} ({u.username}) — {u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No users in the system. Add a user first, then configure permissions.</p>
          )}
          <div className="overflow-y-auto space-y-4 pr-2">
            <div className="flex items-center space-x-2 rounded-lg border p-3 bg-muted/50">
              <Checkbox
                id="full-access"
                checked={selectedPermissionIds.includes("*")}
                onCheckedChange={(checked) => setSelectedPermissionIds(checked ? ["*"] : [])}
              />
              <label htmlFor="full-access" className="text-sm font-medium leading-none cursor-pointer">
                Full access (all features)
              </label>
            </div>
            {permissionUser && (
              <div className="flex items-center justify-between rounded-lg border p-2">
                <span className="text-sm text-muted-foreground">
                  Default for <strong>{permissionUser.role || "user"}</strong>: limited by role
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPermissionIds(getDefaultPermissionsForRole(permissionUser.role || "user"))}
                >
                  Reset to role default
                </Button>
              </div>
            )}
            {Object.entries(featuresByCategory).map(([category, features]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{category}</h4>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        if (selectedPermissionIds.includes("*")) return;
                        const ids = features.map((f) => f.id);
                        setSelectedPermissionIds((prev) => Array.from(new Set([...prev, ...ids])));
                      }}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setSelectedPermissionIds((prev) =>
                          selectedPermissionIds.includes("*") ? [] : prev.filter((id) => !features.some((f) => f.id === id))
                        )
                      }
                    >
                      None
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-1">
                  {features.map((f) => {
                    const checked = selectedPermissionIds.includes("*") || selectedPermissionIds.includes(f.id);
                    const disabled = selectedPermissionIds.includes("*");
                    return (
                      <div key={f.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`perm-${f.id}`}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={(c) => {
                            if (selectedPermissionIds.includes("*")) {
                              setSelectedPermissionIds([f.id]);
                              return;
                            }
                            setSelectedPermissionIds((prev) =>
                              c ? [...prev, f.id] : prev.filter((x) => x !== f.id)
                            );
                          }}
                        />
                        <label
                          htmlFor={`perm-${f.id}`}
                          className="text-sm leading-none cursor-pointer flex-1"
                          title={f.description}
                        >
                          {f.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!permissionUser || updateUserMutation.isPending}
              onClick={() => {
                if (!permissionUser) return;
                updateUserMutation.mutate(
                  { id: permissionUser.id, data: { permissions: selectedPermissionIds } },
                  {
                    onSuccess: () => {
                      setPermissionsDialogOpen(false);
                      setPermissionUser(null);
                      setSelectedPermissionIds([]);
                    },
                  }
                );
              }}
            >
              {updateUserMutation.isPending ? "Saving..." : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit role permission template dialog */}
      <Dialog
        open={roleTemplateDialogOpen}
        onOpenChange={(open) => {
          setRoleTemplateDialogOpen(open);
          if (!open) {
            setRoleTemplateRole(null);
            setRoleTemplatePermissionIds([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Permissions for {roleTemplateRole ? ROLE_LABELS[roleTemplateRole] ?? roleTemplateRole : "role"}</DialogTitle>
            <DialogDescription>
              Tick or untick each function to set what this role can and cannot do. New users with this role get these permissions by default.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="role-full-access"
                  checked={roleTemplatePermissionIds.includes("*")}
                  onCheckedChange={(checked) => setRoleTemplatePermissionIds(checked ? ["*"] : [])}
                />
                <label htmlFor="role-full-access" className="text-sm font-medium leading-none cursor-pointer">
                  Full access (all features)
                </label>
              </div>
              {roleTemplateRole && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRoleTemplatePermissionIds(getDefaultPermissionsForRole(roleTemplateRole))}
                >
                  Reset to default for this role
                </Button>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4 flex flex-col max-h-[50vh] overflow-hidden">
              <h3 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b">
                Application functions – tick what this role can do
              </h3>
              <div className="overflow-y-auto space-y-4 pr-1">
                {Object.entries(featuresByCategory).map(([category, features]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between sticky top-0 bg-card/95 py-1 z-10">
                      <h4 className="text-sm font-semibold text-foreground">{category}</h4>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => {
                            if (roleTemplatePermissionIds.includes("*")) return;
                            const ids = features.map((f) => f.id);
                            setRoleTemplatePermissionIds((prev) => Array.from(new Set([...prev, ...ids])));
                          }}
                        >
                          All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() =>
                            setRoleTemplatePermissionIds((prev) =>
                              prev.includes("*") ? [] : prev.filter((id) => !features.some((f) => f.id === id))
                            )
                          }
                        >
                          None
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-0">
                      {features.map((f) => {
                        const checked = roleTemplatePermissionIds.includes("*") || roleTemplatePermissionIds.includes(f.id);
                        const disabled = roleTemplatePermissionIds.includes("*");
                        return (
                          <div key={f.id} className="flex items-center space-x-2 py-0.5">
                            <Checkbox
                              id={`role-perm-${f.id}`}
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(c) => {
                                if (roleTemplatePermissionIds.includes("*")) {
                                  setRoleTemplatePermissionIds([f.id]);
                                  return;
                                }
                                setRoleTemplatePermissionIds((prev) =>
                                  c ? [...prev, f.id] : prev.filter((x) => x !== f.id)
                                );
                              }}
                            />
                            <label htmlFor={`role-perm-${f.id}`} className="text-sm leading-none cursor-pointer flex-1">
                              {f.label}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!roleTemplateRole || saveRoleTemplateMutation.isPending}
              onClick={() => {
                if (!roleTemplateRole) return;
                saveRoleTemplateMutation.mutate({ role: roleTemplateRole, permissions: roleTemplatePermissionIds });
              }}
            >
              {saveRoleTemplateMutation.isPending ? "Saving..." : "Save role permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialogOpen}
        onOpenChange={(open) => {
          setResetPasswordDialogOpen(open);
          if (!open) {
            resetPasswordForm.reset();
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for the selected user
            </DialogDescription>
          </DialogHeader>

          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-6">
              <FormField
                control={resetPasswordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resetPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm new password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={resetPasswordMutation.isPending || !selectedUser}>
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
