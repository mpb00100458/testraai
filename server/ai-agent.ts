import OpenAI from "openai";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { getToolsFromExternalServers, callExternalTool } from "./mcpClient";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

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

interface ExternalToolInfo {
  serverId: string;
  serverName: string;
  tool: Tool;
}

export async function processAIAgentMessage(
  userMessage: string,
  userId: string,
  conversationId: string
): Promise<AIAgentResponse> {
  try {
    // Check if OpenAI API key is configured
    const hasValidApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY &&
                           !process.env.AI_INTEGRATIONS_OPENAI_API_KEY.includes('your-openai-api-key');

    // Demo mode: If no valid API key, provide helpful response
    if (!hasValidApiKey) {
      console.log('[AI Agent] Running in DEMO mode - No valid OpenAI API key configured');

      // Check if user is requesting a scan
      const scanUrlMatch = userMessage.match(/(?:scan|test|check|audit)\s+(?:https?:\/\/)?([^\s]+)/i);

      if (scanUrlMatch) {
        return {
          content: `⚠️ **Demo Mode - OpenAI API Key Required**

I can see you want to scan a website, but the AI Agent requires an OpenAI API key to function.

**To enable the AI Agent:**

1. Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your \`.env\` file:
   \`\`\`
   AI_INTEGRATIONS_OPENAI_API_KEY=sk-proj-your-actual-key-here
   \`\`\`
3. Restart the server: \`npm run dev\`

**Cost:** The AI Agent uses GPT-4o-mini which costs ~$0.0001-$0.0005 per scan (less than a penny). New accounts get $5 in free credits!

**Alternative:** You can still use TestraAI's manual scanning features without the AI Agent. Check the documentation for more details.

📖 See \`SETUP_OPENAI.md\` for detailed setup instructions.`,
          messageType: 'text'
        };
      }

      return {
        content: `👋 **Welcome to Helena Cruz (Demo Mode)**

The AI Agent is currently running in demo mode because no OpenAI API key is configured.

**What I can help you with (when configured):**
- 🔍 Scan websites for accessibility issues
- 📊 Generate WCAG compliance reports
- 🤖 Natural language testing commands
- 📈 Track accessibility improvements

**To enable full functionality:**
1. Get an OpenAI API key from https://platform.openai.com/api-keys
2. Add it to your \`.env\` file
3. Restart the server

Try saying: "Scan https://example.com" (after setup)

📖 See \`SETUP_OPENAI.md\` for detailed instructions.`,
        messageType: 'text'
      };
    }

    // Get conversation history for context
    const messages = await storage.getChatMessages(conversationId);
    
    // Fetch external MCP servers and their tools
    const externalServers = await storage.getExternalMcpServers(userId);
    const enabledServers = externalServers.filter(s => s.enabled);
    
    let externalTools: ExternalToolInfo[] = [];
    let externalToolsDescription = '';
    
    if (enabledServers.length > 0) {
      console.log(`[AI Agent] Fetching tools from ${enabledServers.length} external MCP servers...`);
      const toolsByServer = await getToolsFromExternalServers(enabledServers);
      
      // Build list of external tools
      toolsByServer.forEach((tools, serverId) => {
        const server = enabledServers.find(s => s.id === serverId);
        if (server) {
          tools.forEach(tool => {
            externalTools.push({
              serverId: server.id,
              serverName: server.name,
              tool
            });
          });
        }
      });

      // Add tools to system prompt
      if (externalTools.length > 0) {
        externalToolsDescription = `\n\nExternal Tools Available:\n` +
          externalTools.map(t => 
            `- ${t.tool.name} (from ${t.serverName}): ${t.tool.description}`
          ).join('\n') +
          `\n\nIf the user asks to use any of these tools, mention that you can help them and ask for the required parameters.`;
      }
    }
    
    // Check if message contains a URL to scan
    // Match URLs with or without protocol (http://, https://, or just domain.com)
    const urlMatch = userMessage.match(/((?:https?:\/\/)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(?:\/[^\s]*)?)/);

    console.log('[AI Agent] Processing message:', userMessage);
    console.log('[AI Agent] URL match result:', urlMatch);
    
    // Build OpenAI messages
    const openAIMessages: any[] = [
      {
        role: "system",
        content: `You are Helena Cruz, an AI accessibility testing assistant. You help users scan websites for WCAG 2.1 A/AA compliance issues.

Your capabilities:
1. Scan websites for accessibility issues when users provide URLs
2. Show results from previous scans when users ask about them
3. Explain WCAG guidelines and accessibility best practices
4. Help prioritize and fix accessibility issues
5. Provide actionable recommendations${externalToolsDescription}

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

    // Convert external MCP tools to OpenAI function format and create mapping
    const toolMapping = new Map<string, ExternalToolInfo>();
    const openaiTools = externalTools.map(t => {
      const sanitizedFunctionName = `${t.serverName}__${t.tool.name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      toolMapping.set(sanitizedFunctionName, t);
      
      return {
        type: "function" as const,
        function: {
          name: sanitizedFunctionName,
          description: `[From ${t.serverName}] ${t.tool.description}`,
          parameters: t.tool.inputSchema || { type: "object", properties: {} }
        }
      };
    });

    // Get AI response with function calling support
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openAIMessages,
      max_completion_tokens: 8192,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      tool_choice: openaiTools.length > 0 ? "auto" : undefined,
    });

    const responseMessage = completion.choices[0]?.message;
    let aiResponse = responseMessage?.content || "I'm sorry, I couldn't process that request.";

    // Handle tool calls if present
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      console.log(`[AI Agent] AI wants to call ${responseMessage.tool_calls.length} external tools`);
      
      const toolResults: string[] = [];
      
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        
        const functionName = (toolCall as any).function.name;
        const args = JSON.parse((toolCall as any).function.arguments);
        
        // Look up the external tool using the mapping
        const externalTool = toolMapping.get(functionName);
        
        if (externalTool) {
          const server = enabledServers.find(s => s.id === externalTool.serverId);
          if (server) {
            try {
              console.log(`[AI Agent] Calling external tool ${externalTool.tool.name} on ${server.name}`);
              const result = await callExternalTool(server, externalTool.tool.name, args);
              const resultText = JSON.stringify(result, null, 2);
              toolResults.push(`✅ ${externalTool.tool.name} from ${server.name}:\n${resultText}`);
            } catch (error) {
              console.error(`[AI Agent] Error calling external tool:`, error);
              toolResults.push(`❌ ${externalTool.tool.name} from ${server.name}: Error - ${error instanceof Error ? error.message : String(error)}`);
            }
          } else {
            console.error(`[AI Agent] Server not found for tool ${externalTool.tool.name}`);
            toolResults.push(`❌ ${externalTool.tool.name}: Server not found`);
          }
        } else {
          console.error(`[AI Agent] Unknown function called: ${functionName}`);
          toolResults.push(`❌ Unknown tool: ${functionName}`);
        }
      }
      
      // If tools were called, append results to the response
      if (toolResults.length > 0) {
        aiResponse += `\n\n**External Tool Results:**\n${toolResults.join('\n\n')}`;
      }
    }

    // If user provided a URL, check if they want previous results or a new scan
    if (urlMatch) {
      let url = urlMatch[1];

      // Ensure URL has a protocol (default to https://)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      // Detect if user is asking about PREVIOUS/EXISTING results
      const askingForPrevious = /\b(previous|last|earlier|existing|show\s+(me\s+)?(the\s+)?results?|what\s+(were|are)\s+the\s+results?|show\s+me\s+the\s+(scan|test|report))\b/i.test(userMessage);

      // Detect if user wants a NEW scan
      const wantNewScan = /\b(scan|test|check|new\s+scan|re-?scan|analyze|audit|run\s+(a\s+)?scan)\b/i.test(userMessage);

      console.log(`[AI Agent] URL detected: ${url}`);
      console.log(`[AI Agent] askingForPrevious: ${askingForPrevious}`);
      console.log(`[AI Agent] wantNewScan: ${wantNewScan}`);
      
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

        console.log(`[AI Agent] Found existing estate: ${existingEstate?.id}, existing scan: ${existingScan?.id}`);

        // If user is asking for previous results and we have them, return them
        if (askingForPrevious && existingScan && existingEstate) {
          console.log(`[AI Agent] ✅ Showing previous scan results for ${url}`);

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
          console.log(`[AI Agent] ✅ Starting NEW scan for ${url} (wantNewScan: ${wantNewScan}, !existingScan: ${!existingScan})`);
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
