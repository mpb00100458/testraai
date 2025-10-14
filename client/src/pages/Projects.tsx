import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FolderOpen, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type InsertProject, type Project, type Organization } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProjectDetail from "./ProjectDetail";

export default function Projects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  const { data: organizations } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    enabled: isAuthenticated,
  });

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      organizationId: "",
      name: "",
      description: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const orgId = organizations?.[0]?.id;
      if (!orgId) {
        throw new Error("No organization found");
      }
      await apiRequest("POST", "/api/projects", { ...data, organizationId: orgId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Success",
        description: "Project created successfully",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (selectedProjectId) {
    return <ProjectDetail projectId={selectedProjectId} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Organize your accessibility testing by project</p>
        </div>
        {!organizations || organizations.length === 0 ? (
          <Button 
            data-testid="button-create-org-first" 
            onClick={() => window.location.href = '/organization'}
            variant="default"
          >
            Create Organization First
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-project">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Create a new project to organize your accessibility testing
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createProjectMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Website" {...field} data-testid="input-project-name" />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Project description..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-project-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createProjectMutation.isPending} data-testid="button-submit-project">
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {!organizations || organizations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Organization Found</CardTitle>
            <CardDescription>
              You need to create an organization before you can create projects. Organizations help you organize your team and testing activities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/organization'} data-testid="button-go-to-org">
              Go to Organization Page
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="w-full overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Project Name</TableHead>
                <TableHead className="w-[400px]">Description</TableHead>
                <TableHead className="w-[120px] text-center">Estates</TableHead>
                <TableHead className="w-[180px]">Created</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow 
                  key={project.id} 
                  className="cursor-pointer hover-elevate" 
                  onClick={() => setSelectedProjectId(project.id)}
                  data-testid={`row-project-${project.id}`}
                >
                  <TableCell data-testid={`table-cell-project-name-${project.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{project.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`table-cell-project-description-${project.id}`}>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description || "No description"}
                    </p>
                  </TableCell>
                  <TableCell className="text-center" data-testid={`table-cell-project-estates-${project.id}`}>
                    <span className="font-medium text-base">0</span>
                  </TableCell>
                  <TableCell data-testid={`table-cell-project-created-${project.id}`}>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {new Date(project.createdAt!).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(project.createdAt!), { addSuffix: true })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`table-cell-project-actions-${project.id}`}>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProjectId(project.id);
                      }}
                      data-testid={`button-view-project-${project.id}`}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Projects</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Create your first project to start organizing accessibility tests
              </p>
              <Button onClick={() => setOpen(true)} data-testid="button-create-first-project">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
