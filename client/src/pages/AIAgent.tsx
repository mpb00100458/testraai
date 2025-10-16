import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Send, Loader2, ExternalLink, CheckCircle2, AlertCircle, Download, FileVideo, FileSpreadsheet, FileJson } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import type { ChatMessage, ChatConversation } from "@shared/schema";

interface ScanProgress {
  scanRunId: string;
  status: 'running' | 'completed' | 'failed';
  pagesDiscovered: number;
  pagesAudited: number;
  currentPage?: string;
  issuesFound: number;
}

export default function AIAgent() {
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

  // Fetch scan statuses for all messages with scanRunId to initialize progress state
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const fetchScanStatuses = async () => {
      for (const msg of messages) {
        if (msg.metadata && typeof msg.metadata === 'object' && 'scanRunId' in msg.metadata) {
          const scanRunId = (msg.metadata as any).scanRunId;
          
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

  // WebSocket connection for real-time scan updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[AI Agent] WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[AI Agent] WebSocket message:', data);
        
        // Handle scan events
        if (data.type === 'scan_start' || data.type === 'page_complete' || data.type === 'scan_complete' || data.type === 'scan_error') {
          const scanRunId = data.data?.scanRunId;
          
          setScanProgress(prev => ({
            ...prev,
            [scanRunId]: {
              scanRunId,
              status: data.type === 'scan_complete' ? 'completed' : data.type === 'scan_error' ? 'failed' : 'running',
              pagesDiscovered: data.data?.totalPages || prev[scanRunId]?.pagesDiscovered || 0,
              pagesAudited: data.data?.pageNumber || prev[scanRunId]?.pagesAudited || 0,
              currentPage: data.data?.url || prev[scanRunId]?.currentPage,
              issuesFound: data.data?.totalIssues || prev[scanRunId]?.issuesFound || 0,
            }
          }));

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

  // Subscribe to latest estate with scan metadata
  useEffect(() => {
    if (!messages || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Find the most recent message with scan metadata
    const latestScanMessage = [...messages]
      .reverse()
      .find(msg => msg.metadata && typeof msg.metadata === 'object' && 'estateId' in msg.metadata);

    if (latestScanMessage) {
      const estateId = (latestScanMessage.metadata as any).estateId;
      console.log('[AI Agent] Subscribing to latest estate:', estateId);
      wsRef.current?.send(JSON.stringify({ type: 'subscribe', estateId }));
    }
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">AI Accessibility Agent</h1>
              <p className="text-sm text-muted-foreground">
                Ask me to scan URLs and analyze accessibility
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Powered by GPT-5</span>
          </Badge>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/10 to-purple-600/10 mx-auto">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Welcome to AI Agent</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  I can help you scan websites for accessibility issues. Just tell me what you need!
                </p>
              </div>
              <div className="grid gap-2 max-w-md mx-auto mt-6">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3"
                  onClick={() => setMessage("Scan https://example.com for accessibility issues")}
                  data-testid="button-example-scan"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                  Scan a website for WCAG compliance
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3"
                  onClick={() => setMessage("What accessibility issues should I prioritize?")}
                  data-testid="button-example-prioritize"
                >
                  <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                  Get help prioritizing fixes
                </Button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                      : 'bg-muted'
                  }`}
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">AI Agent</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  
                  {/* Show scan progress and results */}
                  {msg.metadata && typeof msg.metadata === 'object' && 'scanRunId' in msg.metadata && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                      {(() => {
                        const metadata = msg.metadata as any;
                        const progress = scanProgress[metadata.scanRunId];
                        const isRunning = progress?.status === 'running';
                        const isCompleted = !progress || progress?.status === 'completed';
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

                            {/* Completed - Show View Results and Downloads */}
                            {isCompleted && (
                              <div className="space-y-2">
                                <Link
                                  href={`/scans/${metadata.scanRunId}`}
                                  className="inline-flex items-center gap-2 text-sm hover-elevate active-elevate-2 px-3 py-2 rounded-md bg-background/20"
                                  data-testid={`link-scan-${metadata.scanRunId}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View Full Scan Results
                                </Link>

                                {/* Download buttons */}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/api/scans/${metadata.scanRunId}/download/video`, '_blank')}
                                    className="gap-2"
                                    data-testid={`button-download-video-${metadata.scanRunId}`}
                                  >
                                    <FileVideo className="h-3 w-3" />
                                    Video
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/api/scans/${metadata.scanRunId}/export/excel`, '_blank')}
                                    className="gap-2"
                                    data-testid={`button-download-excel-${metadata.scanRunId}`}
                                  >
                                    <FileSpreadsheet className="h-3 w-3" />
                                    Excel
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`/api/scans/${metadata.scanRunId}/export/json`, '_blank')}
                                    className="gap-2"
                                    data-testid={`button-download-json-${metadata.scanRunId}`}
                                  >
                                    <FileJson className="h-3 w-3" />
                                    JSON
                                  </Button>
                                </div>
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
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-card/50 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me to scan a URL or analyze accessibility issues..."
              className="min-h-[60px] max-h-[200px]"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
