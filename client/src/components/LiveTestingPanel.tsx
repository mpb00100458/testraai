import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Terminal,
  XCircle,
  TestTube2,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ActivityLog {
  id: string;
  type: 'scan_start' | 'page_discovered' | 'page_testing' | 'page_complete' | 'issue_found' | 'scan_complete' | 'scan_error';
  timestamp: string;
  message: string;
  data?: any;
  severity?: 'info' | 'warning' | 'error' | 'success';
}

interface LiveTestingPanelProps {
  estateId: string;
  estateName?: string;
}

export function LiveTestingPanel({ estateId, estateName }: LiveTestingPanelProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [pagesDiscovered, setPagesDiscovered] = useState(0);
  const [pagesTested, setPagesTested] = useState(0);
  const [issuesFound, setIssuesFound] = useState({ critical: 0, warning: 0, minor: 0 });
  const [currentPage, setCurrentPage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [currentScreenshot, setCurrentScreenshot] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(true);
  
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxTotalPagesRef = useRef(0);

  useEffect(() => {
    if (!estateId) return;

    // Reset state
    setLogs([]);
    setScanComplete(false);
    setPagesDiscovered(0);
    setPagesTested(0);
    setIssuesFound({ critical: 0, warning: 0, minor: 0 });
    setCurrentPage("");
    setProgress(0);
    setCurrentScreenshot("");
    maxTotalPagesRef.current = 0;

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[LiveTestingPanel] WebSocket connected');
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
          const tested = message.data?.pageNumber || 0;
          const discovered = message.data?.totalPages || 1;
          setPagesTested(tested);
          setPagesDiscovered(discovered);
          setProgress(Math.min((tested / discovered) * 100, 100));
          logEntry.message = `Testing [${tested}/${discovered}]: ${message.data?.url}`;
          logEntry.severity = 'info';
          break;
        
        case 'page_complete':
          if (message.data?.screenshot) {
            setCurrentScreenshot(message.data.screenshot);
          }
          logEntry.message = `Completed: ${message.data?.url} (${message.data?.issuesFound || 0} issues)`;
          logEntry.severity = message.data?.issuesFound > 0 ? 'warning' : 'success';
          break;
        
        case 'issue_found':
          const severity = message.data?.issue?.severity || 'minor';
          setIssuesFound(prev => ({
            ...prev,
            [severity]: (prev[severity as keyof typeof prev] || 0) + 1,
          }));
          logEntry.message = `${severity.toUpperCase()}: ${message.data?.issue?.description}`;
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
      console.error('[LiveTestingPanel] WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('[LiveTestingPanel] WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [estateId]);

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

  if (logs.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20" data-testid="panel-live-testing">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                Live Accessibility Testing
                {estateName && <span className="text-sm font-normal text-muted-foreground ml-2">• {estateName}</span>}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-gray-400" />
                  <span className="text-xs text-muted-foreground">Disconnected</span>
                </div>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            {!scanComplete && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {pagesTested} / {pagesDiscovered} pages tested
                  </span>
                  <span className="text-muted-foreground">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-red-500">{issuesFound.critical}</div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-yellow-500">{issuesFound.warning}</div>
                <div className="text-xs text-muted-foreground">Warning</div>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-blue-500">{issuesFound.minor}</div>
                <div className="text-xs text-muted-foreground">Minor</div>
              </div>
            </div>

            {/* Live Screenshot */}
            {currentScreenshot && !scanComplete && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4" />
                  <span>Live Browser View</span>
                  <Badge variant="secondary" className="ml-auto">Real-time</Badge>
                </div>
                <div className="relative rounded-lg overflow-hidden border bg-muted/50">
                  <img 
                    src={`data:image/jpeg;base64,${currentScreenshot}`} 
                    alt="Current page screenshot"
                    className="w-full h-auto"
                    data-testid="img-live-screenshot-panel"
                  />
                </div>
                <p className="text-xs text-muted-foreground truncate">{currentPage}</p>
              </div>
            )}

            {/* Activity Log */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Terminal className="h-4 w-4" />
                <span>Activity Log</span>
              </div>
              <ScrollArea className="h-48 rounded-lg border bg-muted/50 p-3" ref={scrollRef}>
                <div className="space-y-2 font-mono text-xs">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-2 items-start"
                      data-testid={`log-${log.type}`}
                    >
                      <span className={getSeverityColor(log.severity)}>
                        {getSeverityIcon(log.severity)}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={getSeverityColor(log.severity)}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Completion Status */}
            {scanComplete && (
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Scan Complete</span>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
