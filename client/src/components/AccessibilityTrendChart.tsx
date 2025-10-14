import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import type { A11yHistory } from "@shared/schema";

interface AccessibilityTrendChartProps {
  data: A11yHistory[];
}

export function AccessibilityTrendChart({ data }: AccessibilityTrendChartProps) {
  // Transform data for the chart
  const chartData = data
    .map(item => ({
      date: item.snapshotDate ? new Date(item.snapshotDate).getTime() : 0,
      score: item.averageScore,
      critical: item.criticalIssues,
      warning: item.warningIssues,
      minor: item.minorIssues,
    }))
    .sort((a, b) => a.date - b.date)
    .map(item => ({
      ...item,
      dateLabel: format(new Date(item.date), 'MMM d'),
    }));

  if (chartData.length === 0) {
    return (
      <Card data-testid="card-accessibility-trend">
        <CardHeader>
          <CardTitle>Accessibility Score Trend</CardTitle>
          <CardDescription>Track compliance progress over time</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          No historical data available. Run multiple scans to see trends.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-accessibility-trend">
      <CardHeader>
        <CardTitle>Accessibility Score Trend</CardTitle>
        <CardDescription>Track compliance progress over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="dateLabel" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                color: 'hsl(var(--popover-foreground))'
              }}
            />
            <Legend 
              wrapperStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              name="Accessibility Score"
              dot={{ fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
