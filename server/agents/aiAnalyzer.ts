import OpenAI from 'openai';

// Initialize OpenAI client with Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface AIIssueAnalysis {
  description: string;
  suggestion: string;
  codeSnippet?: string;
  wcagReference: string;
  severity: 'critical' | 'warning' | 'minor';
  impactScore: number; // 1-10
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  similarIssueId?: string;
  confidence: number; // 0-1
  reason: string;
}

export class AIAnalyzer {
  /**
   * Analyze an accessibility issue using AI to provide detailed recommendations
   */
  async analyzeIssue(
    issueType: string,
    element: string,
    pageUrl: string,
    wcagCriteria: string
  ): Promise<AIIssueAnalysis> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an accessibility expert specializing in WCAG 2.2 compliance. Analyze accessibility issues and provide actionable recommendations with code examples.`
          },
          {
            role: 'user',
            content: `Analyze this accessibility issue:
- Issue Type: ${issueType}
- Element: ${element}
- Page URL: ${pageUrl}
- WCAG Criteria: ${wcagCriteria}

Provide:
1. Clear description of the issue
2. Specific fix recommendation
3. Code snippet showing the fix (HTML/CSS/JS as appropriate)
4. WCAG reference details
5. Severity assessment (critical/warning/minor)
6. Impact score (1-10, where 10 is highest impact)

Format your response as JSON with keys: description, suggestion, codeSnippet, wcagReference, severity, impactScore`
          }
        ],
        temperature: 0.3,
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(content);
        return {
          description: parsed.description || `${issueType.replace(/-/g, ' ')} issue detected`,
          suggestion: parsed.suggestion || `Fix ${issueType.replace(/-/g, ' ')} to meet WCAG ${wcagCriteria} criteria`,
          codeSnippet: parsed.codeSnippet,
          wcagReference: parsed.wcagReference || `WCAG ${wcagCriteria}`,
          severity: parsed.severity || 'warning',
          impactScore: parsed.impactScore || 5,
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          description: `${issueType.replace(/-/g, ' ')} issue detected on ${element}`,
          suggestion: content.substring(0, 200),
          wcagReference: `WCAG ${wcagCriteria}`,
          severity: 'warning',
          impactScore: 5,
        };
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback to basic analysis
      return {
        description: `${issueType.replace(/-/g, ' ')} issue detected`,
        suggestion: `Fix ${issueType.replace(/-/g, ' ')} to meet WCAG ${wcagCriteria} criteria`,
        wcagReference: `WCAG ${wcagCriteria}`,
        severity: 'warning',
        impactScore: 5,
      };
    }
  }

  /**
   * Check if an issue is a duplicate of existing issues using AI-powered similarity analysis
   */
  async checkDuplicate(
    newIssue: {
      issueType: string;
      element: string;
      description: string;
      pageUrl: string;
    },
    existingIssues: Array<{
      id: string;
      issueType: string;
      element: string;
      description: string;
      pageUrl: string;
    }>
  ): Promise<DeduplicationResult> {
    if (existingIssues.length === 0) {
      return {
        isDuplicate: false,
        confidence: 1,
        reason: 'No existing issues to compare',
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an accessibility testing expert. Determine if a new accessibility issue is a duplicate of existing issues. Consider issue type, element selector, and description. Issues affecting the same element type across different pages may be duplicates.`
          },
          {
            role: 'user',
            content: `New Issue:
- Type: ${newIssue.issueType}
- Element: ${newIssue.element}
- Description: ${newIssue.description}
- Page: ${newIssue.pageUrl}

Existing Issues:
${existingIssues.map((issue, i) => `${i + 1}. [ID: ${issue.id}] Type: ${issue.issueType}, Element: ${issue.element}, Page: ${issue.pageUrl}`).join('\n')}

Is the new issue a duplicate? Respond with JSON:
{
  "isDuplicate": true/false,
  "similarIssueId": "id of most similar issue if duplicate",
  "confidence": 0-1 score,
  "reason": "brief explanation"
}`
          }
        ],
        temperature: 0.2,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content);
        return {
          isDuplicate: parsed.isDuplicate || false,
          similarIssueId: parsed.similarIssueId,
          confidence: parsed.confidence || 0,
          reason: parsed.reason || 'Analysis completed',
        };
      } catch {
        return {
          isDuplicate: false,
          confidence: 0,
          reason: 'Could not parse AI response',
        };
      }
    } catch (error) {
      console.error('Deduplication error:', error);
      return {
        isDuplicate: false,
        confidence: 0,
        reason: 'AI analysis failed',
      };
    }
  }

  /**
   * Generate keyboard navigation insights for a page
   */
  async analyzeKeyboardNavigation(
    pageUrl: string,
    interactiveElements: string[]
  ): Promise<{
    tabOrder: string[];
    issues: Array<{ element: string; issue: string; suggestion: string }>;
    score: number;
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a keyboard accessibility expert. Analyze keyboard navigation patterns and identify issues with tab order, focus management, and keyboard shortcuts.`
          },
          {
            role: 'user',
            content: `Analyze keyboard navigation for page: ${pageUrl}

Interactive elements found: ${interactiveElements.join(', ')}

Provide:
1. Recommended tab order
2. Potential keyboard navigation issues
3. Keyboard accessibility score (0-100)

Format as JSON with keys: tabOrder (array), issues (array of {element, issue, suggestion}), score (number)`
          }
        ],
        temperature: 0.3,
        max_tokens: 600,
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content);
        return {
          tabOrder: parsed.tabOrder || interactiveElements,
          issues: parsed.issues || [],
          score: parsed.score || 70,
        };
      } catch {
        return {
          tabOrder: interactiveElements,
          issues: [],
          score: 70,
        };
      }
    } catch (error) {
      console.error('Keyboard navigation analysis error:', error);
      return {
        tabOrder: interactiveElements,
        issues: [],
        score: 70,
      };
    }
  }
}

export const aiAnalyzer = new AIAnalyzer();
