import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisualIssue {
  id: string;
  issueType: string;
  severity: 'critical' | 'warning' | 'minor' | 'pass';
  elementPosition?: string;
  description: string;
}

interface VisualIssueViewerProps {
  screenshotUrl?: string;
  issues: VisualIssue[];
  selectedIssueId?: string;
  onIssueClick?: (issueId: string) => void;
}

const severityColors = {
  critical: "bg-destructive/20 border-destructive hover:bg-destructive/30",
  warning: "bg-yellow-500/20 border-yellow-500 hover:bg-yellow-500/30",
  minor: "bg-blue-500/20 border-blue-500 hover:bg-blue-500/30",
  pass: "bg-green-500/20 border-green-500 hover:bg-green-500/30",
};

export function VisualIssueViewer({
  screenshotUrl,
  issues,
  selectedIssueId,
  onIssueClick,
}: VisualIssueViewerProps) {
  const issuesWithPositions = issues.filter(issue => {
    if (!issue.elementPosition) return false;
    try {
      JSON.parse(issue.elementPosition);
      return true;
    } catch {
      return false;
    }
  });

  if (!screenshotUrl || issuesWithPositions.length === 0) {
    return (
      <Card data-testid="visual-issue-viewer-empty">
        <CardHeader>
          <CardTitle>Visual Issue Viewer</CardTitle>
          <CardDescription>See issues highlighted on the page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No visual data available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Element positions not captured for these issues
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="visual-issue-viewer">
      <CardHeader>
        <CardTitle>Visual Issue Viewer</CardTitle>
        <CardDescription>
          {issuesWithPositions.length} issue{issuesWithPositions.length !== 1 ? 's' : ''} highlighted on page
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full border rounded-md overflow-hidden bg-muted">
          <img
            src={screenshotUrl}
            alt="Page screenshot"
            className="w-full h-auto"
            data-testid="screenshot-image"
          />
          
          {issuesWithPositions.map((issue) => {
            let position: ElementPosition;
            try {
              position = JSON.parse(issue.elementPosition!);
            } catch {
              return null;
            }

            const isSelected = issue.id === selectedIssueId;

            return (
              <div
                key={issue.id}
                className={cn(
                  "absolute border-2 cursor-pointer transition-all",
                  severityColors[issue.severity],
                  isSelected && "ring-2 ring-primary ring-offset-2"
                )}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: `${position.width}%`,
                  height: `${position.height}%`,
                }}
                onClick={() => onIssueClick?.(issue.id)}
                data-testid={`issue-marker-${issue.id}`}
                title={issue.description}
              >
                <div className="absolute -top-6 left-0 flex items-center gap-1 whitespace-nowrap">
                  <Badge
                    variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {issue.severity}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Legend:</p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-destructive bg-destructive/20 rounded" />
              <span className="text-sm">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-yellow-500 bg-yellow-500/20 rounded" />
              <span className="text-sm">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 bg-blue-500/20 rounded" />
              <span className="text-sm">Minor</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
