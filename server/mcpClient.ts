import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { ExternalMcpServer } from "@shared/schema";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface McpServerConnectionResult {
  success: boolean;
  error?: string;
  tools?: Tool[];
  serverInfo?: {
    name: string;
    version: string;
  };
}

export async function testMcpServerConnection(server: ExternalMcpServer): Promise<McpServerConnectionResult> {
  try {
    console.log(`[MCP Client] Testing connection to ${server.name} at ${server.url}`);
    
    if (server.transport !== 'sse') {
      return {
        success: false,
        error: `Transport ${server.transport} not yet supported. Only SSE transport is currently available.`
      };
    }

    // Create SSE client transport
    const transport = new SSEClientTransport(new URL(server.url));
    const client = new Client({
      name: "testraai-client",
      version: "1.0.0",
    }, {
      capabilities: {}
    });

    // Connect with timeout
    const connectTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
    });

    try {
      await Promise.race([
        client.connect(transport),
        connectTimeout
      ]);
    } catch (error) {
      throw new Error(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log(`[MCP Client] Connected to ${server.name}`);

    // List available tools
    const toolsResponse = await client.listTools();
    console.log(`[MCP Client] Found ${toolsResponse.tools.length} tools`);

    // Get server info
    const serverInfo = await client.getServerVersion?.();

    // Close the connection
    await client.close();

    return {
      success: true,
      tools: toolsResponse.tools,
      serverInfo: serverInfo ? {
        name: serverInfo.name || 'Unknown',
        version: serverInfo.version || 'Unknown'
      } : undefined
    };
  } catch (error) {
    console.error(`[MCP Client] Error testing connection to ${server.name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function connectToExternalMcpServer(server: ExternalMcpServer): Promise<Client | null> {
  try {
    if (server.transport !== 'sse') {
      console.error(`[MCP Client] Transport ${server.transport} not yet supported`);
      return null;
    }

    const transport = new SSEClientTransport(new URL(server.url));
    const client = new Client({
      name: "testraai-client",
      version: "1.0.0",
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    console.log(`[MCP Client] Connected to external server: ${server.name}`);
    return client;
  } catch (error) {
    console.error(`[MCP Client] Failed to connect to ${server.name}:`, error);
    return null;
  }
}

export async function getToolsFromExternalServers(servers: ExternalMcpServer[]): Promise<Map<string, Tool[]>> {
  const toolsByServer = new Map<string, Tool[]>();

  for (const server of servers) {
    if (!server.enabled) {
      continue;
    }

    try {
      const client = await connectToExternalMcpServer(server);
      if (!client) {
        continue;
      }

      const toolsResponse = await client.listTools();
      toolsByServer.set(server.id, toolsResponse.tools);
      
      console.log(`[MCP Client] Retrieved ${toolsResponse.tools.length} tools from ${server.name}`);
      
      await client.close();
    } catch (error) {
      console.error(`[MCP Client] Error getting tools from ${server.name}:`, error);
    }
  }

  return toolsByServer;
}

export async function callExternalTool(
  server: ExternalMcpServer,
  toolName: string,
  args: any
): Promise<any> {
  const client = await connectToExternalMcpServer(server);
  if (!client) {
    throw new Error(`Failed to connect to ${server.name}`);
  }

  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    await client.close();
    return result;
  } catch (error) {
    await client.close();
    throw error;
  }
}
