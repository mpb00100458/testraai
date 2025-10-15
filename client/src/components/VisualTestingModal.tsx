import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Globe, 
  TestTube2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Terminal,
  AlertCircle
} from "lucide-react";

interface ActivityLog {
  id: string;
  type: 'scan_start' | 'page_discovered' | 'page_testing' | 'page_complete' | 'issue_found' | 'scan_complete' | 'scan_error';
  timestamp: string;
  message: string;
  data?: any;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

interface VisualTestingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estateId: string;
  estateName: string;
}

export function VisualTestingModal({ open, onOpenChange, estateId, estateName }: VisualTestingModalProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [pagesDiscovered, setPagesDiscovered] = useState(0);
  const [pagesTested, setPagesTested] = useState(0);
  const [issuesFound, setIssuesFound] = useState({ critical: 0, warning: 0, minor: 0 });
  const [currentPage, setCurrentPage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !estateId) return;

    // Reset state
    setLogs([]);
    setScanComplete(false);
    setPagesDiscovered(0);
    setPagesTested(0);
    setIssuesFound({ critical: 0, warning: 0, minor: 0 });
    setCurrentPage("");
    setProgress(0);

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      // Subscribe to estate updates
      ws.send(JSON.stringify({ type: 'subscribe', estateId }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      const logEntry: ActivityLog = {
        id: `${Date.now()}-${Math.random()}`,
        type: message.type,
        timestamp: new Date().toISOString(),
        message: '',
        data: message.data,
        severity: 'info',
      };

      switch (message.type) {
        case 'scan_start':
          logEntry.message = `Starting scan for ${message.data?.baseUrl}`;
          logEntry.severity = 'info';
          break;
        
        case 'page_discovered':
          setPagesDiscovered(message.data?.totalPages || 0);
          logEntry.message = `Discovered: ${message.data?.url}`;
          logEntry.severity = 'info';
          break;
        
        case 'page_testing':
          setCurrentPage(message.data?.url || '');
          setPagesTested(message.data?.pageNumber || 0);
          const totalPages = message.data?.totalPages || 1;
          setProgress(((message.data?.pageNumber || 0) / totalPages) * 100);
          logEntry.message = `Testing [${message.data?.pageNumber}/${totalPages}]: ${message.data?.url}`;
          logEntry.severity = 'info';
          break;
        
        case 'page_complete':
          logEntry.message = `Completed: ${message.data?.url} (${message.data?.issuesFound || 0} issues)`;
          logEntry.severity = message.data?.issuesFound > 0 ? 'warning' : 'success';
          break;
        
        case 'issue_found':
          const severity = message.data?.issue?.severity || 'minor';
          setIssuesFound(prev => ({
            ...prev,
            [severity]: (prev[severity as keyof typeof prev] || 0) + 1,
          }));
          logEntry.message = `${severity.toUpperCase()}: ${message.data?.issue?.description} (${message.data?.url})`;
          logEntry.severity = severity === 'critical' ? 'error' : 'warning';
          break;
        
        case 'scan_complete':
          setScanComplete(true);
          setProgress(100);
          logEntry.message = `Scan complete! Found ${message.data?.totalIssues || 0} issues across ${message.data?.totalPages || 0} pages`;
          logEntry.severity = 'success';
          break;
        
        case 'scan_error':
          setScanComplete(true);
          logEntry.message = `Scan failed: ${message.data?.error}`;
          logEntry.severity = 'error';
          break;
      }

      setLogs(prev => [...prev, logEntry]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [open, estateId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'warning': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity) {
      case 'success': return <CheckCircle2 className="h-3 w-3" />;
      case 'error': return <XCircle className="h-3 w-3" />;
      case 'warning': return <AlertTriangle className="h-3 w-3" />;
      default: return <Terminal className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]" data-testid="modal-visual-testing">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            Live Accessibility Testing - {estateName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Connected • Real-time updates</span>
              </>
            ) : (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Connecting...</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" data-testid="progress-visual-scan" />
          </div>

          {/* Current Activity */}
          {currentPage && !scanComplete && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Currently Testing</p>
                    <p className="text-xs text-muted-foreground truncate">{currentPage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xl font-bold" data-testid="text-pages-discovered-visual">
                      {pagesDiscovered}
                    </p>
                    <p className="text-xs text-muted-foreground">Discovered</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TestTube2 className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-xl font-bold" data-testid="text-pages-tested-visual">
                      {pagesTested}
                    </p>
                    <p className="text-xs text-muted-foreground">Tested</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-xl font-bold text-red-500" data-testid="text-critical-visual">
                      {issuesFound.critical}
                    </p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-xl font-bold text-yellow-500" data-testid="text-warnings-visual">
                      {issuesFound.warning + issuesFound.minor}
                    </p>
                    <p className="text-xs text-muted-foreground">Warnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Log */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
                <Terminal className="h-4 w-4" />
                <span className="text-sm font-medium">Activity Log</span>
                <Badge variant="secondary" className="ml-auto">
                  {logs.length} events
                </Badge>
              </div>
              <ScrollArea className="h-64" ref={scrollRef}>
                <div className="p-4 space-y-2 font-mono text-xs" data-testid="activity-log">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Waiting for scan to start...
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 py-1 hover-elevate rounded px-2 -mx-2"
                      >
                        <span className={getSeverityColor(log.severity)}>
                          {getSeverityIcon(log.severity)}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`flex-1 ${getSeverityColor(log.severity)}`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {scanComplete && (
            <div className="flex justify-end gap-2">
              <Button onClick={() => onOpenChange(false)} data-testid="button-close-visual-testing">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
