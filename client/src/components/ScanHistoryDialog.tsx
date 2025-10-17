// FORCE REBUILD: v2.0.0 - Added Download Video and Download Trace
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileSpreadsheet, FileText, GitCompare, Clock, CheckCircle, XCircle, Video, FileCode } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ScanRun {
  id: string;
  estateId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  totalIssues: number | null;
  criticalIssues: number | null;
  warningIssues: number | null;
  minorIssues: number | null;
  passRate: number | null;
  averageScore: number | null;
  pagesAudited: number | null;
  videoPath: string | null;
  tracePath: string | null;
}

interface ScanHistoryDialogProps {
  estateId: string;
  estateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanHistoryDialog({ estateId, estateName, open, onOpenChange }: ScanHistoryDialogProps) {
  const { toast } = useToast();
  const [selectedScanForCompare, setSelectedScanForCompare] = useState<string | null>(null);
  const [downloadingExcel, setDownloadingExcel] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null);
  const [downloadingTrace, setDownloadingTrace] = useState<string | null>(null);

  const { data: scans, isLoading } = useQuery<ScanRun[]>({
    queryKey: ['/api/estates', estateId, 'scans', open],
    queryFn: async () => {
      // Add cache busting parameter to force fresh data
      const response = await fetch(`/api/estates/${estateId}/scans?_=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch scan history");
      const data = await response.json();
      
      // Debug: Log received data
      if (data.length > 0) {
        console.log('=== CLIENT RECEIVED SCAN DATA ===');
        console.log('First scan:', data[0]);
        console.log('videoPath:', data[0].videoPath);
        console.log('tracePath:', data[0].tracePath);
        console.log('===================================');
      }
      
      return data;
    },
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });

  const downloadExcelMutation = useMutation({
    mutationFn: async ({ scanRunId }: { scanRunId: string }) => {
      setDownloadingExcel(scanRunId);
      const response = await fetch(`/api/estates/${estateId}/report/excel?scanRunId=${scanRunId}`);
      if (!response.ok) throw new Error("Failed to download Excel report");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessibility-report-${estateName}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Excel report downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download Excel report",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDownloadingExcel(null);
    },
  });

  const downloadPdfMutation = useMutation({
    mutationFn: async ({ scanRunId }: { scanRunId: string }) => {
      setDownloadingPdf(scanRunId);
      const response = await fetch(`/api/estates/${estateId}/report/pdf?scanRunId=${scanRunId}`);
      if (!response.ok) throw new Error("Failed to download PDF report");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accessibility-report-${estateName}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "PDF report downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF report",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDownloadingPdf(null);
    },
  });

  const downloadVideoMutation = useMutation({
    mutationFn: async ({ scanRunId }: { scanRunId: string }) => {
      setDownloadingVideo(scanRunId);
      const response = await fetch(`/api/scans/${scanRunId}/video`);
      if (!response.ok) throw new Error("Failed to download video");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scan-${scanRunId}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Video downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download video",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDownloadingVideo(null);
    },
  });

  const downloadTraceMutation = useMutation({
    mutationFn: async ({ scanRunId }: { scanRunId: string }) => {
      setDownloadingTrace(scanRunId);
      const response = await fetch(`/api/scans/${scanRunId}/trace`);
      if (!response.ok) throw new Error("Failed to download trace");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trace-${scanRunId}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Playwright trace downloaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to download trace",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setDownloadingTrace(null);
    },
  });

  const handleCompare = (scanId: string) => {
    if (selectedScanForCompare === scanId) {
      setSelectedScanForCompare(null);
    } else if (selectedScanForCompare) {
      // Open comparison in new window/dialog
      window.open(`/compare/${selectedScanForCompare}/${scanId}`, '_blank');
      setSelectedScanForCompare(null);
    } else {
      setSelectedScanForCompare(scanId);
      toast({
        title: "Select Second Scan",
        description: "Click another scan to compare",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Scan History - {estateName}</DialogTitle>
          <DialogDescription>
            View and compare previous accessibility scans
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </Card>
              ))}
            </div>
          ) : scans && scans.length > 0 ? (
            <div className="space-y-3">
              {scans.map((scan, index) => (
                <Card 
                  key={scan.id} 
                  className={`p-4 transition-colors ${selectedScanForCompare === scan.id ? 'ring-2 ring-primary' : ''}`}
                  data-testid={`card-scan-${scan.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {scan.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {scan.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                        {scan.status === 'running' && <Clock className="h-4 w-4 text-blue-600 animate-spin" />}
                        
                        <h4 className="font-medium">
                          {index === 0 ? 'Latest Scan' : `Scan ${scans.length - index}`}
                        </h4>
                        <Badge variant={scan.status === 'completed' ? 'default' : scan.status === 'failed' ? 'destructive' : 'secondary'}>
                          {scan.status}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground mb-2">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })}
                      </div>

                      {scan.status === 'completed' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Total Issues:</span>
                            <span className="ml-1 font-medium">{scan.totalIssues || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pass Rate:</span>
                            <span className="ml-1 font-medium">{scan.passRate?.toFixed(1) || 0}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Score:</span>
                            <span className="ml-1 font-medium">{scan.averageScore?.toFixed(0) || 0}/100</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pages:</span>
                            <span className="ml-1 font-medium">{scan.pagesAudited || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {scan.status === 'completed' && (
                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloadingExcel === scan.id || downloadingPdf === scan.id}
                              data-testid={`button-export-scan-${scan.id}`}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => downloadExcelMutation.mutate({ scanRunId: scan.id })}
                              disabled={downloadingExcel === scan.id}
                              data-testid={`menu-item-export-excel-scan-${scan.id}`}
                            >
                              <FileSpreadsheet className="h-4 w-4 mr-2" />
                              Export Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => downloadPdfMutation.mutate({ scanRunId: scan.id })}
                              disabled={downloadingPdf === scan.id}
                              data-testid={`menu-item-export-pdf-scan-${scan.id}`}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            {scan.videoPath && (
                              <DropdownMenuItem
                                onClick={() => downloadVideoMutation.mutate({ scanRunId: scan.id })}
                                disabled={downloadingVideo === scan.id}
                                data-testid={`menu-item-download-video-scan-${scan.id}`}
                              >
                                <Video className="h-4 w-4 mr-2" />
                                Download Video
                              </DropdownMenuItem>
                            )}
                            {scan.tracePath && (
                              <DropdownMenuItem
                                onClick={() => downloadTraceMutation.mutate({ scanRunId: scan.id })}
                                disabled={downloadingTrace === scan.id}
                                data-testid={`menu-item-download-trace-scan-${scan.id}`}
                              >
                                <FileCode className="h-4 w-4 mr-2" />
                                Download Trace
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          size="sm"
                          variant={selectedScanForCompare === scan.id ? "default" : "outline"}
                          onClick={() => handleCompare(scan.id)}
                          data-testid={`button-compare-scan-${scan.id}`}
                        >
                          <GitCompare className="h-3 w-3 mr-1" />
                          Compare
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scan history available</p>
              <p className="text-sm">Run your first scan to see results here</p>
            </div>
          )}
        </ScrollArea>

        {selectedScanForCompare && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Select another scan to compare with the selected scan
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
