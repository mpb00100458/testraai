import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Send, Loader2, ExternalLink, CheckCircle2, AlertCircle, Download, FileVideo, FileSpreadsheet, FileJson, Trash2, Bot } from "lucide-react";
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
import ReactMarkdown from 'react-markdown';

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
  // Keep previous data while refetching to prevent LiveTestingPanel from unmounting
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/ai-agent/messages', conversationId],
    enabled: !!conversationId,
    placeholderData: (previousData) => previousData, // Keep previous data during refetch
  });

  // Debug: Log messages whenever they change
  useEffect(() => {
    console.log('[AI Agent] Messages updated:', messages.length, 'messages');
    messages.forEach((msg, idx) => {
      console.log(`[AI Agent] Message ${idx}:`, {
        id: msg.id,
        role: msg.role,
        messageType: msg.messageType,
        metadata: msg.metadata,
        contentPreview: msg.content.substring(0, 50)
      });
    });
  }, [messages]);

  // Fetch scan statuses for all messages with scanRunId or estateId to initialize progress state
  useEffect(() => {
    if (!messages || messages.length === 0) {
      console.log('[AI Agent] Skipping scan status fetch - no messages');
      return;
    }

    console.log('[AI Agent] Fetching scan statuses for', messages.length, 'messages');

    const fetchScanStatuses = async () => {
      for (const msg of messages) {
        if (msg.metadata && typeof msg.metadata === 'object') {
          const metadata = msg.metadata as any;
          console.log('[AI Agent] Checking message for scan status:', msg.id, metadata);

          // Handle messages with scanRunId (completion messages and legacy)
          // IMPORTANT: Check scanRunId FIRST because completion messages have BOTH scanRunId and estateId
          if ('scanRunId' in metadata && metadata.scanRunId) {
            const scanRunId = metadata.scanRunId;
            const estateId = metadata.estateId;

            // Always fetch to get the latest status (don't skip if already exists)
            console.log('[AI Agent] Fetching scan status for scanRunId:', scanRunId);

            try {
              const response = await fetch(`/api/scans/${scanRunId}`);
              if (!response.ok) {
                console.error('[AI Agent] Failed to fetch scan:', response.status);
                continue;
              }

              const scan: any = await response.json();
              console.log('[AI Agent] Fetched scan data:', scan);

              setScanProgress(prev => {
                // Clean up temporary optimistic entry if it exists
                const tempKey = estateId ? `estate-${estateId}` : null;
                const newProgress = { ...prev };
                if (tempKey && tempKey in newProgress && tempKey !== scanRunId) {
                  console.log('[AI Agent] Removing temporary optimistic entry:', tempKey);
                  delete newProgress[tempKey];
                }

                return {
                  ...newProgress,
                  [scanRunId]: {
                    scanRunId,
                    estateId: scan.estateId,
                    status: scan.status,
                    pagesDiscovered: scan.pagesAudited || 0,
                    pagesAudited: scan.pagesAudited || 0,
                    issuesFound: scan.totalIssues || 0,
                  }
                };
              });
            } catch (error) {
              console.error('[AI Agent] Error fetching scan status:', error);
            }
          }

          // Handle messages with ONLY estateId (scan trigger messages without scanRunId yet)
          else if ('estateId' in metadata && !metadata.scanRunId) {
            const estateId = metadata.estateId;

            // Check if we already have an optimistic running scan for this estate
            const tempKey = `estate-${estateId}`;
            const hasOptimisticProgress = scanProgress[tempKey]?.status === 'running';

            if (hasOptimisticProgress) {
              console.log('[AI Agent] Skipping fetch for estate', estateId, '- already have optimistic running scan');
              continue; // Don't overwrite optimistic progress
            }

            try {
              // Get the latest scan for this estate using the correct endpoint
              const response = await fetch(`/api/estates/${estateId}/scans`);
              if (!response.ok) continue;

              const scans: any[] = await response.json();

              if (scans.length > 0) {
                // Get the most recent scan (scans are sorted by createdAt desc)
                const scan = scans[0];

                // Add or update scan progress, and clean up temporary optimistic entry
                setScanProgress(prev => {
                  // If we already have this exact scan with the same status, don't update
                  if (prev[scan.id]?.status === scan.status) {
                    console.log('[AI Agent] Scan already tracked with same status:', scan.id);
                    return prev;
                  }

                  console.log('[AI Agent] Updating scan progress from API:', {
                    scanId: scan.id,
                    estateId: scan.estateId,
                    status: scan.status,
                    previousStatus: prev[scan.id]?.status
                  });

                  // Clean up temporary optimistic entry if it exists
                  const tempKey = `estate-${estateId}`;
                  const newProgress = { ...prev };
                  if (tempKey in newProgress && tempKey !== scan.id) {
                    console.log('[AI Agent] Removing temporary optimistic entry:', tempKey);
                    delete newProgress[tempKey];
                  }

                  return {
                    ...newProgress,
                    [scan.id]: {
                      scanRunId: scan.id,
                      estateId: scan.estateId,
                      status: scan.status,
                      pagesDiscovered: scan.pagesAudited || 0,
                      pagesAudited: scan.pagesAudited || 0,
                      issuesFound: scan.totalIssues || 0,
                    }
                  };
                });
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
      const response = await apiRequest('POST', '/api/ai-agent/chat', {
        conversationId,
        message: content
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('[AI Agent] API response received:', data);

      // If the response includes an estateId, subscribe to it immediately
      if (data.estateId && wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[AI Agent] Subscribing to estate from API response:', data.estateId);
        wsRef.current.send(JSON.stringify({ type: 'subscribe', estateId: data.estateId }));

        // OPTIMISTIC: Initialize scan progress immediately to show LiveTestingPanel
        // This ensures the panel shows even if the scan completes before messages are fetched
        // Use a temporary key format: `estate-${estateId}` until we get the real scanRunId from WebSocket
        const tempKey = `estate-${data.estateId}`;
        console.log('[AI Agent] Initializing optimistic scan progress with temp key:', tempKey);
        setScanProgress(prev => ({
          ...prev,
          [tempKey]: {
            scanRunId: tempKey, // Temporary ID
            estateId: data.estateId,
            status: 'running',
            pagesDiscovered: 0,
            pagesAudited: 0,
            issuesFound: 0,
          }
        }));
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
        console.log('[AI Agent] WebSocket message received:', data);

        // Handle scan events
        if (data.type === 'scan_start' || data.type === 'page_discovered' || data.type === 'page_testing' || data.type === 'page_complete' || data.type === 'scan_complete' || data.type === 'scan_error') {
          const scanRunId = data.data?.scanRunId;
          const estateId = data.estateId;
          const eventType = data.type;

          console.log('[AI Agent] Processing scan event:', {
            eventType,
            scanRunId,
            estateId,
            data: data.data
          });

          // Guard: Only process if we have a valid scanRunId
          if (!scanRunId) {
            console.error('[AI Agent] Received scan event without scanRunId, ignoring:', data);
            return;
          }

          setScanProgress(prev => {
            // For scan_complete, use totalPages for both discovered and audited
            // For page_complete, use pageNumber for audited and totalPages for discovered
            const pagesAudited = eventType === 'scan_complete'
              ? (data.data?.totalPages || prev[scanRunId]?.pagesAudited || 0)
              : (data.data?.pageNumber || prev[scanRunId]?.pagesAudited || 0);

            // Clean up temporary optimistic entry if it exists
            const tempKey = `estate-${estateId}`;
            const newProgress = { ...prev };
            if (tempKey in newProgress && tempKey !== scanRunId) {
              console.log('[AI Agent] Removing temporary scan progress entry:', tempKey);
              delete newProgress[tempKey];
            }

            return {
              ...newProgress,
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
            console.log('[AI Agent] Scan complete - invalidating messages query for conversation:', conversationId);
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
    if (!messages || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('[AI Agent] Skipping estate subscription:', {
        hasMessages: !!messages,
        hasWs: !!wsRef.current,
        wsState: wsRef.current?.readyState,
      });
      return;
    }

    // Find ALL messages with scan metadata and subscribe to their estates
    const estateIds = new Set<string>();

    for (const msg of messages) {
      if (msg.metadata && typeof msg.metadata === 'object' && 'estateId' in msg.metadata) {
        const estateId = (msg.metadata as any).estateId;
        estateIds.add(estateId);
      }
    }

    console.log('[AI Agent] Found estates to subscribe to:', Array.from(estateIds));

    // Subscribe to all estates
    estateIds.forEach(estateId => {
      console.log('[AI Agent] Subscribing to estate:', estateId);
      wsRef.current?.send(JSON.stringify({ type: 'subscribe', estateId }));
    });
  }, [messages]);

  // Poll for message updates when there are active scans
  // This handles the race condition where scan completes before WebSocket subscription
  useEffect(() => {
    if (!conversationId) return;

    // Check if there are any active scans (running status in scanProgress)
    const hasActiveScans = Object.values(scanProgress).some(
      progress => progress.status === 'running'
    );

    if (!hasActiveScans) {
      console.log('[AI Agent] No active scans, skipping polling. Current scan progress:', scanProgress);
      return;
    }

    console.log('[AI Agent] Active scans detected, starting polling for message updates. Scan progress:', scanProgress);

    // Poll every 2 seconds while scans are active
    const pollInterval = setInterval(() => {
      console.log('[AI Agent] Polling for message updates... Current scan progress:', scanProgress);
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agent/messages', conversationId] });
    }, 2000);

    return () => {
      console.log('[AI Agent] Stopping message polling. Final scan progress:', scanProgress);
      clearInterval(pollInterval);
    };
  }, [conversationId, scanProgress, queryClient]);

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

  console.log('[AI Agent] Rendering with messages:', messages?.length || 0);
  console.log('[AI Agent] Conversation ID:', conversationId);
  console.log('[AI Agent] Current scanProgress state:', scanProgress);

  // Find the most recent active scan across all messages
  const mostRecentActiveScan = (() => {
    // First, try to find any message with estateId (most recent first)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.metadata && typeof msg.metadata === 'object' && ('scanRunId' in msg.metadata || 'estateId' in msg.metadata)) {
        const metadata = msg.metadata as any;
        console.log('[AI Agent] Checking message metadata:', metadata);

        const progress = metadata.scanRunId ? scanProgress[metadata.scanRunId] :
                        metadata.estateId ? Object.values(scanProgress).find(p => p.estateId === metadata.estateId) :
                        undefined;

        console.log('[AI Agent] Found progress for message:', progress);

        // Show if: running, just started (has estateId but no scanRunId and no progress), or actively running
        const isActive =
          progress?.status === 'running' ||
          (metadata.estateId && !metadata.scanRunId && !progress) ||  // Show panel for scan trigger messages only
          (progress && progress.pagesDiscovered > 0 && progress.status !== 'failed' && progress.status !== 'completed');

        console.log('[AI Agent] Is active?', isActive, 'for metadata:', metadata);

        if (isActive) {
          const estateId = metadata.estateId || progress?.estateId;
          const scanRunId = metadata.scanRunId || progress?.scanRunId;
          console.log('[AI Agent] Returning active scan:', { estateId, scanRunId, progress });
          return { estateId, scanRunId, progress };
        }
      }
    }

    // Fallback: Only show scanProgress if there's an actively running scan
    const progressEntries = Object.entries(scanProgress);
    const runningScan = progressEntries.find(([_, progress]) => progress.status === 'running');
    if (runningScan) {
      console.log('[AI Agent] No active scan from messages, using running scan from scanProgress');
      const [scanRunId, progress] = runningScan;
      return {
        estateId: progress.estateId,
        scanRunId: progress.scanRunId,
        progress
      };
    }

    console.log('[AI Agent] No active scans found');
    return null;
  })();

  console.log('[AI Agent] Most recent active scan:', mostRecentActiveScan);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Clear Chat Button - Top Right */}
      {messages.length > 0 && (
        <div className="absolute top-4 right-6 z-10">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
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
                  className="bg-red-600 hover:bg-red-700"
                >
                  Clear Messages
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Global Live Testing Panel - Show for most recent active scan */}
      {mostRecentActiveScan && mostRecentActiveScan.estateId && (
        <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <LiveTestingPanel
              key={mostRecentActiveScan.estateId}
              estateId={mostRecentActiveScan.estateId}
              estateName={`Scan ${mostRecentActiveScan.scanRunId?.slice(0, 8) || 'in progress'}...`}
              websocket={wsRef.current}
            />
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-xl">
                  <Bot className="h-12 w-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  Helena Cruz
                </h2>
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  What do you want to test today?
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  I can help you scan websites for WCAG compliance, analyze accessibility issues, and provide expert guidance.
                </p>
              </div>
              <div className="grid gap-3 max-w-2xl w-full mx-auto mt-8">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-4 px-6 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-300 transition-all"
                  onClick={() => setMessage("Scan https://example.com for accessibility issues")}
                  data-testid="button-example-scan"
                >
                  <CheckCircle2 className="h-5 w-5 mr-3 shrink-0 text-blue-600" />
                  <div>
                    <div className="font-semibold">Scan a website for WCAG compliance</div>
                    <div className="text-xs text-muted-foreground mt-1">Run automated accessibility audit</div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-4 px-6 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:border-blue-300 transition-all"
                  onClick={() => setMessage("What accessibility issues should I prioritize?")}
                  data-testid="button-example-prioritize"
                >
                  <AlertCircle className="h-5 w-5 mr-3 shrink-0 text-blue-600" />
                  <div>
                    <div className="font-semibold">Get help prioritizing fixes</div>
                    <div className="text-sm text-muted-foreground">Learn what to fix first</div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl shadow-md ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white px-6 py-4'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-5'
                  }`}
                  data-testid={`message-${msg.role}-${msg.id}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Helena Cruz</span>
                    </div>
                  )}
                  <div className={`leading-relaxed ${msg.role === 'user' ? 'text-[15px]' : 'text-[15px] text-foreground'}`}>
                    {typeof msg.content === 'string' ? (
                      msg.role === 'assistant' ? (
                        <ReactMarkdown
                          components={{
                            a: ({ ...props }) => (
                              <a
                                {...props}
                                className="text-blue-600 hover:underline font-medium"
                                target={props.href?.startsWith('http') ? '_blank' : undefined}
                                rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                              />
                            ),
                            p: ({ ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                            strong: ({ ...props }) => <strong {...props} className="font-semibold" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )
                    ) : (
                      JSON.stringify(msg.content)
                    )}
                  </div>
                  
                  {/* Show scan progress and results */}
                  {msg.metadata && typeof msg.metadata === 'object' && ('scanRunId' in msg.metadata || 'estateId' in msg.metadata) && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                      {(() => {
                        const metadata = msg.metadata as any;
                        
                        // Find the scan: either by scanRunId (legacy) or by estateId (new approach)
                        let progress: ScanProgress | undefined;
                        let scanRunId: string | undefined;

                        // ALWAYS prioritize metadata.scanRunId if it exists (completion messages have this)
                        if (metadata.scanRunId) {
                          scanRunId = metadata.scanRunId;
                          progress = scanProgress[metadata.scanRunId];
                        } else if (metadata.estateId) {
                          // For messages with only estateId (trigger messages), find the scan
                          const estateScans = Object.values(scanProgress).filter(s => s.estateId === metadata.estateId);
                          // First try to find a running scan
                          const runningScan = estateScans.find(s => s.status === 'running' || (s.pagesDiscovered > 0 && s.status !== 'completed' && s.status !== 'failed'));
                          // If no running scan, use the most recent one (last in array)
                          const estateScan = runningScan || estateScans[estateScans.length - 1];
                          progress = estateScan;
                          scanRunId = estateScan?.scanRunId;
                        }
                        
                        // Consider a scan "running" if:
                        // 1. Progress status is explicitly 'running', OR
                        // 2. We have metadata.estateId but no progress yet AND no scanRunId (scan just started - not a completion message)
                        // 3. We have progress with pages being discovered/tested (not failed or completed)
                        const isRunning =
                          progress?.status === 'running' ||
                          (metadata.estateId && !metadata.scanRunId && !progress) ||
                          (progress && progress.pagesDiscovered > 0 && progress.status !== 'failed' && progress.status !== 'completed');
                        const isCompleted = progress?.status === 'completed';
                        const isFailed = progress?.status === 'failed';

                        console.log('[AI Agent] Message scan check:', {
                          messageId: msg.id,
                          messageType: msg.messageType,
                          hasMetadata: !!msg.metadata,
                          metadata,
                          scanRunIdFromMetadata: metadata.scanRunId,
                          allScanProgress: scanProgress,
                          allScanProgressKeys: Object.keys(scanProgress),
                          foundProgress: progress,
                          foundScanRunId: scanRunId,
                          progressStatus: progress?.status,
                          progressPagesDiscovered: progress?.pagesDiscovered,
                          isRunning,
                          isCompleted,
                          isFailed,
                          isRunningBreakdown: {
                            statusIsRunning: progress?.status === 'running',
                            hasEstateIdNoScanRunIdNoProgress: metadata.estateId && !metadata.scanRunId && !progress,
                            hasPagesAndNotCompleteOrFailed: progress && progress.pagesDiscovered > 0 && progress.status !== 'completed' && progress.status !== 'failed',
                          },
                        });

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

                            {/* LiveTestingPanel is now shown globally at the top - removed from here */}

                            {/* Completed or Previous Scan Results - Show View Results and Downloads */}
                            {(() => {
                              // Use scanRunId from metadata first (completion messages always have this)
                              const finalScanRunId = metadata.scanRunId || scanRunId;
                              const finalEstateId = metadata.estateId || progress?.estateId;

                              // Show results if:
                              // 1. Message has scanRunId in metadata (completion message - always show), OR
                              // 2. Scan is completed (has progress with completed status)
                              // Note: We prioritize metadata.scanRunId because completion messages always have it,
                              // even if the WebSocket events were missed and we don't have progress state
                              const shouldShowResults = !!finalScanRunId && (!!metadata.scanRunId || isCompleted);

                              console.log('[AI Agent] Results section check:', {
                                messageId: msg.id,
                                messageType: msg.messageType,
                                metadata,
                                progress,
                                isCompleted,
                                hasScanRunIdInMetadata: !!metadata.scanRunId,
                                finalScanRunId,
                                finalEstateId,
                                shouldShowResults
                              });

                              if (!shouldShowResults) return null;

                              return (
                                <div className="space-y-2">
                                  <Link
                                    href={`/scans/${finalScanRunId}`}
                                    className="inline-flex items-center gap-2 text-sm hover-elevate active-elevate-2 px-3 py-2 rounded-md bg-background/20"
                                    data-testid={`link-scan-${finalScanRunId}`}
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
                                        if (finalEstateId && finalScanRunId) {
                                          window.open(`/api/estates/${finalEstateId}/report/excel?scanRunId=${finalScanRunId}`, '_blank');
                                        }
                                      }}
                                      className="gap-2"
                                      data-testid={`button-download-excel-${finalScanRunId}`}
                                    >
                                      <FileSpreadsheet className="h-3 w-3" />
                                      Excel
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`/api/scans/${finalScanRunId}/export/json`, '_blank')}
                                      className="gap-2"
                                      data-testid={`button-download-json-${finalScanRunId}`}
                                    >
                                      <FileJson className="h-3 w-3" />
                                      JSON
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    View full results for video and trace downloads
                                  </p>
                                </div>
                              );
                            })()}

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
      <div className="border-t bg-white dark:bg-gray-900 shadow-2xl p-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Write a step or an objective to quickly author a test case"
              className="min-h-[120px] max-h-[300px] text-base leading-relaxed resize-none border-2 border-gray-200 dark:border-gray-700 rounded-2xl pr-16 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 transition-all shadow-sm"
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="icon"
              className="absolute bottom-3 right-3 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg transition-all"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
              <kbd className="text-xs font-semibold">Enter</kbd> to send
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800">
              <kbd className="text-xs font-semibold">Shift</kbd>+<kbd className="text-xs font-semibold">Enter</kbd> for new line
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
