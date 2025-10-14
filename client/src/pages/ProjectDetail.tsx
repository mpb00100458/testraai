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
import { ArrowLeft, Globe, Plus, Play, Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEstateSchema, type InsertEstate, type Estate, type Project } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { LiveScanModal } from "@/components/LiveScanModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [liveScanModalOpen, setLiveScanModalOpen] = useState(false);
  const [selectedEstateId, setSelectedEstateId] = useState<string | null>(null);

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
    mutationFn: async (estateId: string) => {
      await apiRequest("POST", `/api/estates/${estateId}/scan`, {});
      return estateId;
    },
    onSuccess: (estateId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estates", projectId] });
      setSelectedEstateId(estateId);
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

  const downloadPdfMutation = useMutation({
    mutationFn: async (estateId: string) => {
      const response = await fetch(`/api/estates/${estateId}/report/pdf`);
      if (!response.ok) throw new Error("Failed to download PDF report");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessibility-report-${estateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "PDF report downloaded",
        description: "The detailed accessibility report has been downloaded as PDF.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF report",
        variant: "destructive",
      });
    },
  });

  const downloadExcelMutation = useMutation({
    mutationFn: async (estateId: string) => {
      const response = await fetch(`/api/estates/${estateId}/report/excel`);
      if (!response.ok) throw new Error("Failed to download Excel report");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessibility-report-${estateId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Excel report downloaded",
        description: "The detailed accessibility report has been downloaded as Excel.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download Excel report",
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
            <Button data-testid="button-create-estate">
              <Plus className="h-4 w-4 mr-2" />
              Add Estate
            </Button>
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
                  <Button type="submit" disabled={createEstateMutation.isPending} data-testid="button-submit-estate">
                    {createEstateMutation.isPending ? "Creating..." : "Create Estate"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {estatesLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : estates && estates.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {estates.map((estate) => (
            <Card key={estate.id} data-testid={`card-estate-${estate.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{estate.name}</CardTitle>
                      <CardDescription className="truncate">
                        {estate.baseUrl}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={
                    estate.status === 'completed' ? 'default' :
                    estate.status === 'failed' ? 'destructive' :
                    estate.status === 'crawling' || estate.status === 'auditing' ? 'secondary' :
                    'outline'
                  }>
                    {estate.status === 'crawling' ? '🔍 Scanning Pages' :
                     estate.status === 'auditing' ? '🧪 Testing Accessibility' :
                     estate.status === 'completed' ? '✓ Completed' :
                     estate.status === 'failed' ? '✗ Failed' :
                     'Ready to Scan'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    <span>{estate.pagesDiscovered || 0} pages • {estate.pagesAudited || 0} audited</span>
                  </div>
                  <div className="flex gap-2">
                    {estate.status === 'completed' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={downloadPdfMutation.isPending || downloadExcelMutation.isPending}
                            data-testid={`button-download-report-${estate.id}`}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Export
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadExcelMutation.mutate(estate.id);
                            }}
                            disabled={downloadExcelMutation.isPending}
                            data-testid={`menu-item-export-excel-${estate.id}`}
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Export Excel
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadPdfMutation.mutate(estate.id);
                            }}
                            disabled={downloadPdfMutation.isPending}
                            data-testid={`menu-item-export-pdf-${estate.id}`}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        runScanMutation.mutate(estate.id);
                      }}
                      disabled={runScanMutation.isPending || estate.status === 'crawling' || estate.status === 'auditing'}
                      data-testid={`button-run-scan-${estate.id}`}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {estate.status === 'crawling' ? 'Scanning...' :
                       estate.status === 'auditing' ? 'Testing...' :
                       'Run Scan'}
                    </Button>
                  </div>
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
              <Button onClick={() => setOpen(true)} data-testid="button-create-first-estate">
                <Plus className="h-4 w-4 mr-2" />
                Add Estate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Scan Modal */}
      {selectedEstateId && (
        <LiveScanModal
          estateId={selectedEstateId}
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
