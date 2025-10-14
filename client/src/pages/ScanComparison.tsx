import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ScanComparison {
  scan1: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    totalIssues: number | null;
    criticalIssues: number | null;
    warningIssues: number | null;
    minorIssues: number | null;
    passRate: number | null;
    averageScore: number | null;
    issuesCount: number;
  };
  scan2: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    totalIssues: number | null;
    criticalIssues: number | null;
    warningIssues: number | null;
    minorIssues: number | null;
    passRate: number | null;
    averageScore: number | null;
    issuesCount: number;
  };
  changes: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    minorIssues: number;
    passRate: number;
    averageScore: number;
  };
  issueTypeChanges: Record<string, { before: number; after: number; change: number }>;
}

interface ScanComparisonProps {
  scan1Id: string;
  scan2Id: string;
}

export default function ScanComparison({ scan1Id, scan2Id }: ScanComparisonProps) {
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

  const { data: comparison, isLoading } = useQuery<ScanComparison>({
    queryKey: ['/api/scans/compare', scan1Id, scan2Id],
    queryFn: async () => {
      const response = await fetch(`/api/scans/compare/${scan1Id}/${scan2Id}`);
      if (!response.ok) throw new Error("Failed to fetch comparison");
      return response.json();
    },
    enabled: isAuthenticated && !!scan1Id && !!scan2Id,
  });

  const renderTrend = (value: number, reverseColors: boolean = false) => {
    if (value === 0) {
      return (
        <span className="inline-flex items-center text-muted-foreground">
          <Minus className="h-4 w-4 mr-1" />
          No change
        </span>
      );
    }
    
    const isPositive = value > 0;
    const isGood = reverseColors ? !isPositive : isPositive;
    
    return (
      <span className={`inline-flex items-center ${isGood ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 mr-1" />
        ) : (
          <TrendingDown className="h-4 w-4 mr-1" />
        )}
        {isPositive ? '+' : ''}{value}
      </span>
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Comparison Not Found</h2>
        <p className="text-muted-foreground mb-4">Unable to load scan comparison</p>
        <Button onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scan Comparison</h1>
          <p className="text-muted-foreground mt-1">
            Compare accessibility scan results over time
          </p>
        </div>
        <Button variant="outline" onClick={() => window.close()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Close
        </Button>
      </div>

      {/* Scan Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Earlier Scan
              <Badge variant="outline">Baseline</Badge>
            </CardTitle>
            <CardDescription>
              {formatDistanceToNow(new Date(comparison.scan1.startedAt), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Total Issues:</span>
                <p className="font-medium text-lg">{comparison.scan1.totalIssues || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Pass Rate:</span>
                <p className="font-medium text-lg">{comparison.scan1.passRate?.toFixed(1) || 0}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Score:</span>
                <p className="font-medium text-lg">{comparison.scan1.averageScore?.toFixed(0) || 0}/100</p>
              </div>
              <div>
                <span className="text-muted-foreground">Critical:</span>
                <p className="font-medium text-lg text-red-600">{comparison.scan1.criticalIssues || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Later Scan
              <Badge>Current</Badge>
            </CardTitle>
            <CardDescription>
              {formatDistanceToNow(new Date(comparison.scan2.startedAt), { addSuffix: true })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Total Issues:</span>
                <p className="font-medium text-lg">{comparison.scan2.totalIssues || 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Pass Rate:</span>
                <p className="font-medium text-lg">{comparison.scan2.passRate?.toFixed(1) || 0}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Score:</span>
                <p className="font-medium text-lg">{comparison.scan2.averageScore?.toFixed(0) || 0}/100</p>
              </div>
              <div>
                <span className="text-muted-foreground">Critical:</span>
                <p className="font-medium text-lg text-red-600">{comparison.scan2.criticalIssues || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Changes Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Changes Summary
          </CardTitle>
          <CardDescription>
            Differences between the two scans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Issues</p>
              <div className="text-2xl font-bold">
                {renderTrend(comparison.changes.totalIssues)}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pass Rate</p>
              <div className="text-2xl font-bold">
                {renderTrend(comparison.changes.passRate, true)}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Score</p>
              <div className="text-2xl font-bold">
                {renderTrend(Math.round(comparison.changes.averageScore), true)}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Critical Issues</p>
              <div className="text-xl font-bold text-red-600">
                {renderTrend(comparison.changes.criticalIssues)}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Warning Issues</p>
              <div className="text-xl font-bold text-orange-600">
                {renderTrend(comparison.changes.warningIssues)}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Minor Issues</p>
              <div className="text-xl font-bold text-yellow-600">
                {renderTrend(comparison.changes.minorIssues)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issue Type Changes */}
      {Object.keys(comparison.issueTypeChanges).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Issue Type Breakdown</CardTitle>
            <CardDescription>
              How specific issue types changed between scans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(comparison.issueTypeChanges)
                .sort((a, b) => Math.abs(b[1].change) - Math.abs(a[1].change))
                .map(([issueType, data]) => (
                  <div key={issueType} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium capitalize">{issueType.replace(/-/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.before} → {data.after}
                      </p>
                    </div>
                    <div className="text-right">
                      {renderTrend(data.change)}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
