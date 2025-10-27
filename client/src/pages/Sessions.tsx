import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Clock, ExternalLink, AlertCircle, CheckCircle, XCircle, Loader2, PlayCircle, Activity } from "lucide-react";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
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

interface LiveScanProgress {
  scanRunId: string;
  estateId: string;
  status: 'running' | 'completed' | 'failed';
  pagesDiscovered: number;
  pagesAudited: number;
  currentPage?: string;
  issuesFound: number;
  estateName?: string;
  baseUrl?: string;
}

export default function Sessions() {
  const { data: scanRuns = [], isLoading } = useQuery<ScanRunWithDetails[]>({
    queryKey: ["/api/scan-runs"],
  });

  const [liveScans, setLiveScans] = useState<Record<string, LiveScanProgress>>({});
  const wsRef = useRef<WebSocket | null>(null);

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

  // WebSocket connection for real-time scan updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('[Sessions] Creating WebSocket connection to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Sessions] WebSocket connected successfully!');
      
      // Subscribe to any running scans
      const runningScans = scanRuns.filter(scan => scan.status === 'running' || scan.status === 'pending');
      console.log('[Sessions] Subscribing to running scans:', runningScans.length);
      runningScans.forEach(scan => {
        console.log('[Sessions] Subscribing to estate:', scan.estateId);
        ws.send(JSON.stringify({ type: 'subscribe', estateId: scan.estateId }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[Sessions] WebSocket message:', data);
        
        // Handle scan events
        if (data.type === 'scan_start' || data.type === 'page_complete' || data.type === 'scan_complete' || data.type === 'scan_error') {
          const scanRunId = data.data?.scanRunId;
          const estateId = data.estateId;
          const eventType = data.type;
          
          setLiveScans(prev => {
            const pagesAudited = eventType === 'scan_complete' 
              ? (data.data?.totalPages || prev[scanRunId]?.pagesAudited || 0)
              : (data.data?.pageNumber || prev[scanRunId]?.pagesAudited || 0);
            
            const newState = {
              ...prev,
              [scanRunId]: {
                scanRunId,
                estateId,
                status: eventType === 'scan_complete' ? 'completed' : eventType === 'scan_error' ? 'failed' : 'running',
                pagesDiscovered: data.data?.totalPages || prev[scanRunId]?.pagesDiscovered || 0,
                pagesAudited,
                currentPage: data.data?.url || prev[scanRunId]?.currentPage,
                issuesFound: data.data?.totalIssues || prev[scanRunId]?.issuesFound || 0,
                estateName: data.data?.estateName || prev[scanRunId]?.estateName,
                baseUrl: data.data?.baseUrl || prev[scanRunId]?.baseUrl,
              }
            };

            // Remove from live scans when completed
            if (eventType === 'scan_complete' || eventType === 'scan_error') {
              setTimeout(() => {
                setLiveScans(current => {
                  const updated = { ...current };
                  delete updated[scanRunId];
                  return updated;
                });
                // Refresh the scan list to show the completed scan
                queryClient.invalidateQueries({ queryKey: ["/api/scan-runs"] });
              }, 2000);
            }

            return newState;
          });
        }
      } catch (error) {
        console.error('[Sessions] WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[Sessions] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[Sessions] WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [scanRuns]);

  // Get active scans (merge live WebSocket updates with database running scans)
  const dbRunningScans = scanRuns.filter(scan => scan.status === 'running' || scan.status === 'pending');
  const liveScansArray = Object.values(liveScans);
  
  // Merge: prefer WebSocket data if available, otherwise use database data
  const activeScansMap = new Map<string, LiveScanProgress>();
  
  // Add database running scans first
  dbRunningScans.forEach(scan => {
    activeScansMap.set(scan.id, {
      scanRunId: scan.id,
      estateId: scan.estateId,
      status: 'running',
      pagesDiscovered: scan.totalPages || 0,
      pagesAudited: scan.pagesScanned || 0,
      issuesFound: (scan.criticalIssues || 0) + (scan.warningIssues || 0) + (scan.minorIssues || 0),
      estateName: scan.estate.name,
      baseUrl: scan.estate.baseUrl,
    });
  });
  
  // Override with live WebSocket data (more up-to-date)
  liveScansArray.forEach(scan => {
    activeScansMap.set(scan.scanRunId, scan);
  });
  
  const activeScans = Array.from(activeScansMap.values()).filter(scan => scan.status === 'running');
  const completedScans = scanRuns.filter(scan => scan.status === 'completed' || scan.status === 'failed');

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

      {/* Active Scans Section */}
      {activeScans.length > 0 && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary animate-pulse" />
              <CardTitle>Active Scans</CardTitle>
            </div>
            <CardDescription>Live accessibility scans in progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeScans.map((scan) => (
              <Card key={scan.scanRunId} data-testid={`card-active-scan-${scan.scanRunId}`}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          <h3 className="font-semibold text-lg" data-testid={`text-live-estate-${scan.scanRunId}`}>
                            {scan.estateName || 'Scanning...'}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {scan.baseUrl || 'Loading...'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        <Activity className="h-3 w-3 mr-1 animate-pulse" />
                        Running
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-mono" data-testid={`text-live-progress-${scan.scanRunId}`}>
                          {scan.pagesAudited} / {scan.pagesDiscovered || '?'} pages
                        </span>
                      </div>
                      <Progress 
                        value={scan.pagesDiscovered ? (scan.pagesAudited / scan.pagesDiscovered) * 100 : 0} 
                        className="h-2"
                      />
                    </div>

                    {/* Current Page */}
                    {scan.currentPage && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground shrink-0">Testing:</span>
                        <span className="font-mono text-xs truncate" data-testid={`text-live-current-page-${scan.scanRunId}`}>
                          {scan.currentPage}
                        </span>
                      </div>
                    )}

                    {/* Issues Found */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Issues Found</span>
                      <Badge variant={scan.issuesFound > 0 ? "destructive" : "outline"} data-testid={`badge-live-issues-${scan.scanRunId}`}>
                        {scan.issuesFound}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {scanRuns.length === 0 && activeScans.length === 0 ? (
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
            <CardDescription>Completed accessibility scans</CardDescription>
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
                  {completedScans.map((scan) => (
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
