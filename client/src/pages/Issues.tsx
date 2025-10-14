import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Search, Download, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { A11yResult } from "@shared/schema";

export default function Issues() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
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

  const { data: issues, isLoading } = useQuery<A11yResult[]>({
    queryKey: ["/api/issues"],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const filteredIssues = issues?.filter(issue => {
    const matchesSearch = searchTerm === "" || 
      issue.issueType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  }) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Issues</h1>
        <p className="text-muted-foreground">Accessibility violations discovered across your web estate</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Issues</CardTitle>
              <CardDescription>Filter and search accessibility violations</CardDescription>
            </div>
            <Button variant="outline" size="sm" data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
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

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredIssues.length > 0 ? (
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
                        <SeverityBadge severity={issue.severity} />
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
                  : "Run an accessibility scan to discover issues"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
