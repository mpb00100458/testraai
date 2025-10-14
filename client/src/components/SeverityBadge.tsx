import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

type Severity = "critical" | "warning" | "minor" | "pass";

interface SeverityBadgeProps {
  severity: Severity;
  count?: number;
}

const severityConfig = {
  critical: {
    label: "Critical",
    icon: AlertCircle,
    className: "bg-critical/10 text-critical border-critical/20",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  minor: {
    label: "Minor",
    icon: Info,
    className: "bg-muted text-muted-foreground border-border",
  },
  pass: {
    label: "Pass",
    icon: CheckCircle,
    className: "bg-success/10 text-success border-success/20",
  },
};

export function SeverityBadge({ severity, count }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`} data-testid={`badge-severity-${severity}`}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      {count !== undefined && <span className="ml-1 font-semibold">({count})</span>}
    </Badge>
  );
}
