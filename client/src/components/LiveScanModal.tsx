import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Globe, TestTube2 } from "lucide-react";
import type { Estate } from "@shared/schema";

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
    if (!estate) return <Loader2 className="h-8 w-8 animate-spin" />;
    
    switch (estate.status) {
      case 'crawling':
        return <Globe className="h-8 w-8 animate-pulse text-blue-500" />;
      case 'auditing':
        return <TestTube2 className="h-8 w-8 animate-pulse text-purple-500" />;
      case 'completed':
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <div className="h-8 w-8 text-red-500">✗</div>;
      default:
        return <Loader2 className="h-8 w-8" />;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="modal-live-scan">
        <DialogHeader>
          <DialogTitle>Live Scan Progress</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status Icon */}
          <div className="flex justify-center">
            {getStatusIcon()}
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <Badge variant={
              estate?.status === 'completed' ? 'default' :
              estate?.status === 'failed' ? 'destructive' :
              'secondary'
            } data-testid="badge-scan-status">
              {estate?.status === 'crawling' ? '🔍 Scanning Pages' :
               estate?.status === 'auditing' ? '🧪 Testing Accessibility' :
               estate?.status === 'completed' ? '✓ Completed' :
               estate?.status === 'failed' ? '✗ Failed' :
               'Ready'}
            </Badge>
          </div>

          {/* Status Text */}
          <div className="text-center">
            <p className="text-sm font-medium" data-testid="text-scan-status">
              {getStatusText()}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" data-testid="progress-scan" />
            <p className="text-xs text-muted-foreground text-center">
              {Math.round(progress)}% complete
            </p>
          </div>

          {/* Stats */}
          {estate && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold" data-testid="text-pages-discovered">
                  {estate.pagesDiscovered || 0}
                </p>
                <p className="text-xs text-muted-foreground">Pages Discovered</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold" data-testid="text-pages-audited">
                  {estate.pagesAudited || 0}
                </p>
                <p className="text-xs text-muted-foreground">Pages Audited</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
