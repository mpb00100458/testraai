import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface ContrastResult {
  ratio: number;
  passAA: boolean;
  passAAA: boolean;
  passAALarge: boolean;
  passAAALarge: boolean;
}

export function ColorContrastAnalyzer() {
  const [foreground, setForeground] = useState("#000000");
  const [background, setBackground] = useState("#FFFFFF");

  // Calculate relative luminance (WCAG formula)
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Calculate contrast ratio
  const getContrastRatio = (fg: string, bg: string): number => {
    const l1 = getLuminance(fg);
    const l2 = getLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const ratio = getContrastRatio(foreground, background);
  
  const result: ContrastResult = {
    ratio: Math.round(ratio * 100) / 100,
    passAA: ratio >= 4.5,
    passAAA: ratio >= 7,
    passAALarge: ratio >= 3,
    passAAALarge: ratio >= 4.5,
  };

  const StatusIcon = ({ pass }: { pass: boolean }) =>
    pass ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  return (
    <Card data-testid="color-contrast-analyzer">
      <CardHeader>
        <CardTitle>Color Contrast Analyzer</CardTitle>
        <CardDescription>Check WCAG 2.2 color contrast compliance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="foreground">Foreground Color</Label>
            <div className="flex gap-2">
              <Input
                id="foreground"
                type="color"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                className="w-16 h-10 p-1"
                data-testid="input-foreground-color"
              />
              <Input
                type="text"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
                className="font-mono uppercase"
                data-testid="input-foreground-hex"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="background">Background Color</Label>
            <div className="flex gap-2">
              <Input
                id="background"
                type="color"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-16 h-10 p-1"
                data-testid="input-background-color"
              />
              <Input
                type="text"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="font-mono uppercase"
                data-testid="input-background-hex"
              />
            </div>
          </div>
        </div>

        <div 
          className="p-6 rounded-lg text-center"
          style={{ 
            backgroundColor: background, 
            color: foreground,
            border: '2px solid hsl(var(--border))'
          }}
        >
          <p className="text-lg font-semibold">Sample Text Preview</p>
          <p className="text-sm mt-1">How readable is this text?</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-semibold">Contrast Ratio</span>
            <Badge variant="outline" className="text-lg">
              {result.ratio}:1
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon pass={result.passAA} />
                <span className="text-sm">WCAG AA (Normal Text)</span>
              </div>
              <span className="text-sm text-muted-foreground">≥ 4.5:1</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon pass={result.passAAA} />
                <span className="text-sm">WCAG AAA (Normal Text)</span>
              </div>
              <span className="text-sm text-muted-foreground">≥ 7:1</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon pass={result.passAALarge} />
                <span className="text-sm">WCAG AA (Large Text)</span>
              </div>
              <span className="text-sm text-muted-foreground">≥ 3:1</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon pass={result.passAAALarge} />
                <span className="text-sm">WCAG AAA (Large Text)</span>
              </div>
              <span className="text-sm text-muted-foreground">≥ 4.5:1</span>
            </div>
          </div>

          {!result.passAA && (
            <div className="flex items-start gap-2 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-500">Contrast Issue Detected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This color combination does not meet WCAG AA standards. Consider increasing contrast for better accessibility.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
