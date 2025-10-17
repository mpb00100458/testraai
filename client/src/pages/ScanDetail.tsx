import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Search, ArrowLeft, AlertCircle, Calendar, TrendingUp, Video, FileCode } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface ScanDetailData {
  id: string;
  estateId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  totalIssues: number | null;
  criticalIssues: number | null;
  warningIssues: number | null;
  minorIssues: number | null;
  passRate: number | null;
  averageScore: number | null;
  pagesAudited: number | null;
  videoPath: string | null;
  tracePath: string | null;
  issues: Array<{
    id: string;
    issueType: string;
    severity: string;
    wcagCriteria: string | null;
    impactScore: number | null;
    description: string | null;
    codeSnippet: string | null;
    pageId: string;
  }>;
}

interface ScanDetailProps {
  scanId: string;
}

export default function ScanDetail({ scanId }: ScanDetailProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

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

  const { data: scanData, isLoading, error } = useQuery<ScanDetailData>({
    queryKey: ['/api/scans', scanId],
    queryFn: async () => {
      const response = await fetch(`/api/scans/${scanId}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        if (response.status === 403) {
          throw new Error("ACCESS_DENIED");
        }
        if (response.status === 404) {
          throw new Error("NOT_FOUND");
        }
        throw new Error("FETCH_FAILED");
      }
      return response.json();
    },
    enabled: isAuthenticated && !!scanId,
    retry: false,
  });

  // Handle query errors
  useEffect(() => {
    if (error) {
      const errorMessage = error.message;
      
      if (errorMessage === "UNAUTHORIZED") {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
      } else if (errorMessage === "ACCESS_DENIED") {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this scan.",
          variant: "destructive",
        });
      } else if (errorMessage === "NOT_FOUND") {
        toast({
          title: "Scan Not Found",
          description: "The requested scan could not be found.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to load scan details. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [error, toast]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const filteredIssues = scanData?.issues?.filter(issue => {
    const matchesSearch = searchTerm === "" || 
      issue.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  }) || [];

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 dark:text-green-500";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  const getPassRateColor = (passRate: number | null | undefined) => {
    if (passRate === null || passRate === undefined) return "text-muted-foreground";
    if (passRate >= 80) return "text-green-600 dark:text-green-500";
    if (passRate >= 60) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Scan Report</h1>
          <p className="text-muted-foreground">Detailed accessibility audit results</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        <Card className="!shadow-md hover:!shadow-xl transition-all duration-200">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {error.message === "NOT_FOUND" ? "Scan Not Found" :
                 error.message === "ACCESS_DENIED" ? "Access Denied" :
                 "Error Loading Scan"}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {error.message === "NOT_FOUND" 
                  ? "The requested scan could not be found. It may have been deleted or you may not have access to it."
                  : error.message === "ACCESS_DENIED"
                  ? "You don't have permission to view this scan. Please contact your administrator."
                  : "An error occurred while loading the scan details. Please try again later."}
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => window.history.back()}
                data-testid="button-back-error"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : scanData ? (
        <>
          <Card className="!shadow-md hover:!shadow-xl transition-all duration-200">
            <CardHeader>
              <CardTitle>Scan Overview</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Completed {scanData.completedAt 
                      ? formatDistanceToNow(new Date(scanData.completedAt), { addSuffix: true })
                      : 'Never'}
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge 
                    variant={scanData.status === 'completed' ? 'default' : scanData.status === 'failed' ? 'destructive' : 'secondary'}
                    data-testid="badge-status"
                  >
                    {scanData.status === 'completed' ? 'Completed' : 
                     scanData.status === 'failed' ? 'Failed' : 'Running'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                  <p className="text-2xl font-bold" data-testid="text-total-issues">
                    {scanData.totalIssues ?? '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500" data-testid="text-critical-issues">
                    {scanData.criticalIssues ?? '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Warning</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500" data-testid="text-warning-issues">
                    {scanData.warningIssues ?? '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Minor</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-500" data-testid="text-minor-issues">
                    {scanData.minorIssues ?? '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Pass Rate</p>
                  <p className={`text-2xl font-bold ${getPassRateColor(scanData.passRate)}`} data-testid="text-pass-rate">
                    {scanData.passRate !== null ? `${scanData.passRate}%` : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className={`text-2xl font-bold ${getScoreColor(scanData.averageScore)}`} data-testid="text-score">
                      {scanData.averageScore !== null ? scanData.averageScore.toFixed(1) : '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Download buttons for video and trace */}
              {(scanData.videoPath || scanData.tracePath) && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-sm font-medium mb-3">Scan Artifacts</h3>
                  <div className="flex flex-wrap gap-3">
                    {scanData.videoPath && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/scans/${scanData.id}/video`, '_blank')}
                        data-testid={`button-download-video-${scanData.id}`}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Download Video
                      </Button>
                    )}
                    {scanData.tracePath && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/scans/${scanData.id}/trace`, '_blank')}
                        data-testid={`button-download-trace-${scanData.id}`}
                      >
                        <FileCode className="h-4 w-4 mr-2" />
                        Download Trace
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="!shadow-md hover:!shadow-xl transition-all duration-200">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Issues ({filteredIssues.length})</CardTitle>
                  <CardDescription>Filter and search accessibility violations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
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
                  <SelectTrigger className="w-full sm:w-48" data-testid="select-severity-filter">
                    <SelectValue placeholder="Filter by severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredIssues.length > 0 ? (
                <div className="border border-border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-sm font-medium">Severity</th>
                        <th className="text-left p-3 text-sm font-medium">Issue Type</th>
                        <th className="text-left p-3 text-sm font-medium hidden md:table-cell">WCAG</th>
                        <th className="text-left p-3 text-sm font-medium hidden lg:table-cell">Impact</th>
                        <th className="text-left p-3 text-sm font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIssues.map((issue) => (
                        <tr
                          key={issue.id}
                          className="border-b border-border last:border-0 hover-elevate"
                          data-testid={`row-issue-${issue.id}`}
                        >
                          <td className="p-3">
                            <SeverityBadge severity={issue.severity as "critical" | "warning" | "minor" | "pass"} />
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-sm">{issue.issueType}</span>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <span className="text-sm font-mono text-muted-foreground">
                              {issue.wcagCriteria || "N/A"}
                            </span>
                          </td>
                          <td className="p-3 hidden lg:table-cell">
                            {issue.impactScore ? (
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      issue.impactScore >= 8 ? 'bg-red-500' :
                                      issue.impactScore >= 5 ? 'bg-orange-500' :
                                      'bg-yellow-500'
                                    }`}
                                    style={{ width: `${issue.impactScore * 10}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">{issue.impactScore}/10</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {issue.description || "No description available"}
                              </p>
                              {issue.codeSnippet && (
                                <p className="text-xs font-mono text-primary bg-primary/5 px-2 py-1 rounded line-clamp-1">
                                  {issue.codeSnippet}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                  <p className="text-muted-foreground max-w-md">
                    {searchTerm || severityFilter !== "all" 
                      ? "Try adjusting your search or filter criteria"
                      : "No accessibility issues were found in this scan"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="!shadow-md hover:!shadow-xl transition-all duration-200">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Scan Not Found</h3>
              <p className="text-muted-foreground max-w-md">
                The requested scan could not be found. It may have been deleted or you may not have access to it.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
