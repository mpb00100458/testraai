import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FolderOpen, Plus, Loader2, Trash2, Sparkles, Bot } from "lucide-react";
import { GradientButton } from "@/components/GradientButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, type InsertProject, type Project, type Organization, type Estate } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProjectDetail from "./ProjectDetail";

export default function Projects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

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

  const { data: estates } = useQuery<Estate[]>({
    queryKey: ["/api/estates"],
    enabled: isAuthenticated,
  });

  // Count estates per project
  const getEstateCount = (projectId: string) => {
    if (!estates) return 0;
    return estates.filter(e => e.projectId === projectId).length;
  };

  // Separate AI Agent projects from regular projects
  const aiAgentProjects = projects?.filter(p => p.name === "AI Agent Scans") || [];
  const regularProjects = projects?.filter(p => p.name !== "AI Agent Scans") || [];

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

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/estates"] });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      setProjectToDelete(null);
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
        description: "Failed to delete project",
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
    <div className="space-y-8 p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Projects</h1>
          <p className="text-lg text-muted-foreground">Organize your accessibility testing by project</p>
        </div>
        {!organizations || organizations.length === 0 ? (
          <GradientButton 
            data-testid="button-create-org-first" 
            onClick={() => window.location.href = '/organization'}
            showIcon={false}
          >
            Create Workspace First
          </GradientButton>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <GradientButton data-testid="button-create-project" showIcon={false}>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </GradientButton>
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
                  <GradientButton type="submit" disabled={createProjectMutation.isPending} data-testid="button-submit-project" showIcon={false}>
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </GradientButton>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {!organizations || organizations.length === 0 ? (
        <Card className="!shadow-md hover:!shadow-xl transition-all duration-200">
          <CardHeader>
            <CardTitle>No Workspace Found</CardTitle>
            <CardDescription>
              You need to create a workspace before you can create projects. Workspaces help you organize your team and testing activities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GradientButton onClick={() => window.location.href = '/organization'} data-testid="button-go-to-org" showIcon={false}>
              Go to Workspace Page
            </GradientButton>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* AI Agent Scans Section */}
          {aiAgentProjects.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
                  <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    AI Agent Scans
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto-generated
                  </Badge>
                </div>
              </div>

              <div className="w-full overflow-auto rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
                <Table>
                  <TableHeader>
                    <TableRow className="border-purple-500/20">
                      <TableHead className="w-[300px]">Project Name</TableHead>
                      <TableHead className="w-[400px]">Description</TableHead>
                      <TableHead className="w-[120px] text-center">Estates</TableHead>
                      <TableHead className="w-[180px]">Created</TableHead>
                      <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiAgentProjects.map((project) => (
                      <TableRow 
                        key={project.id} 
                        className="cursor-pointer hover-elevate border-purple-500/10" 
                        onClick={() => setSelectedProjectId(project.id)}
                        data-testid={`row-project-${project.id}`}
                      >
                        <TableCell data-testid={`table-cell-project-name-${project.id}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-600 dark:text-purple-400 flex-shrink-0">
                              <Bot className="h-4 w-4" />
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
                          <span className="font-medium text-base">{getEstateCount(project.id)}</span>
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
                          <div className="flex items-center justify-end gap-2">
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project.id);
                              }}
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Regular Projects Section */}
          {regularProjects.length > 0 && (
            <div className="space-y-4">
              {aiAgentProjects.length > 0 && (
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">Your Projects</h2>
                </div>
              )}

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
                    {regularProjects.map((project) => (
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
                          <span className="font-medium text-base">{getEstateCount(project.id)}</span>
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
                          <div className="flex items-center justify-end gap-2">
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project.id);
                              }}
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* No projects state */}
          {regularProjects.length === 0 && aiAgentProjects.length === 0 && (
            <Card className="!shadow-md hover:!shadow-xl transition-all duration-200">
              <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-center">
                  <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Projects</h3>
                  <p className="text-muted-foreground max-w-md mb-4">
                    Create your first project to start organizing accessibility tests
                  </p>
                  <GradientButton onClick={() => setOpen(true)} data-testid="button-create-first-project" showIcon={false}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </GradientButton>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-project-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This will also delete all estates and scans associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-project">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && deleteProjectMutation.mutate(projectToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-project"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
