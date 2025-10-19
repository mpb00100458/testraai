/**
 * Simple HTTP file server for downloading scan videos and screenshots
 * Runs on localhost:3456 alongside the MCP stdio transport
 */
export declare class FileServer {
    private server;
    private isRunning;
    start(): Promise<void>;
    stop(): Promise<void>;
    getDownloadUrl(fileType: 'videos' | 'screenshots' | 'reports', filename: string): string;
    isServerRunning(): boolean;
}
export declare const fileServer: FileServer;
