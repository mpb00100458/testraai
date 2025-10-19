/**
 * Export utilities for MCP server
 * Handles Excel, JSON, and Markdown report generation
 */
export declare function ensureOutputDir(): Promise<string>;
export declare function ensureVideosDir(): Promise<string>;
export declare function ensureScreenshotsDir(): Promise<string>;
interface ViolationData {
    id: string;
    impact: string;
    description: string;
    help: string;
    helpUrl?: string;
    tags: string[];
    nodes: number;
    exampleHtml: string;
    selector: string;
}
interface ScanSummary {
    url: string;
    wcagLevel: string;
    timestamp: string;
    violations: number;
    passes: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
}
export interface ExportData {
    summary: ScanSummary;
    violations: ViolationData[];
}
/**
 * Generate Excel report with comprehensive accessibility data
 */
export declare function generateExcelReport(data: ExportData): Promise<string>;
/**
 * Generate JSON report
 */
export declare function generateJsonReport(data: ExportData): Promise<string>;
/**
 * Generate Markdown report
 */
export declare function generateMarkdownReport(data: ExportData, reportText: string): Promise<string>;
export {};
