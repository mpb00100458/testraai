import OpenAI from "openai";
import { storage } from "./storage";
import { nanoid } from "nanoid";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

interface AIAgentResponse {
  content: string;
  messageType?: 'text' | 'scan_result' | 'scan_trigger';
  metadata?: {
    scanRunId?: string;
    estateId?: string;
    projectId?: string;
  };
}

export async function processAIAgentMessage(
  userMessage: string,
  userId: string,
  conversationId: string
): Promise<AIAgentResponse> {
  try {
    // Get conversation history for context
    const messages = await storage.getChatMessages(conversationId);
    
    // Check if message contains a URL to scan
    const urlMatch = userMessage.match(/(https?:\/\/[^\s]+)/);
    
    // Build OpenAI messages
    const openAIMessages: any[] = [
      {
        role: "system",
        content: `You are an AI accessibility testing assistant for TestraAI. You help users scan websites for WCAG 2.1 A/AA compliance issues.

Your capabilities:
1. Scan websites for accessibility issues when users provide URLs
2. Explain WCAG guidelines and accessibility best practices
3. Help prioritize and fix accessibility issues
4. Provide actionable recommendations

When a user provides a URL to scan:
- Confirm you will scan it
- Mention it will check WCAG 2.1 Level A/AA compliance
- Let them know they'll see live progress

When discussing accessibility:
- Be clear and actionable
- Reference specific WCAG criteria when relevant
- Prioritize critical issues first

Keep responses concise and helpful.`
      }
    ];

    // Add conversation history (last 10 messages for context)
    const recentMessages = messages.slice(-10);
    recentMessages.forEach(msg => {
      if (msg.role !== 'system') {
        openAIMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Add current message
    openAIMessages.push({
      role: "user",
      content: userMessage
    });

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
      max_completion_tokens: 8192,
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that request.";

    // If user provided a URL, trigger a scan
    if (urlMatch) {
      const url = urlMatch[1];
      
      try {
        // Get user's first organization (or create one if they don't have any)
        const orgs = await storage.getOrganizationsByUserId(userId);
        let orgId = orgs[0]?.id;
        
        if (!orgId) {
          // Create a default organization for AI scans
          const newOrg = await storage.createOrganization({
            name: "AI Agent Scans",
            slug: `ai-scans-${nanoid(8)}`,
          }, userId);
          orgId = newOrg.id;
        }

        // Get or create "AI Scans" project
        const projects = await storage.getProjectsByOrgId(orgId);
        let aiProject = projects.find(p => p.name === "AI Agent Scans");
        
        if (!aiProject) {
          aiProject = await storage.createProject({
            organizationId: orgId,
            name: "AI Agent Scans",
            description: "Automated scans triggered by AI Agent",
          });
        }

        // Create estate for this URL
        const estate = await storage.createEstate({
          projectId: aiProject.id,
          baseUrl: url,
          name: `Scan: ${new URL(url).hostname}`,
          crawlBudget: 1, // Single page scan for AI agent
        });

        // Create scan run
        const scanRun = await storage.createScanRun({
          estateId: estate.id,
          status: 'running',
        });

        // Trigger the actual scan asynchronously (don't wait for it)
        import('./agents/realScanAgent').then(async ({ RealScanAgent }) => {
          try {
            const agent = new RealScanAgent();
            await agent.runScan(estate.id);
          } catch (error) {
            console.error('Error running accessibility scan:', error);
            await storage.updateScanRunStatus(scanRun.id, 'failed');
          }
        });

        return {
          content: `${aiResponse}\n\n🔍 I've started scanning ${url} for WCAG 2.1 A/AA compliance. You can view the live progress and results below!`,
          messageType: 'scan_trigger',
          metadata: {
            scanRunId: scanRun.id,
            estateId: estate.id,
            projectId: aiProject.id,
          }
        };
      } catch (scanError) {
        console.error('Error triggering scan:', scanError);
        return {
          content: `${aiResponse}\n\n⚠️ I encountered an error trying to scan that URL. Please make sure it's accessible and try again.`,
          messageType: 'text',
        };
      }
    }

    // Regular chat response
    return {
      content: aiResponse,
      messageType: 'text',
    };
  } catch (error) {
    console.error('Error in AI agent:', error);
    return {
      content: "I apologize, but I encountered an error processing your request. Please try again.",
      messageType: 'text',
    };
  }
}
