import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AccessibilityScoreGaugeProps {
  score: number; // 0-100
  className?: string;
}

export function AccessibilityScoreGauge({ score, className }: AccessibilityScoreGaugeProps) {
  // Determine color and rating based on score (Lighthouse-style)
  const getScoreColor = (score: number) => {
    if (score >= 90) return { color: '#22c55e', bg: 'bg-green-500', text: 'Excellent' };
    if (score >= 70) return { color: '#84cc16', bg: 'bg-lime-500', text: 'Good' };
    if (score >= 50) return { color: '#f59e0b', bg: 'bg-orange-500', text: 'Needs Improvement' };
    return { color: '#ef4444', bg: 'bg-red-500', text: 'Poor' };
  };

  const scoreInfo = getScoreColor(score);
  
  // Calculate circle dasharray for progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <Card className={`shadow-md hover:shadow-xl transition-all duration-200 ${className || ''}`}>
      <CardHeader>
        <CardTitle className="text-lg">Accessibility Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="transform -rotate-90 w-32 h-32">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r={radius}
              stroke={scoreInfo.color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold" style={{ color: scoreInfo.color }}>
              {score}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="font-semibold" style={{ color: scoreInfo.color }}>
            {scoreInfo.text}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {score >= 90 && "Meets WCAG standards"}
            {score >= 70 && score < 90 && "Minor improvements needed"}
            {score >= 50 && score < 70 && "Significant issues found"}
            {score < 50 && "Critical issues require attention"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
