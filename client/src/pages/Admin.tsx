import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Server, Users, CreditCard, Trash2, Edit, Shield } from "lucide-react";
import type { User, McpServer, Subscription, Invoice, Payment } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("mcp-servers");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-admin-title">Admin Panel</h1>
          <p className="text-muted-foreground">Platform administration and configuration</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mcp-servers" data-testid="tab-mcp-servers">
            <Server className="w-4 h-4 mr-2" />
            MCP Servers
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="billing" data-testid="tab-billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mcp-servers" className="space-y-4">
          <MCPServerManagement />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <BillingManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MCPServerManagement() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);

  const { data: servers, isLoading } = useQuery<McpServer[]>({
    queryKey: ["/api/admin/mcp-servers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/admin/mcp-servers", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mcp-servers"] });
      toast({ title: "MCP server created successfully" });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Failed to create MCP server", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/admin/mcp-servers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mcp-servers"] });
      toast({ title: "MCP server updated successfully" });
      setIsDialogOpen(false);
      setEditingServer(null);
    },
    onError: () => {
      toast({ title: "Failed to update MCP server", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/mcp-servers/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mcp-servers"] });
      toast({ title: "MCP server deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete MCP server", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      transport: formData.get("transport"),
      url: formData.get("url"),
      enabled: formData.get("enabled") === "true",
    };

    if (editingServer) {
      updateMutation.mutate({ id: editingServer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Global MCP Servers</CardTitle>
            <CardDescription>
              Configure Model Context Protocol servers available to all AI agents
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingServer(null)} data-testid="button-add-mcp-server">
                <Plus className="w-4 h-4 mr-2" />
                Add Server
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingServer ? "Edit" : "Add"} MCP Server</DialogTitle>
                  <DialogDescription>
                    Configure a global MCP server for AI agent capabilities
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Server Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingServer?.name}
                      placeholder="My MCP Server"
                      required
                      data-testid="input-mcp-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingServer?.description || ""}
                      placeholder="Description of server capabilities"
                      data-testid="input-mcp-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transport">Transport Type</Label>
                    <Select name="transport" defaultValue={editingServer?.transport || "sse"}>
                      <SelectTrigger data-testid="select-mcp-transport">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sse">SSE</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="stdio">STDIO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url">URL/Command</Label>
                    <Input
                      id="url"
                      name="url"
                      defaultValue={editingServer?.url}
                      placeholder="https://api.example.com/mcp"
                      required
                      data-testid="input-mcp-url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enabled">Status</Label>
                    <Select name="enabled" defaultValue={editingServer?.enabled ? "true" : "false"}>
                      <SelectTrigger data-testid="select-mcp-enabled">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Enabled</SelectItem>
                        <SelectItem value="false">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-mcp-server"
                  >
                    {editingServer ? "Update" : "Create"} Server
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading servers...</div>
        ) : servers && servers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id} data-testid={`row-mcp-server-${server.id}`}>
                  <TableCell className="font-medium">{server.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{server.transport}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{server.url}</TableCell>
                  <TableCell>
                    <Badge variant={server.enabled ? "default" : "secondary"}>
                      {server.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingServer(server);
                        setIsDialogOpen(true);
                      }}
                      data-testid={`button-edit-mcp-${server.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this server?")) {
                          deleteMutation.mutate(server.id);
                        }
                      }}
                      data-testid={`button-delete-mcp-${server.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No MCP servers configured. Add one to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UserManagement() {
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user status", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, systemRole }: { userId: string; systemRole: string | null }) => {
      return await apiRequest(`/api/admin/users/${userId}/system-role`, {
        method: "PATCH",
        body: JSON.stringify({ systemRole }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user role", variant: "destructive" });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "suspended":
        return "secondary";
      case "banned":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    if (!role) return "outline";
    switch (role) {
      case "SUPER_ADMIN":
        return "destructive";
      case "BILLING_ADMIN":
        return "default";
      case "SUPPORT_ADMIN":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts and permissions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading users...</div>
        ) : users && users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>System Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(user.status || "active")}>
                      {user.status || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.systemRole)}>
                      {user.systemRole || "None"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Select
                      value={user.status || "active"}
                      onValueChange={(status) =>
                        updateStatusMutation.mutate({ userId: user.id, status })
                      }
                    >
                      <SelectTrigger className="w-32" data-testid={`select-status-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={user.systemRole || "none"}
                      onValueChange={(role) =>
                        updateRoleMutation.mutate({
                          userId: user.id,
                          systemRole: role === "none" ? null : role,
                        })
                      }
                    >
                      <SelectTrigger className="w-40" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Admin Role</SelectItem>
                        <SelectItem value="SUPPORT_ADMIN">Support Admin</SelectItem>
                        <SelectItem value="BILLING_ADMIN">Billing Admin</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No users found.</div>
        )}
      </CardContent>
    </Card>
  );
}

function BillingManagement() {
  const [billingTab, setBillingTab] = useState("subscriptions");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Management</CardTitle>
        <CardDescription>Manage subscriptions, invoices, and payments</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={billingTab} onValueChange={setBillingTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subscriptions" data-testid="subtab-subscriptions">
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="invoices" data-testid="subtab-invoices">
              Invoices
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="subtab-payments">
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-4">
            <SubscriptionsList />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <InvoicesList />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentsList />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SubscriptionsList() {
  const { data: subscriptions, isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/admin/subscriptions"],
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "canceled":
        return "secondary";
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  };

  return isLoading ? (
    <div className="text-center py-8 text-muted-foreground">Loading subscriptions...</div>
  ) : subscriptions && subscriptions.length > 0 ? (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User ID</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Start Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {subscriptions.map((sub) => (
          <TableRow key={sub.id} data-testid={`row-subscription-${sub.id}`}>
            <TableCell className="font-mono text-sm">{sub.userId.slice(0, 8)}...</TableCell>
            <TableCell>{sub.planName}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(sub.status)}>{sub.status}</Badge>
            </TableCell>
            <TableCell>
              ${(sub.amount / 100).toFixed(2)} / {sub.interval}
            </TableCell>
            <TableCell>{new Date(sub.startDate).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <div className="text-center py-8 text-muted-foreground">No subscriptions found.</div>
  );
}

function InvoicesList() {
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/admin/invoices"],
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  return isLoading ? (
    <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
  ) : invoices && invoices.length > 0 ? (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>User ID</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
            <TableCell className="font-mono text-sm">{invoice.id.slice(0, 8)}...</TableCell>
            <TableCell className="font-mono text-sm">{invoice.userId.slice(0, 8)}...</TableCell>
            <TableCell>${(invoice.amount / 100).toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(invoice.status)}>{invoice.status}</Badge>
            </TableCell>
            <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <div className="text-center py-8 text-muted-foreground">No invoices found.</div>
  );
}

function PaymentsList() {
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments"],
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "succeeded":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  return isLoading ? (
    <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
  ) : payments && payments.length > 0 ? (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Payment ID</TableHead>
          <TableHead>User ID</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => (
          <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
            <TableCell className="font-mono text-sm">{payment.id.slice(0, 8)}...</TableCell>
            <TableCell className="font-mono text-sm">{payment.userId.slice(0, 8)}...</TableCell>
            <TableCell>${(payment.amount / 100).toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant="outline">{payment.paymentMethod}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(payment.status)}>{payment.status}</Badge>
            </TableCell>
            <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <div className="text-center py-8 text-muted-foreground">No payments found.</div>
  );
}
