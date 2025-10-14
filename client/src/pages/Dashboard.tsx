import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/StatsCard";
import { AccessibilityScoreGauge } from "@/components/AccessibilityScoreGauge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileText, Globe, TrendingUp, Activity } from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const chartData = stats ? [
    { name: "Critical", value: stats.severityBreakdown.critical, fill: "hsl(var(--chart-4))" },
    { name: "Warning", value: stats.severityBreakdown.warning, fill: "hsl(var(--chart-3))" },
    { name: "Minor", value: stats.severityBreakdown.minor, fill: "hsl(var(--chart-5))" },
    { name: "Pass", value: stats.severityBreakdown.pass, fill: "hsl(var(--chart-2))" },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your accessibility testing results</p>
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
                <CardDescription>Distribution of accessibility issues</CardDescription>
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
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Summary</CardTitle>
                <CardDescription>Quick overview of issue categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity="critical" count={stats.severityBreakdown.critical} />
                    <span className="text-2xl font-bold" data-testid="text-critical-count">{stats.severityBreakdown.critical}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity="warning" count={stats.severityBreakdown.warning} />
                    <span className="text-2xl font-bold" data-testid="text-warning-count">{stats.severityBreakdown.warning}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity="minor" count={stats.severityBreakdown.minor} />
                    <span className="text-2xl font-bold" data-testid="text-minor-count">{stats.severityBreakdown.minor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity="pass" count={stats.severityBreakdown.pass} />
                    <span className="text-2xl font-bold" data-testid="text-pass-count">{stats.severityBreakdown.pass}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest accessibility scans and findings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-1">Start a new scan to see activity here</p>
              </div>
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
