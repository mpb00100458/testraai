/**
 * Export utilities for MCP server
 * Handles Excel, JSON, and Markdown report generation
 */

import ExcelJS from 'exceljs';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const OUTPUT_DIR = path.join(process.env.HOME || '/home/runner', 'mcp-accessibility-reports');
const VIDEOS_DIR = path.join(OUTPUT_DIR, 'videos');
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'screenshots');

// Ensure output directory exists
export async function ensureOutputDir() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
  return OUTPUT_DIR;
}

// Ensure videos directory exists
export async function ensureVideosDir() {
  if (!existsSync(VIDEOS_DIR)) {
    await mkdir(VIDEOS_DIR, { recursive: true });
  }
  return VIDEOS_DIR;
}

// Ensure screenshots directory exists
export async function ensureScreenshotsDir() {
  if (!existsSync(SCREENSHOTS_DIR)) {
    await mkdir(SCREENSHOTS_DIR, { recursive: true });
  }
  return SCREENSHOTS_DIR;
}

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
export async function generateExcelReport(data: ExportData): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 50 }
  ];

  summarySheet.addRows([
    { metric: 'URL Scanned', value: data.summary.url },
    { metric: 'WCAG Level', value: data.summary.wcagLevel },
    { metric: 'Scan Timestamp', value: data.summary.timestamp },
    { metric: '', value: '' },
    { metric: 'Total Violations', value: data.summary.violations },
    { metric: 'Passed Checks', value: data.summary.passes },
    { metric: '', value: '' },
    { metric: '🔴 Critical Issues', value: data.summary.critical },
    { metric: '🟠 Serious Issues', value: data.summary.serious },
    { metric: '🟡 Moderate Issues', value: data.summary.moderate },
    { metric: '🔵 Minor Issues', value: data.summary.minor },
  ]);

  // Style header row
  summarySheet.getRow(1).font = { bold: true, size: 12 };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Violations Sheet
  if (data.violations.length > 0) {
    const violationsSheet = workbook.addWorksheet('Violations');
    violationsSheet.columns = [
      { header: 'Rule ID', key: 'id', width: 25 },
      { header: 'Impact', key: 'impact', width: 12 },
      { header: 'Issue', key: 'help', width: 40 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Affected Elements', key: 'nodes', width: 18 },
      { header: 'Selector', key: 'selector', width: 30 },
      { header: 'WCAG Tags', key: 'tags', width: 30 },
      { header: 'Documentation', key: 'helpUrl', width: 50 }
    ];

    data.violations.forEach(v => {
      violationsSheet.addRow({
        id: v.id,
        impact: v.impact?.toUpperCase() || 'UNKNOWN',
        help: v.help,
        description: v.description,
        nodes: v.nodes,
        selector: v.selector,
        tags: v.tags.filter(t => t.startsWith('wcag')).join(', '),
        helpUrl: v.helpUrl || 'N/A'
      });
    });

    // Style header
    violationsSheet.getRow(1).font = { bold: true, size: 12 };
    violationsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };
    violationsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Color code by impact
    for (let i = 2; i <= violationsSheet.rowCount; i++) {
      const row = violationsSheet.getRow(i);
      const impact = row.getCell(2).value?.toString().toLowerCase();
      
      let color = 'FFFFFFFF'; // Default white
      if (impact === 'critical') color = 'FFFECACA'; // Light red
      else if (impact === 'serious') color = 'FFFED7AA'; // Light orange
      else if (impact === 'moderate') color = 'FFFEF3C7'; // Light yellow
      else if (impact === 'minor') color = 'FFDBEAFE'; // Light blue

      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: color }
        };
      });
    }
  }

  // Save file
  await ensureOutputDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `accessibility-scan-${timestamp}.xlsx`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  await workbook.xlsx.writeFile(filepath);
  return filepath;
}

/**
 * Generate JSON report
 */
export async function generateJsonReport(data: ExportData): Promise<string> {
  await ensureOutputDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `accessibility-scan-${timestamp}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);

  const jsonData = {
    summary: data.summary,
    violations: data.violations,
    metadata: {
      generatedBy: 'Accessibility Testing MCP Server',
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    }
  };

  await writeFile(filepath, JSON.stringify(jsonData, null, 2), 'utf-8');
  return filepath;
}

/**
 * Generate Markdown report
 */
export async function generateMarkdownReport(data: ExportData, reportText: string): Promise<string> {
  await ensureOutputDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `accessibility-scan-${timestamp}.md`;
  const filepath = path.join(OUTPUT_DIR, filename);

  await writeFile(filepath, reportText, 'utf-8');
  return filepath;
}
