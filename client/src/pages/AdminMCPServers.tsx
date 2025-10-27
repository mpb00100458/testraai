import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Trash2, Edit } from "lucide-react";
import type { McpServer } from "@shared/schema";

export default function AdminMCPServers() {
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
