import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2, Eye, Video, FileCode } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { GradientButton } from "@/components/GradientButton";

interface ScanRun {
  id: string;
  status: string;
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

interface ScanHistoryTableProps {
  estateId: string;
  estateName: string;
}

export function ScanHistoryTable({ estateId, estateName }: ScanHistoryTableProps) {
  const { toast } = useToast();
  const [downloadingExcel, setDownloadingExcel] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [downloadingVideo, setDownloadingVideo] = useState<string | null>(null);
  const [downloadingTrace, setDownloadingTrace] = useState<string | null>(null);

  const { data: scans, isLoading, error } = useQuery<ScanRun[]>({
    queryKey: ['/api/estates', estateId, 'scans'],
    queryFn: async () => {
      const response = await fetch(`/api/estates/${estateId}/scans`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - please log in again");
        }
        if (response.status === 403) {
          throw new Error("Access denied to this estate");
        }
        throw new Error("Failed to fetch scan history");
      }
      return response.json();
    },
    refetchInterval: 5000,
    retry: 1,
  });

  const handleDownloadExcel = async (scanId: string) => {
    setDownloadingExcel(scanId);
    try {
      const response = await fetch(`/api/estates/${estateId}/report/excel?scanRunId=${scanId}`);
      if (!response.ok) {
        throw new Error("Failed to download Excel report");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${estateName.replace(/\s+/g, '_')}_scan_${scanId.substring(0, 8)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Excel report downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download report",
        variant: "destructive",
      });
    } finally {
      setDownloadingExcel(null);
    }
  };

