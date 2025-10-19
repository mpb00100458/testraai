/**
 * Simple HTTP file server for downloading scan videos and screenshots
 * Runs on localhost:3456 alongside the MCP stdio transport
 */
import http from 'http';
import { readFile, stat } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
const PORT = 3456;
const REPORTS_DIR = path.join(process.env.HOME || '/home/runner', 'mcp-accessibility-reports');
export class FileServer {
    server = null;
    isRunning = false;
    async start() {
        if (this.isRunning) {
            console.error('[FileServer] Already running on port', PORT);
            return;
        }
        this.server = http.createServer(async (req, res) => {
            try {
                // Set CORS headers for browser access
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }
                if (req.method !== 'GET') {
                    res.writeHead(405, { 'Content-Type': 'text/plain' });
                    res.end('Method not allowed');
                    return;
                }
                const url = new URL(req.url || '/', `http://localhost:${PORT}`);
                // Root endpoint - show available files
                if (url.pathname === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
            <html>
              <head><title>MCP Accessibility Reports</title></head>
              <body style="font-family: sans-serif; max-width: 800px; margin: 50px auto;">
                <h1>🎬 MCP Accessibility Reports File Server</h1>
                <p>Server running on <code>http://localhost:${PORT}</code></p>
                <h2>Download URLs:</h2>
                <ul>
                  <li>Videos: <code>http://localhost:${PORT}/videos/scan-TIMESTAMP.webm</code></li>
                  <li>Screenshots: <code>http://localhost:${PORT}/screenshots/scan-TIMESTAMP.png</code></li>
                  <li>Reports: <code>http://localhost:${PORT}/reports/accessibility-scan-TIMESTAMP.xlsx</code></li>
                </ul>
                <p>Files are served from: <code>${REPORTS_DIR}</code></p>
              </body>
            </html>
          `);
                    return;
                }
                // Parse file type and filename from URL
                const pathParts = url.pathname.split('/').filter(p => p);
                if (pathParts.length !== 2) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid URL format. Use: /videos/filename.webm or /screenshots/filename.png or /reports/filename.xlsx');
                    return;
                }
                const [fileType, filename] = pathParts;
                // Validate file type
                const validTypes = ['videos', 'screenshots', 'reports'];
                if (!validTypes.includes(fileType)) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end(`Invalid file type. Must be one of: ${validTypes.join(', ')}`);
                    return;
                }
                // Construct file path
                let filePath;
                if (fileType === 'reports') {
                    filePath = path.join(REPORTS_DIR, filename);
                }
                else {
                    filePath = path.join(REPORTS_DIR, fileType, filename);
                }
                // Security: ensure file is within REPORTS_DIR
                const normalizedPath = path.normalize(filePath);
                if (!normalizedPath.startsWith(REPORTS_DIR)) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Access denied');
                    return;
                }
                // Check if file exists
                if (!existsSync(filePath)) {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end(`File not found: ${filename}`);
                    return;
                }
                // Get file stats
                const stats = await stat(filePath);
                // Determine content type
                const ext = path.extname(filename).toLowerCase();
                let contentType = 'application/octet-stream';
                if (ext === '.webm')
                    contentType = 'video/webm';
                else if (ext === '.png')
                    contentType = 'image/png';
                else if (ext === '.xlsx')
                    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                else if (ext === '.json')
                    contentType = 'application/json';
                else if (ext === '.md')
                    contentType = 'text/markdown';
                // Set headers
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': stats.size,
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Cache-Control': 'no-cache'
                });
                // Stream file
                const fileContent = await readFile(filePath);
                res.end(fileContent);
                console.error(`[FileServer] ✅ Served: ${fileType}/${filename} (${Math.round(stats.size / 1024)}KB)`);
            }
            catch (error) {
                console.error('[FileServer] Error:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
            }
        });
        this.server.listen(PORT, 'localhost', () => {
            this.isRunning = true;
            console.error(`[FileServer] 🚀 Running on http://localhost:${PORT}`);
            console.error(`[FileServer] 📁 Serving files from: ${REPORTS_DIR}`);
        });
        this.server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`[FileServer] ⚠️  Port ${PORT} already in use - file downloads may not work`);
            }
            else {
                console.error('[FileServer] Error:', error);
            }
        });
    }
    async stop() {
        if (this.server && this.isRunning) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.isRunning = false;
                    console.error('[FileServer] Stopped');
                    resolve();
                });
            });
        }
    }
    getDownloadUrl(fileType, filename) {
        return `http://localhost:${PORT}/${fileType}/${filename}`;
    }
    isServerRunning() {
        return this.isRunning;
    }
}
export const fileServer = new FileServer();
