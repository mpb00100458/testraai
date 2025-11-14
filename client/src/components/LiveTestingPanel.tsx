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
  ChevronUp,
  Maximize2,
  ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  websocket?: WebSocket | null;
}

interface ElementDetail {
  html: string;
  selector: string;
  failureSummary: string;
}

interface IssueDetail {
  type: string;
  severity: string;
  description: string;
  nodesCount: number;
  elements?: ElementDetail[];
  helpUrl?: string;
  url: string;
}

export function LiveTestingPanel({ estateId, estateName, websocket }: LiveTestingPanelProps) {
  console.log('[LiveTestingPanel] ========================================');
  console.log('[LiveTestingPanel] Component function called with estateId:', estateId);
  console.log('[LiveTestingPanel] Has websocket prop:', !!websocket);
  console.log('[LiveTestingPanel] ========================================');
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [pagesDiscovered, setPagesDiscovered] = useState(0);
  const [pagesTested, setPagesTested] = useState(0);
  const [issuesFound, setIssuesFound] = useState({ critical: 0, warning: 0, minor: 0 });
  const [currentPage, setCurrentPage] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [currentScreenshot, setCurrentScreenshot] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [recentIssues, setRecentIssues] = useState<IssueDetail[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueDetail | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const maxTotalPagesRef = useRef(0);

  useEffect(() => {
    console.log('[LiveTestingPanel] ========================================');
    console.log('[LiveTestingPanel] ⚡ useEffect TRIGGERED with estateId:', estateId);
    console.log('[LiveTestingPanel] Has websocket:', !!websocket);
    console.log('[LiveTestingPanel] ========================================');
    if (!estateId) {
      console.log('[LiveTestingPanel] ❌ No estateId, skipping setup');
      return;
    }

    if (!websocket) {
      console.log('[LiveTestingPanel] ❌ No websocket provided, skipping setup');
      return;
    }

    console.log('[LiveTestingPanel] ✅ Setting up message handler for estate:', estateId);
    // Reset state
    setLogs([]);
    setScanComplete(false);
    setScanFailed(false);
    setErrorMessage("");
    setPagesDiscovered(0);
    setPagesTested(0);
    setIssuesFound({ critical: 0, warning: 0, minor: 0 });
    setCurrentPage("");
    setProgress(0);
    setCurrentScreenshot("");
    setRecentIssues([]);
    setSelectedIssue(null);
    setShowInspector(false);
    maxTotalPagesRef.current = 0;

    // Set connected state based on WebSocket readyState
    setIsConnected(websocket.readyState === WebSocket.OPEN);

    // Subscribe to estate updates if WebSocket is already open
    if (websocket.readyState === WebSocket.OPEN) {
      const subscribeMessage = { type: 'subscribe', estateId };
      console.log('[LiveTestingPanel] Sending subscribe message:', subscribeMessage);
      websocket.send(JSON.stringify(subscribeMessage));
    }

    // Handle incoming WebSocket messages
    const handleMessage = (event: MessageEvent) => {
      const message = JSON.parse(event.data);

      // Only process messages for this estate
      if (message.estateId !== estateId) {
        return;
      }

      console.log('[LiveTestingPanel] WebSocket message received:', {
        type: message.type,
        estateId: message.estateId,
        hasData: !!message.data,
        hasScreenshot: !!message.data?.screenshot
      });

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
          console.log('[LiveTestingPanel] Page complete event:', {
            hasScreenshot: !!message.data?.screenshot,
            screenshotLength: message.data?.screenshot?.length,
            url: message.data?.url
          });
          if (message.data?.screenshot) {
            setCurrentScreenshot(message.data.screenshot);
            console.log('[LiveTestingPanel] Screenshot updated');
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

          // Store issue details for inspector
          if (message.data?.issue) {
            console.log('[LiveTestingPanel] Issue found event:', {
              type: message.data.issue.type,
              hasElements: !!message.data.issue.elements,
              elementsCount: message.data.issue.elements?.length || 0,
              elements: message.data.issue.elements,
            });

            const issueDetail: IssueDetail = {
              type: message.data.issue.type,
              severity: message.data.issue.severity,
              description: message.data.issue.description,
              nodesCount: message.data.issue.nodesCount || 0,
              elements: message.data.issue.elements || [],
              helpUrl: message.data.issue.helpUrl,
              url: message.data.url || currentPage,
            };

            setRecentIssues(prev => {
              // Keep only the last 20 issues
              const updated = [issueDetail, ...prev].slice(0, 20);
              console.log('[LiveTestingPanel] Updated recent issues:', updated.length);
              return updated;
            });
          }

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
          setScanFailed(true);
          setErrorMessage(message.data?.error || 'Unknown error occurred');
          logEntry.message = `Scan failed: ${message.data?.error}`;
          logEntry.severity = 'error';
          break;
      }

      setLogs(prev => [...prev, logEntry]);
    };

    // Add message listener
    websocket.addEventListener('message', handleMessage);

    // Handle WebSocket state changes
    const handleOpen = () => {
      console.log('[LiveTestingPanel] WebSocket opened, subscribing to estate:', estateId);
      setIsConnected(true);
      const subscribeMessage = { type: 'subscribe', estateId };
      websocket.send(JSON.stringify(subscribeMessage));
    };

    const handleClose = () => {
      console.log('[LiveTestingPanel] WebSocket closed');
      setIsConnected(false);
    };

    const handleError = (error: Event) => {
      console.error('[LiveTestingPanel] WebSocket error:', error);
      setIsConnected(false);
    };

    // Add event listeners if WebSocket is not yet open
    if (websocket.readyState !== WebSocket.OPEN) {
      websocket.addEventListener('open', handleOpen);
    }
    websocket.addEventListener('close', handleClose);
    websocket.addEventListener('error', handleError);

    return () => {
      console.log('[LiveTestingPanel] ========================================');
      console.log('[LiveTestingPanel] 🔴 CLEANUP/UNMOUNT for estate:', estateId);
      console.log('[LiveTestingPanel] ========================================');

      // Remove event listeners
      websocket.removeEventListener('message', handleMessage);
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('close', handleClose);
      websocket.removeEventListener('error', handleError);
    };
  }, [estateId, websocket]);

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

  // Don't hide the panel if there are no logs yet - show it immediately when scan starts
  // if (logs.length === 0) {
  //   return null;
  // }

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
            {/* Error Message */}
            {scanFailed && errorMessage && (
              <div className="rounded-lg border-2 border-red-500/20 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-600 mb-1">Scan Failed</h4>
                    <p className="text-sm text-red-600/90">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

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
            {!scanComplete && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>Live Browser View</span>
                  {currentScreenshot && (
                    <Badge variant="secondary" className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-1.5" />
                      Live
                    </Badge>
                  )}
                </div>
                {currentScreenshot ? (
                  <>
                    <div className="relative rounded-lg overflow-hidden border-2 border-blue-500/20 bg-muted/50 group">
                      <img
                        src={`data:image/jpeg;base64,${currentScreenshot}`}
                        alt="Current page screenshot"
                        className="w-full h-auto cursor-pointer transition-transform group-hover:scale-[1.02]"
                        data-testid="img-live-screenshot-panel"
                        onClick={() => setShowLivePreview(true)}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-2 shadow-lg"
                          onClick={() => setShowLivePreview(true)}
                        >
                          <Maximize2 className="h-4 w-4" />
                          View Full Screen
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">{currentPage}</p>
                      {currentPage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => window.open(currentPage, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-muted bg-muted/30 p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Waiting for first page to load...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Element Inspector */}
            {(() => {
              console.log('[LiveTestingPanel] Rendering inspector check:', {
                recentIssuesCount: recentIssues.length,
                showInspector,
              });
              return null;
            })()}
            {recentIssues.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span>Element Inspector</span>
                    <Badge variant="secondary" className="ml-1">
                      {recentIssues.length} recent
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowInspector(!showInspector)}
                  >
                    {showInspector ? 'Hide' : 'Show'}
                  </Button>
                </div>

                {showInspector && (
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    <ScrollArea className="h-64">
                      <div className="p-3 space-y-2">
                        {recentIssues.map((issue, idx) => (
                          <div
                            key={idx}
                            className={`rounded-lg border p-3 cursor-pointer transition-all hover:bg-muted/50 ${
                              selectedIssue === issue ? 'bg-muted border-primary' : 'bg-background'
                            }`}
                            onClick={() => setSelectedIssue(selectedIssue === issue ? null : issue)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {issue.severity}
                                  </Badge>
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {issue.type}
                                  </span>
                                </div>
                                <p className="text-sm">{issue.description}</p>
                                {issue.url && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {issue.url}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {issue.nodesCount} {issue.nodesCount === 1 ? 'element' : 'elements'}
                              </Badge>
                            </div>

                            {selectedIssue === issue && issue.elements && issue.elements.length > 0 && (
                              <div className="mt-3 pt-3 border-t space-y-3">
                                <div className="text-xs font-medium text-muted-foreground">
                                  Affected Elements ({issue.elements.length} shown):
                                </div>
                                {issue.elements.map((element, elemIdx) => (
                                  <div key={elemIdx} className="space-y-2 p-2 rounded bg-muted/50">
                                    <div className="flex items-start gap-2">
                                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                        Selector:
                                      </span>
                                      <code className="text-xs font-mono bg-background px-2 py-0.5 rounded flex-1">
                                        {element.selector}
                                      </code>
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                        HTML:
                                      </span>
                                      <pre className="text-xs font-mono bg-background p-2 rounded overflow-x-auto">
                                        {element.html}
                                      </pre>
                                    </div>
                                    {element.failureSummary && (
                                      <div className="space-y-1">
                                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                          Issue:
                                        </span>
                                        <p className="text-xs text-muted-foreground">
                                          {element.failureSummary}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {issue.helpUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs gap-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(issue.helpUrl, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    Learn More
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
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

      {/* Full Screen Live Preview Modal */}
      <Dialog open={showLivePreview} onOpenChange={setShowLivePreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Live Browser View</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1 truncate max-w-[600px]">
                    {currentPage}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mr-1.5" />
                  Live Scanning
                </Badge>
                {currentPage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(currentPage, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-muted/30">
            {currentScreenshot ? (
              <div className="flex items-center justify-center h-full">
                <img
                  src={`data:image/jpeg;base64,${currentScreenshot}`}
                  alt="Live page screenshot"
                  className="max-w-full h-auto rounded-lg shadow-2xl border-2 border-blue-500/20"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-3">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                  <p>Waiting for screenshot...</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Progress:</span>
                  <span className="font-semibold">{pagesTested} / {pagesDiscovered} pages</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Issues:</span>
                  <span className="font-semibold text-red-600">{issuesFound.critical}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-semibold text-yellow-600">{issuesFound.warning}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-semibold text-blue-600">{issuesFound.minor}</span>
                </div>
              </div>
              <Progress value={progress} className="w-48 h-2" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
