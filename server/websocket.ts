import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';
import type { IncomingMessage } from 'http';
import { db } from './db';
import { sql } from 'drizzle-orm';

interface ScanProgressMessage {
  type: 'scan_start' | 'page_discovered' | 'page_testing' | 'page_complete' | 'issue_found' | 'scan_complete' | 'scan_error';
  estateId: string;
  data?: any;
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: async ({ req }: { req: IncomingMessage }) => {
        // Verify session cookie exists
        const cookie = req.headers.cookie;
        if (!cookie) {
          console.log('WebSocket rejected: No cookie');
          return false;
        }
        return true;
      }
    });

    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
      console.log('WebSocket client connected');

      // Extract user from session
      const userId = await this.extractUserFromSession(req);
      if (!userId) {
        console.log('WebSocket rejected: No valid session');
        ws.close(1008, 'Unauthorized');
        return;
      }

      ws.userId = userId;

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.type === 'subscribe' && data.estateId) {
            console.log(`[WS] Subscribe request: userId=${ws.userId}, estateId=${data.estateId}`);
            
            // Verify user has access to this estate
            const hasAccess = await this.verifyEstateAccess(ws.userId!, data.estateId);
            console.log(`[WS] Access check result: ${hasAccess}`);
            
            if (!hasAccess) {
              console.log(`[WS] Access denied to estate ${data.estateId} for user ${ws.userId}`);
              ws.send(JSON.stringify({ type: 'error', message: 'Access denied to this estate' }));
              return;
            }

            // Subscribe client to estate updates
            if (!this.clients.has(data.estateId)) {
              this.clients.set(data.estateId, new Set());
            }
            this.clients.get(data.estateId)!.add(ws);
            console.log(`[WS] Client subscribed successfully! Estate: ${data.estateId}, Total clients: ${this.clients.get(data.estateId)!.size}`);
            
            // Send confirmation
            ws.send(JSON.stringify({ type: 'subscribed', estateId: data.estateId }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        // Remove client from all subscriptions
        this.clients.forEach((clients) => {
          clients.delete(ws);
        });
        console.log('WebSocket client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  sendToEstate(estateId: string, message: ScanProgressMessage) {
    const clients = this.clients.get(estateId);
    console.log(`[WS] Emit ${message.type} to estate ${estateId}, clients: ${clients?.size || 0}`);
    if (!clients || clients.size === 0) return;

    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Convenience methods for different event types
  emitScanStart(estateId: string, data: any) {
    this.sendToEstate(estateId, { type: 'scan_start', estateId, data });
  }

  emitPageDiscovered(estateId: string, data: { url: string; totalPages: number }) {
    this.sendToEstate(estateId, { type: 'page_discovered', estateId, data });
  }

  emitPageTesting(estateId: string, data: { url: string; pageNumber: number; totalPages: number }) {
    this.sendToEstate(estateId, { type: 'page_testing', estateId, data });
  }

  emitPageComplete(estateId: string, data: { url: string; issuesFound: number; pageNumber: number; totalPages: number; screenshot?: string }) {
    this.sendToEstate(estateId, { type: 'page_complete', estateId, data });
  }

  emitIssueFound(estateId: string, data: { url: string; issue: any }) {
    this.sendToEstate(estateId, { type: 'issue_found', estateId, data });
  }

  emitScanComplete(estateId: string, data: any) {
    this.sendToEstate(estateId, { type: 'scan_complete', estateId, data });
  }

  emitScanError(estateId: string, data: { error: string }) {
    this.sendToEstate(estateId, { type: 'scan_error', estateId, data });
  }

  private async extractUserFromSession(req: IncomingMessage): Promise<string | null> {
    try {
      const cookie = req.headers.cookie;
      if (!cookie) return null;

      // Parse session cookie
      const cookies = cookie.split(';').reduce((acc, c) => {
        const [key, ...v] = c.trim().split('=');
        acc[key] = v.join('=');
        return acc;
      }, {} as Record<string, string>);

      const sessionId = cookies['connect.sid'];
      if (!sessionId) return null;

      // Decode session ID (remove 's:' prefix and signature)
      const decodedSessionId = decodeURIComponent(sessionId).split('.')[0].replace('s:', '');
      
      // Query session store (PostgreSQL)
      const sessionQuery = await db.execute(
        sql`SELECT sess FROM sessions WHERE sid = ${decodedSessionId}`
      );

      if (!sessionQuery.rows.length) return null;

      const sessionData = sessionQuery.rows[0].sess as any;
      // With Passport.js local strategy, user ID is stored directly in passport.user
      const userId = sessionData?.passport?.user;
      
      console.log('[WS] Session data check:', { 
        hasPassport: !!sessionData?.passport, 
        userId: userId 
      });
      
      return userId || null;
    } catch (error) {
      console.error('Error extracting user from session:', error);
      return null;
    }
  }

  private async verifyEstateAccess(userId: string, estateId: string): Promise<boolean> {
    try {
      // Get the estate
      const estate = await storage.getEstate(estateId);
      if (!estate) return false;

      // Get the project
      const project = await storage.getProject(estate.projectId);
      if (!project) return false;

      // Check if user has access to the organization
      const userOrgs = await storage.getOrganizationsByUserId(userId);
      const hasAccess = userOrgs.some(org => org.id === project.organizationId);

      return hasAccess;
    } catch (error) {
      console.error('Error verifying estate access:', error);
      return false;
    }
  }
}

export const wsManager = new WebSocketManager();