  const handleDownloadPdf = async (scanId: string) => {
    setDownloadingPdf(scanId);
    try {
      const response = await fetch(`/api/estates/${estateId}/report/pdf?scanRunId=${scanId}`);
      if (!response.ok) {
        throw new Error("Failed to download PDF report");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${estateName.replace(/\s+/g, '_')}_scan_${scanId.substring(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "PDF report downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download report",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadVideo = async (scanId: string) => {
    setDownloadingVideo(scanId);
    try {
      const response = await fetch(`/api/scans/${scanId}/video`);
      if (!response.ok) {
        throw new Error("Failed to download video");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${estateName.replace(/\s+/g, '_')}_scan_${scanId.substring(0, 8)}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Video downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download video",
        variant: "destructive",
      });
    } finally {
      setDownloadingVideo(null);
    }
  };

  const handleDownloadTrace = async (scanId: string) => {
    setDownloadingTrace(scanId);
    try {
      const response = await fetch(`/api/scans/${scanId}/trace`);
      if (!response.ok) {
        throw new Error("Failed to download trace");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${estateName.replace(/\s+/g, '_')}_scan_${scanId.substring(0, 8)}_trace.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Trace downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download trace",
        variant: "destructive",
      });
    } finally {
      setDownloadingTrace(null);
    }
  };

  const getStatusBadge = (scan: ScanRun) => {
    if (scan.status === 'completed') {
      return <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800" data-testid={`badge-scan-status-${scan.id}`}>Completed</Badge>;
    } else if (scan.status === 'failed') {
      return <Badge variant="destructive" data-testid={`badge-scan-status-${scan.id}`}>Failed</Badge>;
    } else {
      return <Badge variant="secondary" data-testid={`badge-scan-status-${scan.id}`}>Running</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-12 space-y-3">
        <p className="text-destructive font-medium">
          {error instanceof Error ? error.message : "Failed to load scan history"}
        </p>
        {error instanceof Error && error.message.includes("Unauthorized") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-relogin"
          >
            Log In Again
          </Button>
        )}
      </div>
    );
  }

  if (!scans || scans.length === 0) {
    return (
      <div className="text-center p-12">
        <p className="text-muted-foreground text-base">
          No scan history available. Run a scan to see results here.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-testid="table-header-date" className="w-[180px]">Date</TableHead>
            <TableHead data-testid="table-header-status" className="w-[140px]">Status</TableHead>
            <TableHead data-testid="table-header-score" className="w-[140px]">Score</TableHead>
            <TableHead data-testid="table-header-issues" className="text-right w-[120px]">Total Issues</TableHead>
            <TableHead data-testid="table-header-critical" className="text-right w-[100px]">Critical</TableHead>
            <TableHead data-testid="table-header-pass-rate" className="w-[140px]">Pass Rate</TableHead>
            <TableHead data-testid="table-header-pages" className="text-right w-[100px]">Pages</TableHead>
            <TableHead data-testid="table-header-actions" className="text-right w-[300px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan, index) => (
            <TableRow key={scan.id} data-testid={`table-row-scan-${scan.id}`} className="hover-elevate">
              <TableCell data-testid={`table-cell-date-${scan.id}`}>
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-sm">
                    {formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })}
                  </span>
                  {index === 0 && (
                    <Badge variant="outline" className="w-fit text-xs py-0" data-testid={`badge-latest-scan-${scan.id}`}>
                      Latest
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell data-testid={`table-cell-status-${scan.id}`}>
                {getStatusBadge(scan)}
              </TableCell>
              <TableCell data-testid={`table-cell-score-${scan.id}`}>
                {scan.averageScore !== null && scan.averageScore !== undefined ? (
                  <div className="flex items-center gap-2">
                    <span 
                      className={`font-semibold text-lg ${
                        scan.averageScore >= 80 
                          ? 'text-green-600 dark:text-green-500' 
                          : scan.averageScore >= 60 
                          ? 'text-yellow-600 dark:text-yellow-500' 
                          : 'text-red-600 dark:text-red-500'
                      }`}
                    >
                      {scan.averageScore}
                    </span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-issues-${scan.id}`}>
                <span className="font-medium text-base">
                  {scan.totalIssues ?? '-'}
                </span>
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-critical-${scan.id}`}>
                {scan.criticalIssues != null ? (
                  <Badge variant={scan.criticalIssues > 0 ? "destructive" : "outline"} className="font-medium">
                    {scan.criticalIssues}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell data-testid={`table-cell-pass-rate-${scan.id}`}>
                {scan.passRate != null ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span 
                        className={`font-semibold text-sm ${
                          scan.passRate >= 80 
                            ? 'text-green-600 dark:text-green-500' 
                            : scan.passRate >= 60 
                            ? 'text-yellow-600 dark:text-yellow-500' 
                            : 'text-red-600 dark:text-red-500'
                        }`}
                      >
                        {scan.passRate}%
                      </span>
                    </div>
                    <Progress value={scan.passRate} className="h-1.5" />
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-pages-${scan.id}`}>
                <span className="font-medium text-base">
                  {scan.pagesAudited ?? '-'}
                </span>
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-actions-${scan.id}`}>
                <div className="flex gap-2 justify-end">
                  <Link href={`/scans/${scan.id}`}>
                    <GradientButton
                      size="sm"
                      disabled={scan.status !== 'completed'}
                      data-testid={`button-view-report-${scan.id}`}
                      showIcon={false}
                    >
                      <Eye className="h-3 w-3 mr-1.5" />
                      <span className="text-xs font-medium">View</span>
                    </GradientButton>
                  </Link>
                  
                  <GradientButton
                    size="sm"
                    onClick={() => handleDownloadExcel(scan.id)}
                    disabled={downloadingExcel === scan.id || scan.status !== 'completed'}
                    data-testid={`button-download-excel-${scan.id}`}
                    showIcon={false}
                  >
                    {downloadingExcel === scan.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        <span className="text-xs">Downloading...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-3 w-3 mr-1.5" />
                        <span className="text-xs font-medium">Excel</span>
                      </>
                    )}
                  </GradientButton>
                  
                  <GradientButton
                    size="sm"
                    onClick={() => handleDownloadPdf(scan.id)}
                    disabled={downloadingPdf === scan.id || scan.status !== 'completed'}
                    data-testid={`button-download-pdf-${scan.id}`}
                    showIcon={false}
                  >
                    {downloadingPdf === scan.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        <span className="text-xs">Downloading...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="h-3 w-3 mr-1.5" />
                        <span className="text-xs font-medium">PDF</span>
                      </>
                    )}
                  </GradientButton>
                  
                  <GradientButton
                    size="sm"
                    onClick={() => handleDownloadVideo(scan.id)}
                    disabled={downloadingVideo === scan.id || scan.status !== 'completed'}
                    data-testid={`button-download-video-${scan.id}`}
                    showIcon={false}
                  >
                    {downloadingVideo === scan.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        <span className="text-xs">Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Video className="h-3 w-3 mr-1.5" />
                        <span className="text-xs font-medium">Video</span>
                      </>
                    )}
                  </GradientButton>
                  
                  <GradientButton
                    size="sm"
                    onClick={() => handleDownloadTrace(scan.id)}
                    disabled={downloadingTrace === scan.id || scan.status !== 'completed'}
                    data-testid={`button-download-trace-${scan.id}`}
                    showIcon={false}
                  >
                    {downloadingTrace === scan.id ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        <span className="text-xs">Downloading...</span>
                      </>
                    ) : (
                      <>
                        <FileCode className="h-3 w-3 mr-1.5" />
                        <span className="text-xs font-medium">Trace</span>
                      </>
                    )}
                  </GradientButton>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
