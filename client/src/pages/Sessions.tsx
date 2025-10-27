import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, ExternalLink, AlertCircle, CheckCircle, XCircle, Loader2, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import type { ScanRun } from "@shared/schema";

interface ScanRunWithDetails extends ScanRun {
  estate: {
    id: string;
    name: string;
    baseUrl: string;
    project: {
      id: string;
      name: string;
    };
  };
}

export default function Sessions() {
  const { data: scanRuns = [], isLoading } = useQuery<ScanRunWithDetails[]>({
    queryKey: ["/api/scan-runs"],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <PlayCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default' as const,
      failed: 'destructive' as const,
      running: 'secondary' as const,
      pending: 'outline' as const,
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} data-testid={`badge-status-${status}`}>
        {status}
      </Badge>
    );
  };

  const calculateScore = (scan: ScanRunWithDetails) => {
    const total = (scan.criticalIssues || 0) + (scan.warningIssues || 0) + (scan.minorIssues || 0) + (scan.passedChecks || 0);
    if (total === 0) return 0;
    return Math.round(((scan.passedChecks || 0) / total) * 100);
  };

  const getTotalIssues = (scan: ScanRunWithDetails) => {
    return (scan.criticalIssues || 0) + (scan.warningIssues || 0) + (scan.minorIssues || 0);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
            <p className="text-muted-foreground mt-1">AI Agent scan history and results</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading scan sessions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground mt-1">AI Agent scan history and results</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{scanRuns.length} total scans</span>
        </div>
      </div>

      {scanRuns.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scan Sessions Yet</h3>
              <p className="text-muted-foreground max-w-md">
                Use the AI Agent to start your first accessibility scan. Just tell the AI to scan a URL!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Scan History</CardTitle>
            <CardDescription>All accessibility scans performed by the AI Agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scanRuns.map((scan) => (
                    <TableRow key={scan.id} data-testid={`row-scan-${scan.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(scan.status)}
                          {getStatusBadge(scan.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium" data-testid={`text-estate-${scan.id}`}>
                            {scan.estate.name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-xs">
                            {scan.estate.baseUrl}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-project-${scan.id}`}>
                          {scan.estate.project.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {scan.startedAt ? format(new Date(scan.startedAt), 'MMM d, yyyy') : '-'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {scan.startedAt ? format(new Date(scan.startedAt), 'h:mm a') : ''}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono" data-testid={`text-pages-${scan.id}`}>
                          {scan.pagesScanned || 0} / {scan.totalPages || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {(scan.criticalIssues || 0) > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {scan.criticalIssues} critical
                              </Badge>
                            )}
                            {(scan.warningIssues || 0) > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {scan.warningIssues} warning
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground" data-testid={`text-total-issues-${scan.id}`}>
                            {getTotalIssues(scan)} total
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-destructive via-warning to-success"
                              style={{ width: `${calculateScore(scan)}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono" data-testid={`text-score-${scan.id}`}>
                            {calculateScore(scan)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          data-testid={`button-view-scan-${scan.id}`}
                        >
                          <a href={`/scans/${scan.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
