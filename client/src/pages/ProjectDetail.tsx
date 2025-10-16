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
import { ArrowLeft, Globe, Plus, Play, History, Loader2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GradientButton } from "@/components/GradientButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEstateSchema, type InsertEstate, type Estate, type Project } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { VisualTestingModal } from "@/components/VisualTestingModal";
import { ScanHistoryTable } from "@/components/ScanHistoryTable";

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [liveScanModalOpen, setLiveScanModalOpen] = useState(false);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);
  const [selectedEstateName, setSelectedEstateName] = useState<string>("");

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

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      const projects = await response.json();
      const proj = projects.find((p: Project) => p.id === projectId);
      if (!proj) throw new Error("Project not found");
      return proj;
    },
    enabled: isAuthenticated,
  });

  const { data: estates, isLoading: estatesLoading } = useQuery<Estate[]>({
    queryKey: ["/api/estates", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/estates`);
      if (!response.ok) throw new Error("Failed to fetch estates");
      const allEstates = await response.json();
      return allEstates.filter((e: Estate) => e.projectId === projectId);
    },
    enabled: isAuthenticated && !!projectId,
  });

  const form = useForm<InsertEstate>({
    resolver: zodResolver(insertEstateSchema),
    defaultValues: {
      projectId,
      name: "",
      baseUrl: "",
    },
  });

  const createEstateMutation = useMutation({
    mutationFn: async (data: InsertEstate) => {
      await apiRequest("POST", "/api/estates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", projectId] });
      toast({
        title: "Success",
        description: "Estate created successfully",
      });
      setOpen(false);
      form.reset({ projectId, name: "", baseUrl: "" });
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
        description: error.message || "Failed to create estate",
        variant: "destructive",
      });
    },
  });

  const runScanMutation = useMutation({
    mutationFn: async ({ estateId, estateName }: { estateId: string; estateName: string }) => {
      await apiRequest("POST", `/api/estates/${estateId}/scan`, {});
      return { estateId, estateName };
    },
    onSuccess: ({ estateId, estateName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", projectId] });
      setSelectedEstateId(estateId);
      setSelectedEstateName(estateName);
      setLiveScanModalOpen(true);
      toast({
        title: "Scan Started",
        description: "The accessibility scan is now running",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start scan",
        variant: "destructive",
      });
    },
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {projectLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <>
              <h1 className="text-3xl font-bold">{project?.name}</h1>
              <p className="text-muted-foreground">{project?.description || "No description"}</p>
            </>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <GradientButton data-testid="button-create-estate" showIcon={false}>
              <Plus className="h-4 w-4 mr-2" />
              Add Estate
            </GradientButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Estate</DialogTitle>
              <DialogDescription>
                Add a website to test for accessibility compliance
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createEstateMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estate Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Website" {...field} data-testid="input-estate-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          {...field}
                          data-testid="input-estate-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <GradientButton type="submit" disabled={createEstateMutation.isPending} data-testid="button-submit-estate" showIcon={false}>
                    {createEstateMutation.isPending ? "Creating..." : "Create Estate"}
                  </GradientButton>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {estatesLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : estates && estates.length > 0 ? (
        <div className="space-y-4">
          {estates.map((estate) => (
            <Card key={estate.id} data-testid={`card-estate-${estate.id}`}>
              <CardContent className="p-0">
                <div className="w-full overflow-auto rounded-md border-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Estate Name</TableHead>
                        <TableHead className="w-[350px]">Base URL</TableHead>
                        <TableHead className="w-[150px] text-center">Pages</TableHead>
                        <TableHead className="w-[180px]">Status</TableHead>
                        <TableHead className="w-[200px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell data-testid={`table-cell-estate-name-${estate.id}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{estate.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`table-cell-estate-url-${estate.id}`}>
                          <a 
                            href={estate.baseUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="truncate">{estate.baseUrl}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell className="text-center" data-testid={`table-cell-estate-pages-${estate.id}`}>
                          <div className="space-y-0.5">
                            <p className="font-medium text-base">
                              {estate.pagesAudited || 0} / {estate.pagesDiscovered || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">audited</p>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`table-cell-estate-status-${estate.id}`}>
                          <Badge variant={
                            estate.status === 'completed' ? 'default' :
                            estate.status === 'failed' ? 'destructive' :
                            estate.status === 'crawling' || estate.status === 'auditing' ? 'secondary' :
                            'outline'
                          }>
                            {estate.status === 'crawling' ? 'Scanning Pages' :
                             estate.status === 'auditing' ? 'Testing Accessibility' :
                             estate.status === 'completed' ? 'Completed' :
                             estate.status === 'failed' ? 'Failed' :
                             'Ready to Scan'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" data-testid={`table-cell-estate-actions-${estate.id}`}>
                          <div className="flex items-center justify-end gap-2">
                            <GradientButton
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                runScanMutation.mutate({ estateId: estate.id, estateName: estate.name });
                              }}
                              disabled={runScanMutation.isPending || estate.status === 'crawling' || estate.status === 'auditing'}
                              data-testid={`button-run-scan-${estate.id}`}
                              showIcon={false}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              {estate.status === 'crawling' ? 'Scanning...' :
                               estate.status === 'auditing' ? 'Testing...' :
                               'Run Scan'}
                            </GradientButton>
                            
                            {/* Live button - only visible during active scan */}
                            {(estate.status === 'crawling' || estate.status === 'auditing') && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEstateId(estate.id);
                                  setSelectedEstateName(estate.name);
                                  setLiveScanModalOpen(true);
                                }}
                                data-testid={`button-live-view-${estate.id}`}
                              >
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Live
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                
                {/* Scan History Table - Show for any estate that might have scans */}
                <div className="p-6 pt-4 border-t bg-muted/20">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Scan History
                  </h3>
                  <ScanHistoryTable estateId={estate.id} estateName={estate.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Globe className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Estates</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Add your first website estate to start accessibility testing
              </p>
              <GradientButton onClick={() => setOpen(true)} data-testid="button-create-first-estate" showIcon={false}>
                <Plus className="h-4 w-4 mr-2" />
                Add Estate
              </GradientButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Testing Modal */}
      {selectedEstateId && (
        <VisualTestingModal
          estateId={selectedEstateId}
          estateName={selectedEstateName}
          open={liveScanModalOpen}
          onOpenChange={(open) => {
            setLiveScanModalOpen(open);
            if (!open) {
              queryClient.invalidateQueries({ queryKey: ["/api/estates", projectId] });
            }
          }}
        />
      )}
    </div>
  );
}
