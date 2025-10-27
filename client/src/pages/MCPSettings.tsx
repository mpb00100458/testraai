import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Link as LinkIcon, CheckCircle2, XCircle, Settings } from "lucide-react";

const mcpServerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  transport: z.enum(["sse", "stdio", "http"]),
  url: z.string().url("Must be a valid URL"),
  headers: z.string().optional(),
  enabled: z.boolean().default(true),
});

type MCPServerForm = z.infer<typeof mcpServerSchema>;

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  transport: string;
  url: string;
  headers?: Record<string, string>;
  enabled: boolean;
  lastConnected?: string;
  createdAt: string;
}

export default function MCPSettings() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);

  const { data: servers = [], isLoading } = useQuery<MCPServer[]>({
    queryKey: ["/api/mcp-servers"],
  });

  const form = useForm<MCPServerForm>({
    resolver: zodResolver(mcpServerSchema),
    defaultValues: {
      name: "",
      description: "",
      transport: "sse",
      url: "",
      headers: "",
      enabled: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MCPServerForm) => {
      const payload = {
        ...data,
        headers: data.headers ? JSON.parse(data.headers) : undefined,
      };
      return await apiRequest("/api/mcp-servers", "POST", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp-servers"] });
      toast({ title: "MCP server added successfully" });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add MCP server", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MCPServerForm> }) => {
      const payload = {
        ...data,
        headers: data.headers ? JSON.parse(data.headers) : undefined,
      };
      return await apiRequest(`/api/mcp-servers/${id}`, "PATCH", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp-servers"] });
      toast({ title: "MCP server updated successfully" });
      setEditingServer(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update MCP server", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/mcp-servers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp-servers"] });
      toast({ title: "MCP server deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete MCP server", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/mcp-servers/${id}/test`, "POST");
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mcp-servers"] });
      toast({ 
        title: "Connection successful", 
        description: `Found ${data.toolCount} tools: ${data.tools.slice(0, 3).join(", ")}${data.toolCount > 3 ? "..." : ""}` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Connection failed", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: MCPServerForm) => {
    if (editingServer) {
      updateMutation.mutate({ id: editingServer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (server: MCPServer) => {
    setEditingServer(server);
    form.reset({
      name: server.name,
      description: server.description || "",
      transport: server.transport as "sse" | "stdio" | "http",
      url: server.url,
      headers: server.headers ? JSON.stringify(server.headers, null, 2) : "",
      enabled: server.enabled,
    });
    setIsAddDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingServer(null);
    form.reset();
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">MCP Server Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage external Model Context Protocol servers to extend AI agent capabilities
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-mcp-server">
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingServer ? "Edit MCP Server" : "Add MCP Server"}</DialogTitle>
              <DialogDescription>
                Configure an external MCP server to provide additional tools for the AI agent
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Weather Server" {...field} data-testid="input-mcp-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Provides weather forecast tools" {...field} data-testid="input-mcp-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transport Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-mcp-transport">
                            <SelectValue placeholder="Select transport type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sse">Server-Sent Events (SSE)</SelectItem>
                          <SelectItem value="http">HTTP</SelectItem>
                          <SelectItem value="stdio">Standard I/O</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How to communicate with the MCP server
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://mcp-server.example.com/sse" {...field} data-testid="input-mcp-url" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="headers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Headers (JSON)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder='{"Authorization": "Bearer token"}' 
                          className="font-mono text-sm"
                          {...field} 
                          data-testid="input-mcp-headers"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional HTTP headers in JSON format
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enabled</FormLabel>
                        <FormDescription>
                          Allow the AI agent to use tools from this server
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-mcp-enabled"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-mcp">
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingServer ? "Update" : "Add"} Server
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No MCP Servers Configured</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Add external MCP servers to extend the AI agent with additional capabilities and tools
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-mcp">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {servers.map((server) => (
            <Card key={server.id} data-testid={`card-mcp-${server.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{server.name}</CardTitle>
                      <Badge variant={server.enabled ? "default" : "secondary"} data-testid={`badge-status-${server.id}`}>
                        {server.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      {server.lastConnected && (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Connected
                        </Badge>
                      )}
                    </div>
                    {server.description && (
                      <CardDescription className="mt-2">{server.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => testMutation.mutate(server.id)}
                      disabled={testMutation.isPending}
                      data-testid={`button-test-${server.id}`}
                    >
                      {testMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(server)}
                      data-testid={`button-edit-${server.id}`}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(server.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${server.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Transport:</span>
                    <Badge variant="outline">{server.transport.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">URL:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{server.url}</code>
                  </div>
                  {server.headers && Object.keys(server.headers).length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Headers:</span>
                      <Badge variant="outline">{Object.keys(server.headers).length} configured</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
