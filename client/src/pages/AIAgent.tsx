import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Send, Loader2, ExternalLink, CheckCircle2, AlertCircle, Download, FileVideo, FileSpreadsheet, FileJson, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { ChatMessage, ChatConversation } from "@shared/schema";
import { LiveTestingPanel } from "@/components/LiveTestingPanel";

interface ScanProgress {
  scanRunId: string;
  estateId: string;
  status: 'running' | 'completed' | 'failed';
  pagesDiscovered: number;
  pagesAudited: number;
  currentPage?: string;
  issuesFound: number;
}

export default function AIAgent() {
  console.log('[AI Agent] Component rendering');
  
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<Record<string, ScanProgress>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Get or create conversation
  const { data: conversation } = useQuery<ChatConversation>({
    queryKey: ['/api/ai-agent/conversation'],
    enabled: true,
  });

  useEffect(() => {
    if (conversation) {
      setConversationId(conversation.id);
    }
  }, [conversation]);

  // Get messages for current conversation
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/ai-agent/messages', conversationId],
    enabled: !!conversationId,
  });

  // Fetch scan statuses for all messages with scanRunId or estateId to initialize progress state
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const fetchScanStatuses = async () => {
      for (const msg of messages) {
        if (msg.metadata && typeof msg.metadata === 'object') {
          const metadata = msg.metadata as any;
          
          // Handle messages with scanRunId (legacy)
          if ('scanRunId' in metadata) {
            const scanRunId = metadata.scanRunId;
            
            // Skip if we already have status for this scan
            if (scanProgress[scanRunId]) continue;

            try {
              const response = await fetch(`/api/scans/${scanRunId}`);
              if (!response.ok) continue;
              
              const scan: any = await response.json();
              setScanProgress(prev => ({
                ...prev,
                [scanRunId]: {
                  scanRunId,
                  estateId: scan.estateId,
                  status: scan.status,
                  pagesDiscovered: scan.pagesAudited || 0,
                  pagesAudited: scan.pagesAudited || 0,
                  issuesFound: scan.totalIssues || 0,
                }
              }));
            } catch (error) {
              console.error('Error fetching scan status:', error);
            }
          }
          
          // Handle messages with estateId (new approach)
          else if ('estateId' in metadata) {
            const estateId = metadata.estateId;
            
            // Skip if we already have a scan for this estate
            if (Object.values(scanProgress).some(s => s.estateId === estateId)) continue;

            try {
              // Get the latest scan for this estate
              const response = await fetch(`/api/scans?estateId=${estateId}&limit=1`);
              if (!response.ok) continue;
              
              const scans: any[] = await response.json();
              if (scans.length > 0) {
                const scan = scans[0];
                setScanProgress(prev => ({
                  ...prev,
                  [scan.id]: {
                    scanRunId: scan.id,
                    estateId: scan.estateId,
                    status: scan.status,
                    pagesDiscovered: scan.pagesAudited || 0,
                    pagesAudited: scan.pagesAudited || 0,
                    issuesFound: scan.totalIssues || 0,
                  }
                }));
              }
            } catch (error) {
              console.error('Error fetching scan for estate:', error);
            }
          }
        }
      }
    };

    fetchScanStatuses();
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest('POST', '/api/ai-agent/chat', { 
        conversationId,
        message: content 
      });
    },
    onSuccess: (data: any) => {
      // If the response includes an estateId, subscribe to it immediately
      if (data.estateId && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[AI Agent] Subscribing to estate from API response:', data.estateId);
        wsRef.current.send(JSON.stringify({ type: 'subscribe', estateId: data.estateId }));
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agent/messages', conversationId] });
      setMessage("");
    },
  });

  // Clear messages mutation
  const clearMessagesMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) return;
      return await apiRequest('DELETE', `/api/ai-agent/conversations/${conversationId}/messages`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agent/messages', conversationId] });
      setScanProgress({});
    },
  });

  // WebSocket connection for real-time scan updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('[AI Agent] Creating WebSocket connection to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[AI Agent] WebSocket connected successfully!');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[AI Agent] WebSocket message:', data);
        
        // Handle scan events
        if (data.type === 'scan_start' || data.type === 'page_complete' || data.type === 'scan_complete' || data.type === 'scan_error') {
          const scanRunId = data.data?.scanRunId;
          const estateId = data.estateId;
          const eventType = data.type;
          
          setScanProgress(prev => {
            // For scan_complete, use totalPages for both discovered and audited
            // For page_complete, use pageNumber for audited and totalPages for discovered
            const pagesAudited = eventType === 'scan_complete' 
              ? (data.data?.totalPages || prev[scanRunId]?.pagesAudited || 0)
              : (data.data?.pageNumber || prev[scanRunId]?.pagesAudited || 0);
            
            return {
              ...prev,
              [scanRunId]: {
                scanRunId,
                estateId,
                status: eventType === 'scan_complete' ? 'completed' : eventType === 'scan_error' ? 'failed' : 'running',
                pagesDiscovered: data.data?.totalPages || prev[scanRunId]?.pagesDiscovered || 0,
                pagesAudited,
                currentPage: data.data?.url || prev[scanRunId]?.currentPage,
                issuesFound: data.data?.totalIssues || prev[scanRunId]?.issuesFound || 0,
              }
            };
          });

          // Refresh messages when scan completes
          if (data.type === 'scan_complete') {
            queryClient.invalidateQueries({ queryKey: ['/api/ai-agent/messages', conversationId] });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[AI Agent] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[AI Agent] WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, [conversationId]);

  // Subscribe to ALL estates with scan metadata (not just latest)
  useEffect(() => {
    if (!messages || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Find ALL messages with scan metadata and subscribe to their estates
    const estateIds = new Set<string>();
    
    for (const msg of messages) {
      if (msg.metadata && typeof msg.metadata === 'object' && 'estateId' in msg.metadata) {
        const estateId = (msg.metadata as any).estateId;
        estateIds.add(estateId);
      }
    }

    // Subscribe to all estates
    estateIds.forEach(estateId => {
      console.log('[AI Agent] Subscribing to estate:', estateId);
      wsRef.current?.send(JSON.stringify({ type: 'subscribe', estateId }));
    });
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, scanProgress]);

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col font-sans">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg shadow-primary/25">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                AI Accessibility Agent
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Powered by GPT-4o-mini • Ask me to scan URLs and analyze accessibility
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-2"
                    data-testid="button-clear-messages"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Chat
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all messages?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all messages in this conversation. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => clearMessagesMutation.mutate()}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600"
                    >
                      Clear Messages
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-background to-muted/20" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Live Testing Panels for Active Scans */}
          {Object.values(scanProgress)
            .filter(scan => scan.status === 'running')
            .map(scan => (
              <LiveTestingPanel
                key={scan.estateId}
                estateId={scan.estateId}
                estateName={`Scan ${scan.scanRunId.slice(0, 8)}...`}
              />
            ))
          }
          
          {messages.length === 0 ? (
            <div className="text-center py-16 space-y-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/10 to-indigo-600/10 mx-auto">
                <Sparkles className="h-10 w-10 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold tracking-tight">Welcome to AI Accessibility Agent</h3>
                <p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  I can help you scan websites for WCAG compliance, analyze accessibility issues, and provide expert guidance. Just ask me anything!
                </p>
              </div>
              <div className="grid gap-3 max-w-lg mx-auto mt-8">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-4 px-4 hover-elevate active-elevate-2"
                  onClick={() => setMessage("Scan https://example.com for accessibility issues")}
                  data-testid="button-example-scan"
                >
                  <CheckCircle2 className="h-5 w-5 mr-3 shrink-0 text-primary" />
                  <div>
                    <div className="font-medium">Scan a website for WCAG compliance</div>
                    <div className="text-xs text-muted-foreground mt-1">Run automated accessibility audit</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-4 px-4 hover-elevate active-elevate-2"
                  onClick={() => setMessage("What accessibility issues should I prioritize?")}
                  data-testid="button-example-prioritize"
                >
                  <AlertCircle className="h-5 w-5 mr-3 shrink-0 text-primary" />
                  <div>
                    <div className="font-medium">Get help prioritizing fixes</div>
                    <div className="text-xs text-muted-foreground mt-1">Learn what to fix first</div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[85%] rounded-xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white px-5 py-3.5'
                      : 'bg-white border border-border px-5 py-4'
                  }`}
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-indigo-600">
                        <Sparkles className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI Agent</span>
                    </div>
                  )}
                  <div className={`leading-relaxed ${msg.role === 'user' ? 'text-[15px]' : 'text-[15px] text-foreground'}`}>
                    {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                  </div>
                  
                  {/* Show scan progress and results */}
                  {msg.metadata && typeof msg.metadata === 'object' && ('scanRunId' in msg.metadata || 'estateId' in msg.metadata) && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                      {(() => {
                        const metadata = msg.metadata as any;
                        
                        // Find the scan: either by scanRunId (legacy) or by estateId (new approach)
                        let progress: ScanProgress | undefined;
                        let scanRunId: string | undefined;
                        
                        if (metadata.scanRunId) {
                          // Legacy: metadata has scanRunId
                          progress = scanProgress[metadata.scanRunId];
                          scanRunId = metadata.scanRunId;
                        } else if (metadata.estateId) {
                          // New: find the most recent scan for this estate
                          const estateScan = Object.values(scanProgress).find(s => s.estateId === metadata.estateId);
                          progress = estateScan;
                          scanRunId = estateScan?.scanRunId;
                        }
                        
                        const isRunning = progress?.status === 'running';
                        const isCompleted = progress?.status === 'completed';
                        const isFailed = progress?.status === 'failed';

                        return (
                          <>
                            {/* Live Progress */}
                            {isRunning && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {progress ? (
                                      <>Scanning... {progress.pagesAudited} / {progress.pagesDiscovered} pages</>
                                    ) : (
                                      <>Initializing scan...</>
                                    )}
                                  </span>
                                  <Badge variant="secondary" className="gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    In Progress
                                  </Badge>
                                </div>
                                {progress && progress.pagesDiscovered > 0 && (
                                  <Progress 
                                    value={(progress.pagesAudited / progress.pagesDiscovered) * 100} 
                                    className="h-2"
                                  />
                                )}
                                {progress?.currentPage && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    Current: {progress.currentPage}
                                  </p>
                                )}
                                {progress && progress.issuesFound > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {progress.issuesFound} issues found so far
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Completed or Previous Scan Results - Show View Results and Downloads */}
                            {(isCompleted || metadata.scanRunId) && (scanRunId || metadata.scanRunId) && (
                              <div className="space-y-2">
                                <Link
                                  href={`/scans/${scanRunId || metadata.scanRunId}`}
                                  className="inline-flex items-center gap-2 text-sm hover-elevate active-elevate-2 px-3 py-2 rounded-md bg-background/20"
                                  data-testid={`link-scan-${scanRunId || metadata.scanRunId}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View Full Scan Results
                                </Link>

                                {/* Download buttons */}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const estateId = progress?.estateId || metadata.estateId;
                                      const scanId = scanRunId || metadata.scanRunId;
                                      if (estateId && scanId) {
                                        window.open(`/api/estates/${estateId}/report/excel?scanRunId=${scanId}`, '_blank');
                                      }
                                    }}
                                    className="gap-2"
                                    data-testid={`button-download-excel-${scanRunId || metadata.scanRunId}`}
                                  >
                                    <FileSpreadsheet className="h-3 w-3" />
                                    Excel
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/api/scans/${scanRunId || metadata.scanRunId}/export/json`, '_blank')}
                                    className="gap-2"
                                    data-testid={`button-download-json-${scanRunId || metadata.scanRunId}`}
                                  >
                                    <FileJson className="h-3 w-3" />
                                    JSON
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                  View full results for video and trace downloads
                                </p>
                              </div>
                            )}

                            {/* Failed */}
                            {isFailed && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Scan Failed
                              </Badge>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {sendMessageMutation.isPending && (
            <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-[85%] rounded-xl shadow-sm bg-white border border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-indigo-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">AI is analyzing your request...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white shadow-lg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me to scan a URL, get WCAG guidance, or analyze accessibility..."
              className="min-h-[80px] max-h-[200px] text-[15px] leading-relaxed resize-none border-2 focus:border-primary"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="icon"
              className="h-[80px] w-[80px] shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-primary/25"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Send className="h-6 w-6" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted">
              <kbd className="text-[10px] font-mono">Enter</kbd> to send
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted">
              <kbd className="text-[10px] font-mono">Shift</kbd>+<kbd className="text-[10px] font-mono">Enter</kbd> for new line
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
