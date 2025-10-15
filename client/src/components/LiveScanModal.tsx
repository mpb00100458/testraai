import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, Globe, TestTube2, XCircle, AlertTriangle, Activity } from "lucide-react";
import type { Estate, ScanRun } from "@shared/schema";

interface LiveScanModalProps {
  estateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LiveScanModal({ estateId, open, onOpenChange }: LiveScanModalProps) {
  const [progress, setProgress] = useState(0);

  const { data: estate, isLoading } = useQuery<Estate>({
    queryKey: ["/api/estates", estateId, "live"],
    queryFn: async () => {
      const response = await fetch(`/api/estates/${estateId}`);
      if (!response.ok) throw new Error("Failed to fetch estate");
      return response.json();
    },
    enabled: open,
    refetchInterval: open ? 1000 : false, // Poll every second when modal is open
  });

  // Poll latest scan run for live statistics
  const { data: scans } = useQuery<ScanRun[]>({
    queryKey: [`/api/estates/${estateId}/scans`],
    queryFn: async () => {
      const response = await fetch(`/api/estates/${estateId}/scans`);
      if (!response.ok) throw new Error("Failed to fetch scan runs");
      return response.json();
    },
    enabled: open,
    refetchInterval: open ? 2000 : false, // Poll every 2 seconds
  });

  const latestScan = scans?.[0];

  useEffect(() => {
    if (!estate) return;

    // Calculate progress based on status
    if (estate.status === 'idle') {
      setProgress(0);
    } else if (estate.status === 'crawling') {
      setProgress(25);
    } else if (estate.status === 'auditing') {
      const pagesDiscovered = estate.pagesDiscovered || 0;
      const pagesAudited = estate.pagesAudited || 0;
      if (pagesDiscovered > 0) {
        const auditProgress = (pagesAudited / pagesDiscovered) * 50;
        setProgress(25 + auditProgress);
      } else {
        setProgress(50);
      }
    } else if (estate.status === 'completed') {
      setProgress(100);
    } else if (estate.status === 'failed') {
      setProgress(0);
    }
  }, [estate]);

  // Auto-close after completion
  useEffect(() => {
    if (estate?.status === 'completed') {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [estate?.status, onOpenChange]);

  const getStatusIcon = () => {
    if (!estate) return <Loader2 className="h-6 w-6 animate-spin" />;
    
    switch (estate.status) {
      case 'crawling':
        return <Globe className="h-6 w-6 animate-pulse text-blue-500" />;
      case 'auditing':
        return <TestTube2 className="h-6 w-6 animate-pulse text-purple-500" />;
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Loader2 className="h-6 w-6" />;
    }
  };

  const getStatusText = () => {
    if (!estate) return "Loading...";
    
    switch (estate.status) {
      case 'crawling':
        return "Discovering pages...";
      case 'auditing':
        return "Running accessibility tests...";
      case 'completed':
        return "Scan completed successfully!";
      case 'failed':
        return "Scan failed";
      default:
        return "Initializing...";
    }
  };

  const isComplete = estate?.status === 'completed' || estate?.status === 'failed';
  const isFailed = estate?.status === 'failed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" data-testid="modal-live-scan">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Live Scan Progress</span>
          </DialogTitle>
          <DialogDescription>
            {getStatusText()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-scan" />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <Badge variant={
              isFailed ? 'destructive' :
              isComplete ? 'default' :
              'secondary'
            } data-testid="badge-scan-status">
              {estate?.status || 'idle'}
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-pages-discovered">
                      {estate?.pagesDiscovered || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Pages Discovered</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TestTube2 className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold" data-testid="text-pages-audited">
                      {estate?.pagesAudited || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Pages Audited</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Latest Scan Stats (if available) */}
          {latestScan && latestScan.status === 'running' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <p className="text-sm font-medium">Issues Found (Live)</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xl font-bold text-red-500" data-testid="text-critical-issues">
                        {latestScan.criticalIssues || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-500" data-testid="text-warning-issues">
                        {latestScan.warningIssues || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Warning</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-500" data-testid="text-minor-issues">
                        {latestScan.minorIssues || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Minor</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Results (when complete) */}
          {isComplete && latestScan && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-sm font-medium">Final Results</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xl font-bold text-red-500">
                        {latestScan.criticalIssues || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Critical</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-yellow-500">
                        {latestScan.warningIssues || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Warning</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-500">
                        {latestScan.minorIssues || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Minor</p>
                    </div>
                  </div>
                  
                  {latestScan.passRate !== null && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">Pass Rate</p>
                        <p className="text-lg font-bold" data-testid="text-pass-rate">
                          {latestScan.passRate}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {isComplete && (
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                onClick={() => onOpenChange(false)}
                data-testid="button-close-scan-progress"
              >
                {isFailed ? "Close" : "View Results"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
