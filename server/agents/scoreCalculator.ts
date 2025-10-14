/**
 * Accessibility Score Calculator
 * Similar to Lighthouse scoring - calculates 0-100 score based on issue severity
 */

export interface IssueBreakdown {
  critical: number;
  warning: number;
  minor: number;
  pass: number;
}

export interface ScoreResult {
  score: number; // 0-100
  rating: 'poor' | 'needs-improvement' | 'good' | 'excellent';
  color: string;
  description: string;
}

export class ScoreCalculator {
  /**
   * Calculate accessibility score (0-100) based on issue severity
   * Similar to Lighthouse scoring algorithm
   * 
   * Weighting:
   * - Critical issues: -15 points each
   * - Warning issues: -5 points each
   * - Minor issues: -2 points each
   * - Pass results: +0.5 points each (capped)
   */
  calculateScore(breakdown: IssueBreakdown): ScoreResult {
    // Start with perfect score
    let score = 100;
    
    // Deduct points for issues
    score -= breakdown.critical * 15;
    score -= breakdown.warning * 5;
    score -= breakdown.minor * 2;
    
    // Add small bonus for passes (capped at 10 points)
    const passBonus = Math.min(breakdown.pass * 0.5, 10);
    score += passBonus;
    
    // Clamp between 0-100
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    // Determine rating and color (Lighthouse-style)
    let rating: ScoreResult['rating'];
    let color: string;
    let description: string;
    
    if (score >= 90) {
      rating = 'excellent';
      color = '#22c55e'; // Green
      description = 'Excellent accessibility - meets WCAG standards';
    } else if (score >= 70) {
      rating = 'good';
      color = '#84cc16'; // Lime
      description = 'Good accessibility - minor improvements needed';
    } else if (score >= 50) {
      rating = 'needs-improvement';
      color = '#f59e0b'; // Orange
      description = 'Needs improvement - significant issues found';
    } else {
      rating = 'poor';
      color = '#ef4444'; // Red
      description = 'Poor accessibility - critical issues require immediate attention';
    }
    
    return {
      score,
      rating,
      color,
      description,
    };
  }
  
  /**
   * Calculate detailed metrics for reporting
   */
  calculateMetrics(breakdown: IssueBreakdown): {
    totalIssues: number;
    totalTests: number;
    passRate: number;
    failRate: number;
    criticalityIndex: number; // Weighted severity measure
  } {
    const totalIssues = breakdown.critical + breakdown.warning + breakdown.minor;
    const totalTests = totalIssues + breakdown.pass;
    const passRate = totalTests > 0 ? Math.round((breakdown.pass / totalTests) * 100) : 0;
    const failRate = 100 - passRate;
    
    // Criticality index: weighted severity (0-10 scale)
    const criticalWeight = breakdown.critical * 10;
    const warningWeight = breakdown.warning * 5;
    const minorWeight = breakdown.minor * 2;
    const totalWeight = criticalWeight + warningWeight + minorWeight;
    const maxPossibleWeight = totalTests * 10;
    
    const criticalityIndex = maxPossibleWeight > 0 
      ? Math.min(10, Math.round((totalWeight / maxPossibleWeight) * 10))
      : 0;
    
    return {
      totalIssues,
      totalTests,
      passRate,
      failRate,
      criticalityIndex,
    };
  }
}

export const scoreCalculator = new ScoreCalculator();
