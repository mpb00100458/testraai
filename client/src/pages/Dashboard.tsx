import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { AccessibilityScoreGauge } from "@/components/AccessibilityScoreGauge";
import { AccessibilityTrendChart } from "@/components/AccessibilityTrendChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Globe, TrendingUp, Activity, ExternalLink } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { A11yHistory, A11yResult } from "@shared/schema";

interface DashboardStats {
  totalScans: number;
  totalIssues: number;
  pagesScanned: number;
  passRate: number;
  averageScore: number; // Weighted Lighthouse-style accessibility score
  severityBreakdown: {
    critical: number;
    warning: number;
    minor: number;
    pass: number;
  };
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState<{ type: 'severity' | 'status' | null; value: string | null }>({ type: null, value: null });

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

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: history = [] } = useQuery<A11yHistory[]>({
    queryKey: ["/api/dashboard/history"],
    enabled: isAuthenticated,
  });

  const { data: allIssues = [] } = useQuery<A11yResult[]>({
    queryKey: ["/api/issues"],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const chartData = stats ? [
    { name: "Critical", value: stats.severityBreakdown.critical, fill: "hsl(var(--chart-4))" },
    { name: "Warning", value: stats.severityBreakdown.warning, fill: "hsl(var(--chart-3))" },
    { name: "Minor", value: stats.severityBreakdown.minor, fill: "hsl(var(--chart-5))" },
    { name: "Pass", value: stats.severityBreakdown.pass, fill: "hsl(var(--chart-2))" },
  ] : [];

  // Calculate status breakdown
  const statusBreakdown = {
    new: allIssues.filter(i => !i.status || i.status === 'new').length,
    in_progress: allIssues.filter(i => i.status === 'in_progress').length,
    resolved: allIssues.filter(i => i.status === 'resolved').length,
    ignored: allIssues.filter(i => i.status === 'ignored').length,
  };

  const statusChartData = [
    { name: "New", value: statusBreakdown.new, fill: "hsl(var(--chart-1))" },
    { name: "In Progress", value: statusBreakdown.in_progress, fill: "hsl(var(--chart-3))" },
    { name: "Resolved", value: statusBreakdown.resolved, fill: "hsl(var(--chart-2))" },
    { name: "Ignored", value: statusBreakdown.ignored, fill: "hsl(var(--muted))" },
  ];

  // Filter issues based on selected filter
  const filteredIssues = allIssues.filter(issue => {
    if (!selectedFilter.type || !selectedFilter.value) return true;
    
    if (selectedFilter.type === 'severity') {
      return issue.severity?.toLowerCase() === selectedFilter.value.toLowerCase();
    } else if (selectedFilter.type === 'status') {
      const issueStatus = issue.status || 'new';
      return issueStatus.toLowerCase().replace(' ', '_') === selectedFilter.value.toLowerCase().replace(' ', '_');
    }
    return true;
  });

  const handleChartClick = (type: 'severity' | 'status', value: string) => {
    if (selectedFilter.type === type && selectedFilter.value === value) {
      setSelectedFilter({ type: null, value: null });
    } else {
      setSelectedFilter({ type, value });
    }
  };

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight gradient-text">Dashboard</h1>
        <p className="text-lg text-muted-foreground">Real-time accessibility insights across your web estate</p>
      </div>

      {isLoading ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </>
      ) : stats ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Scans"
              value={stats.totalScans}
              icon={Activity}
              description="Active accessibility scans"
            />
            <StatsCard
              title="Total Issues"
              value={stats.totalIssues}
              icon={AlertCircle}
              description="Across all scans"
            />
            <StatsCard
              title="Pages Scanned"
              value={stats.pagesScanned}
              icon={Globe}
              description="Total pages audited"
            />
            <StatsCard
              title="Pass Rate"
              value={`${stats.passRate}%`}
              icon={TrendingUp}
              description="Average compliance score"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <AccessibilityScoreGauge 
              score={stats.averageScore} 
              data-testid="accessibility-score-gauge"
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Issues by Severity</CardTitle>
                <CardDescription>Click to filter issues below</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      radius={[4, 4, 0, 0]}
                      onClick={(data) => handleChartClick('severity', data.name)}
                      className="cursor-pointer"
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill} 
                          opacity={selectedFilter.type === 'severity' && selectedFilter.value !== entry.name ? 0.3 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Issues by Status</CardTitle>
                <CardDescription>Click to filter issues below</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={(data) => handleChartClick('status', data.name)}
                      className="cursor-pointer"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.fill}
                          opacity={selectedFilter.type === 'status' && selectedFilter.value !== entry.name ? 0.3 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

          </div>

          <AccessibilityTrendChart data={history} />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Issues</CardTitle>
                <CardDescription>
                  {selectedFilter.type && selectedFilter.value 
                    ? `Filtered by ${selectedFilter.type}: ${selectedFilter.value} (${filteredIssues.length} issues)`
                    : `All accessibility issues (${allIssues.length} total)`
                  }
                </CardDescription>
              </div>
              {selectedFilter.type && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedFilter({ type: null, value: null })}
                  data-testid="button-clear-filter"
                >
                  Clear Filter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {filteredIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No issues found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFilter.type ? "Try a different filter" : "Start a scan to discover accessibility issues"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Rule</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>WCAG</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.slice(0, 20).map((issue) => (
                        <TableRow key={issue.id} data-testid={`row-issue-${issue.id}`}>
                          <TableCell>
                            <SeverityBadge severity={issue.severity?.toLowerCase() as any || 'minor'} />
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                issue.status === 'resolved' ? 'default' :
                                issue.status === 'in_progress' ? 'secondary' :
                                issue.status === 'ignored' ? 'outline' :
                                'destructive'
                              }
                              data-testid={`badge-status-${issue.id}`}
                            >
                              {issue.status || 'new'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{issue.issueType}</TableCell>
                          <TableCell className="max-w-md truncate">{issue.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{issue.wcagCriteria || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {issue.evidenceUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                data-testid={`button-evidence-${issue.id}`}
                              >
                                <a href={issue.evidenceUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredIssues.length > 20 && (
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Showing 20 of {filteredIssues.length} issues
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground max-w-md">
                Start your first accessibility scan to see dashboard statistics and insights
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
