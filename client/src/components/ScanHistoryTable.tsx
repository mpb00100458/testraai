import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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
    refetchInterval: 5000, // Refresh every 5 seconds to show new scans
    retry: 1, // Only retry once to avoid hammering the server
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
      return <Badge className="bg-green-600 hover:bg-green-700" data-testid={`badge-scan-status-${scan.id}`}>✓ Completed</Badge>;
    } else if (scan.status === 'failed') {
      return <Badge variant="destructive" data-testid={`badge-scan-status-${scan.id}`}>✗ Failed</Badge>;
    } else {
      return <Badge variant="secondary" data-testid={`badge-scan-status-${scan.id}`}>⏰ Running</Badge>;
    }
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
      <div className="text-center p-8">
        <p className="text-destructive mb-2">
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
      <div className="text-center p-8 text-muted-foreground">
        No scan history available. Run a scan to see results here.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-testid="table-header-date">Date</TableHead>
            <TableHead data-testid="table-header-status">Status</TableHead>
            <TableHead data-testid="table-header-issues" className="text-right">Total Issues</TableHead>
            <TableHead data-testid="table-header-critical" className="text-right">Critical</TableHead>
            <TableHead data-testid="table-header-pass-rate" className="text-right">Pass Rate</TableHead>
            <TableHead data-testid="table-header-pages" className="text-right">Pages</TableHead>
            <TableHead data-testid="table-header-actions" className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map((scan, index) => (
            <TableRow key={scan.id} data-testid={`table-row-scan-${scan.id}`}>
              <TableCell data-testid={`table-cell-date-${scan.id}`}>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })}
                  </span>
                  {index === 0 && (
                    <Badge variant="outline" className="w-fit mt-1" data-testid={`badge-latest-scan-${scan.id}`}>
                      Latest
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell data-testid={`table-cell-status-${scan.id}`}>
                {getStatusBadge(scan)}
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-issues-${scan.id}`}>
                {scan.totalIssues ?? '-'}
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-critical-${scan.id}`}>
                <span className="text-red-600 font-medium">
                  {scan.criticalIssues ?? '-'}
                </span>
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-pass-rate-${scan.id}`}>
                {scan.passRate != null ? `${scan.passRate}%` : '-'}
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-pages-${scan.id}`}>
                {scan.pagesAudited ?? '-'}
              </TableCell>
              <TableCell className="text-right" data-testid={`table-cell-actions-${scan.id}`}>
                <div className="flex gap-2 justify-end">
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
  );
}
