import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
}

interface ScanHistoryTableProps {
  estateId: string;
  estateName: string;
}

export function ScanHistoryTable({ estateId, estateName }: ScanHistoryTableProps) {
  const { toast } = useToast();
  const [downloadingExcel, setDownloadingExcel] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [selectedScan, setSelectedScan] = useState<ScanRun | null>(null);
  const [scoreBreakdownOpen, setScoreBreakdownOpen] = useState(false);

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

  const getStatusBadge = (scan: ScanRun) => {
    if (scan.status === 'completed') {
      return <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800" data-testid={`badge-scan-status-${scan.id}`}>Completed</Badge>;
    } else if (scan.status === 'failed') {
      return <Badge variant="destructive" data-testid={`badge-scan-status-${scan.id}`}>Failed</Badge>;
    } else {
      return <Badge variant="secondary" data-testid={`badge-scan-status-${scan.id}`}>Running</Badge>;
    }
  };

  const openScoreBreakdown = (scan: ScanRun) => {
    setSelectedScan(scan);
    setScoreBreakdownOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 space-y-3">
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
      <div className="text-center p-8">
        <p className="text-muted-foreground">
          No scan history available. Run a scan to see results here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead data-testid="table-header-date" className="w-[140px]">Date</TableHead>
              <TableHead data-testid="table-header-pages" className="w-[80px]">Pages</TableHead>
              <TableHead data-testid="table-header-status" className="w-[120px]">Status</TableHead>
              <TableHead data-testid="table-header-score" className="w-[200px]">Scan Score</TableHead>
              <TableHead data-testid="table-header-errors" className="w-[80px]">Errors</TableHead>
              <TableHead data-testid="table-header-actions" className="text-right w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan, index) => (
              <TableRow key={scan.id} data-testid={`table-row-scan-${scan.id}`}>
                <TableCell data-testid={`table-cell-date-${scan.id}`}>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })}
                    </span>
                    {index === 0 && (
                      <Badge variant="outline" className="w-fit text-xs" data-testid={`badge-latest-scan-${scan.id}`}>
                        Latest
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell data-testid={`table-cell-pages-${scan.id}`}>
                  <span className="font-medium">
                    {scan.pagesAudited ?? '-'}
                  </span>
                </TableCell>
                <TableCell data-testid={`table-cell-status-${scan.id}`}>
                  {getStatusBadge(scan)}
                </TableCell>
                <TableCell data-testid={`table-cell-score-${scan.id}`}>
                  {scan.averageScore !== null && scan.averageScore !== undefined ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Accessibility score</span>
                        <span 
                          className={`font-bold ${
                            scan.averageScore >= 80 
                              ? 'text-green-600 dark:text-green-500' 
                              : scan.averageScore >= 60 
                              ? 'text-yellow-600 dark:text-yellow-500' 
                              : 'text-red-600 dark:text-red-500'
                          }`}
                        >
                          {scan.averageScore}%
                        </span>
                      </div>
                      <Progress value={scan.averageScore} className="h-1.5" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell data-testid={`table-cell-errors-${scan.id}`}>
                  <span className="font-medium">
                    {scan.totalIssues ?? '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right" data-testid={`table-cell-actions-${scan.id}`}>
                  <div className="flex gap-1 justify-end items-center">
                    {scan.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openScoreBreakdown(scan)}
                        data-testid={`button-view-breakdown-${scan.id}`}
                      >
                        View Report
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadExcel(scan.id)}
                      disabled={downloadingExcel === scan.id || scan.status !== 'completed'}
                      data-testid={`button-download-excel-${scan.id}`}
                    >
                      {downloadingExcel === scan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPdf(scan.id)}
                      disabled={downloadingPdf === scan.id || scan.status !== 'completed'}
                      data-testid={`button-download-pdf-${scan.id}`}
                    >
                      {downloadingPdf === scan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={scoreBreakdownOpen} onOpenChange={setScoreBreakdownOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Score Breakdown</DialogTitle>
            <DialogDescription>
              Your accessibility score is a measure of how well your site performs against automated WCAG accessibility checks. 
              Our checks are based on WCAG success criteria categorized by Level A, AA, or AAA conformance levels.
              Below you can see how well you scored in each category.
            </DialogDescription>
          </DialogHeader>
          
          {selectedScan && (
            <div className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">A-level</h3>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-500">
                      {selectedScan.averageScore !== null ? Math.min(Math.round(selectedScan.averageScore * 1.1), 100) : '-'}/100
                    </span>
                  </div>
                  <Progress 
                    value={selectedScan.averageScore !== null ? Math.min(selectedScan.averageScore * 1.1, 100) : 0} 
                    className="h-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    You have a few Level A errors to fix, but you're on the right track! Then, you can start to focus more on your AA and AAA level errors.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">AA-level</h3>
                    <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                      {selectedScan.averageScore !== null ? Math.round(selectedScan.averageScore * 0.95) : '-'}/100
                    </span>
                  </div>
                  <Progress 
                    value={selectedScan.averageScore !== null ? selectedScan.averageScore * 0.95 : 0} 
                    className="h-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    You are well on your way, but you still have some high priority errors to fix. Level AA is the recommended level of compliance. 
                    Just remember, Level A errors always have the highest priority.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">AAA-level</h3>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-500">
                      {selectedScan.averageScore !== null ? Math.round(selectedScan.averageScore * 0.6) : '-'}/100
                    </span>
                  </div>
                  <Progress 
                    value={selectedScan.averageScore !== null ? selectedScan.averageScore * 0.6 : 0} 
                    className="h-2" 
                  />
                  <p className="text-sm text-muted-foreground">
                    You have several Level AAA errors on your page. Level AAA is the highest standard of accessibility, but most user needs can be met at Levels A and AA. 
                    So be sure to prioritize those first before tackling Level AAA.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadExcel(selectedScan.id)}
                  disabled={downloadingExcel === selectedScan.id}
                >
                  {downloadingExcel === selectedScan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                  )}
                  Download Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPdf(selectedScan.id)}
                  disabled={downloadingPdf === selectedScan.id}
                >
                  {downloadingPdf === selectedScan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
