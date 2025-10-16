import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { VisualIssueViewer } from "@/components/VisualIssueViewer";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Download, AlertCircle, CheckSquare, UserPlus, Tag, MessageSquare, Sparkles, Filter, Group } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GradientButton } from "@/components/GradientButton";
import type { A11yResult, Page, User, IssueComment } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Issues() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>();
  const [issueDetailOpen, setIssueDetailOpen] = useState(false);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: issues, isLoading } = useQuery<A11yResult[]>({
    queryKey: ["/api/issues"],
    enabled: isAuthenticated,
  });

  const { data: pages } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
    enabled: isAuthenticated,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const { data: comments } = useQuery<IssueComment[]>({
    queryKey: ["/api/issues/comments", selectedIssueId],
    enabled: isAuthenticated && !!selectedIssueId,
  });

  // Update issue status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ issueIds, status }: { issueIds: string[]; status: string }) => {
      await apiRequest("PATCH", "/api/issues/bulk-status", { issueIds, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setSelectedIssues(new Set());
      toast({ title: "Success", description: "Issues updated successfully" });
    },
  });

  // Assign issues
  const assignMutation = useMutation({
    mutationFn: async ({ issueIds, userId }: { issueIds: string[]; userId: string }) => {
      await apiRequest("PATCH", "/api/issues/bulk-assign", { issueIds, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      setSelectedIssues(new Set());
      toast({ title: "Success", description: "Issues assigned successfully" });
    },
  });

  // Generate AI suggestion
  const aiSuggestionMutation = useMutation({
    mutationFn: async (issueId: string) => {
      return await apiRequest("POST", `/api/issues/${issueId}/ai-suggestion`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues"] });
      toast({ title: "Success", description: "AI suggestion generated" });
    },
  });

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async ({ issueId, comment }: { issueId: string; comment: string }) => {
      await apiRequest("POST", "/api/issues/comments", { issueId, userId: user?.id, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/issues/comments", selectedIssueId] });
      setNewComment("");
      toast({ title: "Success", description: "Comment added" });
    },
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const filteredIssues = issues?.filter(issue => {
    const matchesSearch = searchTerm === "" || 
      issue.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || issue.status === statusFilter;
    const matchesAssignee = assigneeFilter === "all" || 
      (assigneeFilter === "unassigned" && !issue.assignedTo) ||
      issue.assignedTo === assigneeFilter;
    return matchesSearch && matchesSeverity && matchesStatus && matchesAssignee;
  }) || [];

  // Group issues
  const groupedIssues = groupBy === "none" 
    ? { "All Issues": filteredIssues }
    : filteredIssues.reduce((acc, issue) => {
        let key = "";
        if (groupBy === "page") {
          const page = pages?.find(p => p.id === issue.pageId);
          key = page?.title || page?.url || "Unknown Page";
        } else if (groupBy === "type") {
          key = issue.issueType;
        } else if (groupBy === "wcag") {
          key = issue.wcagCriteria || "No WCAG";
        } else if (groupBy === "status") {
          key = issue.status?.toUpperCase() || "NEW";
        }
        if (!acc[key]) acc[key] = [];
        acc[key].push(issue);
        return acc;
      }, {} as Record<string, A11yResult[]>);

  const selectedIssue = filteredIssues.find(i => i.id === selectedIssueId);
  const selectedPage = selectedIssue && pages?.find(p => p.id === selectedIssue.pageId);
  const issuesForVisualViewer = selectedPage 
    ? filteredIssues
        .filter(i => i.pageId === selectedPage.id)
        .map(i => ({
          ...i,
          elementPosition: i.elementPosition || undefined,
          description: i.description || "",
        }))
    : [];

  const toggleIssueSelection = (issueId: string) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueId)) {
      newSelected.delete(issueId);
    } else {
      newSelected.add(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const toggleAllIssues = () => {
    if (selectedIssues.size === filteredIssues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(filteredIssues.map(i => i.id)));
    }
  };

  const getStatusBadge = (status?: string) => {
    const variant = 
      status === "resolved" ? "default" :
      status === "in_progress" ? "secondary" :
      status === "ignored" ? "outline" : "destructive";
    const label = status === "in_progress" ? "In Progress" : status?.toUpperCase() || "NEW";
    return <Badge variant={variant} className="capitalize">{label}</Badge>;
  };

  const assignedUser = (userId?: string) => {
    return users?.find(u => u.id === userId);
  };

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Issues</h1>
        <p className="text-lg text-muted-foreground">Manage and track accessibility violations</p>
      </div>

      {selectedPage && (
        <VisualIssueViewer
          screenshotUrl={selectedPage.screenshotUrl || undefined}
          issues={issuesForVisualViewer}
          selectedIssueId={selectedIssueId}
          onIssueClick={setSelectedIssueId}
        />
      )}

      {/* Bulk Actions Bar */}
      {selectedIssues.size > 0 && (
        <Card className="bg-primary/10 border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedIssues.size} issue(s) selected</span>
              <div className="flex gap-2">
                <Select onValueChange={(status) => updateStatusMutation.mutate({ issueIds: Array.from(selectedIssues), status })}>
                  <SelectTrigger className="w-40" data-testid="select-bulk-status">
                    <Tag className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="ignored">Ignored</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(userId) => assignMutation.mutate({ issueIds: Array.from(selectedIssues), userId })}>
                  <SelectTrigger className="w-40" data-testid="select-bulk-assign">
                    <UserPlus className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Assign To" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedIssues(new Set())}
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Issues</CardTitle>
              <CardDescription>Filter, search, and manage accessibility violations</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                data-testid="button-export-csv"
                onClick={() => window.location.href = '/api/reports/csv'}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-issues"
              />
            </div>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger data-testid="select-severity-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <Tag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="ignored">Ignored</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger data-testid="select-assignee-filter">
                <UserPlus className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Group By */}
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-group-by">
              <Group className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="page">By Page</SelectItem>
              <SelectItem value="type">By Issue Type</SelectItem>
              <SelectItem value="wcag">By WCAG Criterion</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
            </SelectContent>
          </Select>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : Object.keys(groupedIssues).length > 0 && filteredIssues.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedIssues).map(([groupName, groupIssues]) => (
                <div key={groupName}>
                  {groupBy !== "none" && (
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Group className="h-4 w-4" />
                      {groupName} ({groupIssues.length})
                    </h3>
                  )}
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full">
                      {groupBy === "none" && (
                        <thead className="bg-muted/50">
                          <tr className="border-b border-border">
                            <th className="p-3 w-10">
                              <Checkbox 
                                checked={selectedIssues.size === filteredIssues.length && filteredIssues.length > 0}
                                onCheckedChange={toggleAllIssues}
                                data-testid="checkbox-select-all"
                              />
                            </th>
                            <th className="text-left p-3 text-sm font-medium">Severity</th>
                            <th className="text-left p-3 text-sm font-medium">Status</th>
                            <th className="text-left p-3 text-sm font-medium">Issue Type</th>
                            <th className="text-left p-3 text-sm font-medium hidden lg:table-cell">Assigned</th>
                            <th className="text-left p-3 text-sm font-medium">Description</th>
                            <th className="text-left p-3 text-sm font-medium w-20">AI</th>
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {groupIssues.map((issue) => {
                          const assigned = assignedUser(issue.assignedTo || undefined);
                          return (
                            <tr
                              key={issue.id}
                              className="border-b border-border last:border-0 hover-elevate cursor-pointer"
                              onClick={() => {
                                setSelectedIssueId(issue.id);
                                setIssueDetailOpen(true);
                              }}
                              data-testid={`row-issue-${issue.id}`}
                            >
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={selectedIssues.has(issue.id)}
                                  onCheckedChange={() => toggleIssueSelection(issue.id)}
                                  data-testid={`checkbox-issue-${issue.id}`}
                                />
                              </td>
                              <td className="p-3">
                                <SeverityBadge severity={issue.severity} />
                              </td>
                              <td className="p-3">
                                {getStatusBadge(issue.status || undefined)}
                              </td>
                              <td className="p-3">
                                <span className="font-medium text-sm">{issue.issueType}</span>
                              </td>
                              <td className="p-3 hidden lg:table-cell">
                                {assigned ? (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {assigned.firstName?.[0]}{assigned.lastName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{assigned.firstName} {assigned.lastName}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Unassigned</span>
                                )}
                              </td>
                              <td className="p-3">
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {issue.description || "No description available"}
                                </p>
                              </td>
                              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                {!issue.aiSuggestion ? (
                                  <GradientButton
                                    size="sm"
                                    onClick={() => aiSuggestionMutation.mutate(issue.id)}
                                    disabled={aiSuggestionMutation.isPending}
                                    data-testid={`button-ai-${issue.id}`}
                                    showIcon={true}
                                    className="text-xs"
                                  >
                                    AI Fix
                                  </GradientButton>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled
                                    className="cursor-default"
                                  >
                                    <Sparkles className="h-4 w-4 text-primary" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
              <p className="text-muted-foreground max-w-md">
                {searchTerm || severityFilter !== "all" || statusFilter !== "all" || assigneeFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Run an accessibility scan to discover issues"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Detail Sheet */}
      {selectedIssue && (
        <Sheet open={issueDetailOpen} onOpenChange={setIssueDetailOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SeverityBadge severity={selectedIssue.severity} />
                {selectedIssue.issueType}
              </SheetTitle>
              <SheetDescription>
                Issue Details & Collaboration
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Issue Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedIssue.status || undefined)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedIssue.description || "No description"}</p>
                </div>

                {selectedIssue.wcagCriteria && (
                  <div>
                    <label className="text-sm font-medium">WCAG Criteria</label>
                    <p className="mt-1 text-sm font-mono">{selectedIssue.wcagCriteria}</p>
                  </div>
                )}

                {selectedIssue.suggestion && (
                  <div>
                    <label className="text-sm font-medium">Remediation Suggestion</label>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedIssue.suggestion}</p>
                  </div>
                )}

                {selectedIssue.aiSuggestion && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-md">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI-Powered Fix Suggestion
                    </label>
                    <p className="mt-2 text-sm">{selectedIssue.aiSuggestion}</p>
                  </div>
                )}

                {selectedIssue.codeSnippet && (
                  <div>
                    <label className="text-sm font-medium">Code Snippet</label>
                    <pre className="mt-1 text-xs font-mono bg-muted p-3 rounded-md overflow-x-auto">
                      {selectedIssue.codeSnippet}
                    </pre>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({comments?.length || 0})
                </h3>

                <div className="space-y-4 mb-4">
                  {comments?.map((comment) => {
                    const commentUser = users?.find(u => u.id === comment.userId);
                    return (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {commentUser?.firstName?.[0]}{commentUser?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {commentUser?.firstName} {commentUser?.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt && formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{comment.comment}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                    data-testid="textarea-new-comment"
                  />
                  <Button
                    onClick={() => addCommentMutation.mutate({ issueId: selectedIssue.id, comment: newComment })}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
