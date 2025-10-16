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
2. Show results from previous scans when users ask about them
3. Explain WCAG guidelines and accessibility best practices
4. Help prioritize and fix accessibility issues
5. Provide actionable recommendations

Important: When a user asks about "previous", "last", "earlier" scan results, or says "show me results for [URL]":
- They want to see EXISTING scan results, not trigger a new scan
- Respond that you'll retrieve the previous scan results
- The system will automatically show the most recent scan for that URL

When a user wants a NEW scan:
- They'll say "scan", "test", "check", "new scan", or "rescan"
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

    // If user provided a URL, check if they want previous results or a new scan
    if (urlMatch) {
      const url = urlMatch[1];
      
      // Detect if user is asking about PREVIOUS/EXISTING results
      const askingForPrevious = /\b(previous|last|earlier|existing|show\s+(me\s+)?(the\s+)?results?|what\s+(were|are)\s+the\s+results?|show\s+me\s+the\s+(scan|test|report))\b/i.test(userMessage);
      
      // Detect if user wants a NEW scan
      const wantNewScan = /\b(scan|test|check|new\s+scan|re-?scan|analyze|audit|run\s+(a\s+)?scan)\b/i.test(userMessage);
      
      try {
        // Get user's organizations
        const orgs = await storage.getOrganizationsByUserId(userId);
        
        // Search for existing estates with this URL across all user's organizations
        let existingEstate = null;
        let existingScan = null;
        
        for (const org of orgs) {
          const projects = await storage.getProjectsByOrgId(org.id);
          for (const project of projects) {
            const estates = await storage.getEstatesByProjectId(project.id);
            const matchingEstate = estates.find(e => e.baseUrl === url);
            
            if (matchingEstate) {
              // Found an existing estate with this URL
              const scans = await storage.getScanRunsByEstateId(matchingEstate.id);
              const completedScans = scans
                .filter(s => s.status === 'completed' && s.startedAt)
                .sort((a, b) => 
                  new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime()
                );
              
              if (completedScans.length > 0) {
                existingEstate = matchingEstate;
                existingScan = completedScans[0]; // Most recent completed scan
                break;
              }
            }
          }
          if (existingEstate) break;
        }

        // If user is asking for previous results and we have them, return them
        if (askingForPrevious && existingScan && existingEstate) {
          console.log(`[AI Agent] Showing previous scan results for ${url}`);
          
          return {
            content: `${aiResponse}\n\n📊 Here are the results from the previous scan of ${url}:`,
            messageType: 'scan_result',
            metadata: {
              estateId: existingEstate.id,
              projectId: existingEstate.projectId,
              scanRunId: existingScan.id,  // Include scan ID for results link
            }
          };
        }

        // If user wants a new scan OR no previous results exist, trigger a new scan
        if (wantNewScan || !existingScan) {
          // Get or create organization
          let orgId = orgs[0]?.id;
          
          if (!orgId) {
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
            crawlBudget: 50,
          });

          console.log(`[AI Agent] Triggering scan for estate ${estate.id}`);

          // Trigger the actual scan asynchronously
          import('./agents/realScanAgent').then(async ({ RealScanAgent }) => {
            try {
              console.log(`[AI Agent] Starting RealScanAgent for estate ${estate.id}`);
              const agent = new RealScanAgent();
              await agent.runScan(estate.id);
              console.log(`[AI Agent] Scan completed for estate ${estate.id}`);
            } catch (error) {
              console.error('[AI Agent] Error running accessibility scan:', error);
            }
          }).catch((importError) => {
            console.error('[AI Agent] Error importing RealScanAgent:', importError);
          });

          return {
            content: `${aiResponse}\n\n🔍 I've started scanning ${url} for WCAG 2.1 A/AA compliance. You can view the live progress and results below!`,
            messageType: 'scan_trigger',
            metadata: {
              estateId: estate.id,
              projectId: aiProject.id,
            }
          };
        }

        // Fallback: show existing results if available
        if (existingScan && existingEstate) {
          return {
            content: `${aiResponse}\n\n📊 I found a previous scan of ${url}. Here are the results:`,
            messageType: 'scan_result',
            metadata: {
              estateId: existingEstate.id,
              projectId: existingEstate.projectId,
              scanRunId: existingScan.id,  // Include scan ID for results link
            }
          };
        }

      } catch (scanError) {
        console.error('Error processing scan request:', scanError);
        return {
          content: `${aiResponse}\n\n⚠️ I encountered an error processing that URL. Please try again.`,
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
