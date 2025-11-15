#!/usr/bin/env node

/**
 * Accessibility scanner - Excel report only
 */

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { generateExcelReport, ExportData } from './exportUtils.js';

async function scanForExcel(url: string) {
  console.log(`🔍 Scanning ${url} for accessibility issues...\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Loading page...');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('🔎 Running accessibility analysis...');
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa', 'best-practice'])
      .analyze();

    const violations = axeResults.violations;
    const passes = axeResults.passes;

    const summary = {
      url,
      wcagLevel: 'AA',
      timestamp: new Date().toISOString(),
      violations: violations.length,
      passes: passes.length,
      critical: violations.filter((v: any) => v.impact === 'critical').length,
      serious: violations.filter((v: any) => v.impact === 'serious').length,
      moderate: violations.filter((v: any) => v.impact === 'moderate').length,
      minor: violations.filter((v: any) => v.impact === 'minor').length,
    };

    const allViolations = violations.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.length,
      exampleHtml: v.nodes[0]?.html || 'N/A',
      selector: v.nodes[0]?.target?.join(', ') || 'N/A'
    }));

    await browser.close();

    console.log('📊 Generating Excel report...\n');

    const exportData: ExportData = {
      summary,
      violations: allViolations
    };

    const excelPath = await generateExcelReport(exportData);

    console.log('='.repeat(70));
    console.log('✅ EXCEL REPORT GENERATED');
    console.log('='.repeat(70) + '\n');
    console.log(`📊 Excel File: ${excelPath}\n`);
    console.log(`📁 Location: ~/mcp-accessibility-reports/\n`);

  } catch (error) {
    await browser.close();
    throw error;
  }
}

// Run scan
const url = process.argv[2] || 'https://three.ie';
scanForExcel(url).catch(console.error);

