#!/usr/bin/env node

/**
 * Accessibility Testing MCP Server
 * 
 * Provides accessibility scanning tools for AI assistants via Model Context Protocol
 * Powered by TestraAI's Playwright + axe-core scanning engine
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { generateExcelReport, generateJsonReport, generateMarkdownReport, ExportData, ensureVideosDir, ensureScreenshotsDir } from './exportUtils.js';
import { rename, unlink } from 'fs/promises';
import path from 'path';
import { fileServer } from './fileServer.js';

// Define available tools
const TOOLS: Tool[] = [
  {
    name: "scan_url_accessibility",
    description: "Scan a URL for WCAG 2.1 A/AA accessibility violations using Playwright and axe-core. Returns detailed violation reports with severity, impact, and remediation guidance. Supports multiple output formats (text, Excel, JSON, or all). NEW: Visual feedback with live browser window, video recording, and screenshots!",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to scan for accessibility issues (must include http:// or https://)",
        },
        wcagLevel: {
          type: "string",
          enum: ["A", "AA", "AAA"],
          description: "WCAG conformance level to test (default: AA)",
          default: "AA"
        },
        outputFormat: {
          type: "string",
          enum: ["text", "excel", "json", "markdown", "all"],
          description: "Output format: 'text' (default, AI-readable), 'excel' (XLSX file), 'json' (JSON file), 'markdown' (MD file), or 'all' (generates all formats)",
          default: "text"
        },
        saveToFile: {
          type: "boolean",
          description: "Whether to save results to file (default: true for excel/json/markdown, false for text)",
          default: true
        },
        headless: {
          type: "boolean",
          description: "Run browser in headless mode (default: true). Set to false to watch the scan happen live in a browser window!",
          default: true
        },
        recordVideo: {
          type: "boolean",
          description: "Record video of the scan session (default: false). Video saved to ~/mcp-accessibility-reports/videos/",
          default: false
        },
        captureScreenshots: {
          type: "boolean",
          description: "Capture screenshots during scan (default: false). Screenshots saved to ~/mcp-accessibility-reports/screenshots/",
          default: false
        }
      },
      required: ["url"],
    },
  },
  {
    name: "scan_website_accessibility",
    description: "Scan multiple pages of a website for WCAG violations. Crawls up to maxPages, records video of entire scan session, captures screenshots, and generates comprehensive multi-page reports. Perfect for full website audits!",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Starting URL to scan (must include http:// or https://)",
        },
        maxPages: {
          type: "number",
          description: "Maximum number of pages to scan (default: 10, recommended: 5-20)",
          default: 10
        },
        wcagLevel: {
          type: "string",
          enum: ["A", "AA", "AAA"],
          description: "WCAG conformance level to test (default: AA)",
          default: "AA"
        },
        outputFormat: {
          type: "string",
          enum: ["text", "excel", "json", "markdown", "all"],
          description: "Output format (default: text)",
          default: "text"
        },
        recordVideo: {
          type: "boolean",
          description: "Record video of entire scan session (default: true)",
          default: true
        },
        captureScreenshots: {
          type: "boolean",
          description: "Capture screenshot of each page (default: true)",
          default: true
        }
      },
      required: ["url"],
    },
  },
  {
    name: "get_wcag_guidance",
    description: "Get detailed WCAG guidance for a specific success criterion or rule. Provides context, requirements, and remediation strategies.",
    inputSchema: {
      type: "object",
      properties: {
        ruleId: {
          type: "string",
          description: "The WCAG rule ID (e.g., 'color-contrast', 'aria-required-attr', '1.4.3') or success criterion number",
        }
      },
      required: ["ruleId"],
    },
  },
  {
    name: "check_element_accessibility",
    description: "Check accessibility of specific page elements using CSS selectors. Useful for targeted testing of components or sections.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL containing the element to test",
        },
        selector: {
          type: "string",
          description: "CSS selector for the element to test (e.g., '#main-nav', '.login-form')",
        }
      },
      required: ["url", "selector"],
    },
  },
  {
    name: "generate_accessibility_report",
    description: "Generate a comprehensive accessibility report summary from scan results. Provides executive summary, statistics, and prioritized issues.",
    inputSchema: {
      type: "object",
      properties: {
        scanResults: {
          type: "string",
          description: "JSON string of scan results from scan_url_accessibility",
        }
      },
      required: ["scanResults"],
    },
  },
  {
    name: "browser_snapshot",
    description: "Capture the page's accessibility tree - provides AI with structured understanding of all interactive elements, their roles, and names. Far more useful than a screenshot for understanding page structure and accessibility.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the page to snapshot",
        },
        includeHidden: {
          type: "boolean",
          description: "Include hidden elements in the accessibility tree (default: false)",
          default: false
        }
      },
      required: ["url"],
    },
  },
  {
    name: "browser_navigate",
    description: "Navigate the browser to a specified URL. Essential for multi-step workflows and testing user journeys.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to navigate to",
        },
        waitUntil: {
          type: "string",
          enum: ["load", "domcontentloaded", "networkidle"],
          description: "When to consider navigation complete (default: networkidle)",
          default: "networkidle"
        }
      },
      required: ["url"],
    },
  },
  {
    name: "browser_click",
    description: "Click on a specified element on the page. Enables testing of interactive workflows like login, forms, and navigation.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the page (must navigate first)",
        },
        selector: {
          type: "string",
          description: "CSS selector for the element to click (e.g., 'button.submit', '#login-btn')",
        },
        waitForNavigation: {
          type: "boolean",
          description: "Wait for navigation after click (default: false)",
          default: false
        }
      },
      required: ["url", "selector"],
    },
  },
  {
    name: "browser_type",
    description: "Type text into an input field. Essential for testing forms and interactive elements.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the page",
        },
        selector: {
          type: "string",
          description: "CSS selector for the input field",
        },
        text: {
          type: "string",
          description: "Text to type into the field",
        }
      },
      required: ["url", "selector", "text"],
    },
  },
  {
    name: "browser_take_screenshot",
    description: "Take a screenshot of the page with optional element highlighting. Perfect for visual reporting and identifying UI violations.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the page to screenshot",
        },
        fullPage: {
          type: "boolean",
          description: "Capture full scrollable page (default: true)",
          default: true
        },
        highlightSelector: {
          type: "string",
          description: "CSS selector of element to highlight in screenshot (optional)",
        },
        annotate: {
          type: "boolean",
          description: "Add accessibility violation annotations to screenshot (default: false)",
          default: false
        }
      },
      required: ["url"],
    },
  },
  {
    name: "browser_console_messages",
    description: "Capture console messages (errors, warnings, logs) from the page. Useful for debugging JavaScript errors that may affect accessibility.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the page to monitor",
        },
        types: {
          type: "array",
          items: { type: "string", enum: ["error", "warning", "log", "info"] },
          description: "Types of console messages to capture (default: all)",
        }
      },
      required: ["url"],
    },
  },
  {
    name: "browser_network_requests",
    description: "Inspect network requests made by the page. Useful for identifying failed resource loads that may impact accessibility.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the page to monitor",
        },
        filterType: {
          type: "string",
          enum: ["all", "document", "stylesheet", "image", "script", "xhr", "fetch"],
          description: "Filter requests by type (default: all)",
          default: "all"
        }
      },
      required: ["url"],
    },
  },
  {
    name: "browser_screen_click",
    description: "Click at specific screen coordinates. Vision mode for interacting with custom canvas elements or when standard selectors fail.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL of the page",
        },
        x: {
          type: "number",
          description: "X coordinate to click",
        },
        y: {
          type: "number",
          description: "Y coordinate to click",
        }
      },
      required: ["url", "x", "y"],
    },
  },
  {
    name: "scan_page",
    description: "Perform comprehensive accessibility scan with support for all WCAG standards (2.0/2.1/2.2 A/AA/AAA), Section 508, and category-based filtering. This is the core scanning tool with maximum flexibility.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "URL to scan",
        },
        standards: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "wcag2a", "wcag2aa", "wcag2aaa",
              "wcag21a", "wcag21aa", "wcag21aaa",
              "wcag22a", "wcag22aa", "wcag22aaa",
              "section508"
            ]
          },
          description: "WCAG standards to test against (default: wcag2aa, wcag21aa)",
          default: ["wcag2aa", "wcag21aa"]
        },
        categories: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "cat.aria", "cat.color", "cat.forms", "cat.keyboard",
              "cat.language", "cat.name-role-value", "cat.parsing",
              "cat.semantics", "cat.sensory-and-visual-cues",
              "cat.structure", "cat.tables", "cat.text-alternatives",
              "cat.time-and-media"
            ]
          },
          description: "Specific categories to test (optional, filters results)",
        },
        outputFormat: {
          type: "string",
          enum: ["text", "json", "excel", "markdown", "all"],
          description: "Output format (default: text)",
          default: "text"
        }
      },
      required: ["url"],
    },
  }
];

// WCAG guidance database - Comprehensive coverage of common axe-core rules
const WCAG_GUIDANCE: Record<string, any> = {
  // Perceivable - Text Alternatives
  "color-contrast": {
    criterion: "1.4.3 Contrast (Minimum)",
    level: "AA",
    description: "Text must have sufficient contrast ratio against background",
    requirements: "Normal text: 4.5:1, Large text (18pt+): 3:1",
    remediation: "Increase color contrast using darker text or lighter backgrounds. Use browser DevTools contrast checker or WebAIM Contrast Checker. Common fixes: #757575 on white (4.54:1 ✓), #595959 on white (7:1 ✓)"
  },
  "color-contrast-enhanced": {
    criterion: "1.4.6 Contrast (Enhanced)",
    level: "AAA",
    description: "Enhanced contrast for better readability",
    requirements: "Normal text: 7:1, Large text: 4.5:1",
    remediation: "Use even higher contrast ratios for AAA compliance. Example: Black on white (21:1), #595959 on white (7:1)"
  },
  "image-alt": {
    criterion: "1.1.1 Non-text Content",
    level: "A",
    description: "Images must have alternative text",
    requirements: "All <img> elements must have alt attribute with meaningful description, or alt='' for decorative images",
    remediation: "Add descriptive alt text. Good: alt='Team photo from 2024 conference'. Bad: alt='image' or alt='photo'. Decorative: alt=''"
  },
  "input-image-alt": {
    criterion: "1.1.1 Non-text Content",
    level: "A",
    description: "Image buttons must have text alternatives",
    remediation: "Add alt attribute to <input type='image'>. Example: <input type='image' src='submit.png' alt='Submit form'>"
  },
  "area-alt": {
    criterion: "1.1.1 Non-text Content",
    level: "A",
    description: "Image map areas must have text alternatives",
    remediation: "Add alt attribute to <area> elements in image maps."
  },

  // Perceivable - Adaptable
  "label": {
    criterion: "1.3.1 Info and Relationships, 4.1.2 Name, Role, Value",
    level: "A",
    description: "Form inputs must have associated labels",
    requirements: "Every form control must have an associated label element or aria-label",
    remediation: "Use <label for='inputId'> or aria-label='Field name'. Example: <label for='email'>Email</label><input id='email'> or <input aria-label='Email address'>"
  },
  "form-field-multiple-labels": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Form fields should not have multiple labels",
    remediation: "Ensure each form field has only one associated label element."
  },
  "label-title-only": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Labels must use label element or aria-label, not just title attribute",
    remediation: "Replace title attribute with proper <label> or aria-label. Title is only a tooltip."
  },
  "heading-order": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Headings must be in correct hierarchical order",
    requirements: "Don't skip levels (h1→h2→h3). Page should have one h1",
    remediation: "Fix heading hierarchy. Wrong: h1→h3. Right: h1→h2→h3. Use CSS for visual styling, not different heading levels."
  },
  "empty-heading": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Headings must have text content",
    remediation: "Remove empty headings or add meaningful text. Don't use headings for spacing."
  },
  "p-as-heading": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Don't style paragraphs as headings",
    remediation: "Use actual heading elements (h1-h6) instead of styled <p> tags for headings."
  },
  "list": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Lists must be properly structured",
    remediation: "Use <ul>/<ol> for lists, with <li> as direct children only."
  },
  "listitem": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "List items must be inside list containers",
    remediation: "Ensure <li> elements are inside <ul>, <ol>, or <menu>."
  },
  "definition-list": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Definition lists must only contain dt/dd elements",
    remediation: "Only include <dt> and <dd> as children of <dl>."
  },
  "dlitem": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "dt/dd elements must be inside dl",
    remediation: "Wrap <dt> and <dd> elements in a <dl> parent."
  },
  "landmark-one-main": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Document should have one main landmark",
    remediation: "Add <main> element or role='main' to primary content area. Only one main per page."
  },
  "region": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Page content should be in landmarks",
    remediation: "Use semantic HTML5 elements: <header>, <nav>, <main>, <footer>, <aside>, or ARIA landmarks."
  },

  // Perceivable - Distinguishable
  "link-in-text-block": {
    criterion: "1.4.1 Use of Color",
    level: "A",
    description: "Links in text blocks must be distinguishable without color",
    requirements: "Links need underline, 3:1 contrast with surrounding text, or other non-color indicator",
    remediation: "Add text-decoration: underline to links, or ensure 3:1 contrast difference from body text."
  },
  "meta-viewport": {
    criterion: "1.4.4 Resize Text",
    level: "AA",
    description: "Viewport meta tag must not prevent zooming",
    requirements: "Don't use user-scalable=no or maximum-scale=1.0",
    remediation: "Remove or change: <meta name='viewport' content='width=device-width, initial-scale=1.0, user-scalable=yes'>"
  },
  "meta-viewport-large": {
    criterion: "1.4.4 Resize Text",
    level: "AA",
    description: "Viewport must allow text scaling",
    remediation: "Ensure maximum-scale is at least 2.0 or not specified."
  },
  "css-orientation-lock": {
    criterion: "1.3.4 Orientation",
    level: "AA",
    description: "Content must not be locked to single orientation",
    remediation: "Remove CSS that forces landscape or portrait only. Allow both orientations."
  },
  "autocomplete-valid": {
    criterion: "1.3.5 Identify Input Purpose",
    level: "AA",
    description: "Input fields should have appropriate autocomplete attribute",
    requirements: "Use autocomplete for name, email, phone, address, cc fields",
    remediation: "Add autocomplete attribute: <input type='email' autocomplete='email'>, <input type='tel' autocomplete='tel'>"
  },

  // Operable - Keyboard Accessible
  "button": {
    criterion: "2.1.1 Keyboard",
    level: "A",
    description: "Buttons must be keyboard accessible",
    remediation: "Use <button> element or add role='button' with keyboard event handlers (Enter/Space)."
  },
  "link": {
    criterion: "2.1.1 Keyboard",
    level: "A",
    description: "Links must be keyboard accessible",
    remediation: "Use <a href> for links. If using onclick on other elements, add role='link' and keyboard handlers."
  },
  "tabindex": {
    criterion: "2.1.1 Keyboard, 2.4.3 Focus Order",
    level: "A",
    description: "Don't use positive tabindex values",
    requirements: "Use tabindex='0' to add to tab order, '-1' to remove, never positive numbers",
    remediation: "Remove positive tabindex. Use 0 or -1 only. Positive values disrupt natural tab order."
  },
  "focus-order-semantics": {
    criterion: "2.4.3 Focus Order",
    level: "A",
    description: "Focus order should be meaningful",
    remediation: "Ensure tab order matches visual layout. Use flexbox/grid order carefully."
  },

  // Operable - Navigable
  "bypass": {
    criterion: "2.4.1 Bypass Blocks",
    level: "A",
    description: "Provide mechanism to skip repetitive content",
    requirements: "Add 'Skip to main content' link or use proper landmarks",
    remediation: "Add skip link: <a href='#main-content' class='skip-link'>Skip to main content</a> or use <main> landmark."
  },
  "skip-link": {
    criterion: "2.4.1 Bypass Blocks",
    level: "A",
    description: "Skip links must have valid target",
    remediation: "Ensure skip link href points to existing element with matching id."
  },
  "document-title": {
    criterion: "2.4.2 Page Titled",
    level: "A",
    description: "Pages must have descriptive titles",
    requirements: "Every page needs unique, descriptive <title> element",
    remediation: "Add <title> in <head>. Good: 'Contact Us - Acme Corp'. Bad: 'Untitled' or 'Page'."
  },
  "button-name": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "Buttons must have discernible text",
    requirements: "Button needs text content, aria-label, or aria-labelledby",
    remediation: "Add text: <button>Submit</button> or <button aria-label='Close dialog'><X /></button>"
  },
  "link-name": {
    criterion: "4.1.2 Name, Role, Value, 2.4.4 Link Purpose",
    level: "A",
    description: "Links must have discernible text",
    requirements: "Links need text content or aria-label describing destination",
    remediation: "Add meaningful text. Wrong: <a href='#'>Click here</a>. Right: <a href='#'>Download annual report (PDF)</a>"
  },
  "identical-links-same-purpose": {
    criterion: "2.4.4 Link Purpose",
    level: "A",
    description: "Links with same text should go to same destination",
    remediation: "If links have identical text but different destinations, add distinguishing context."
  },
  "focus-visible": {
    criterion: "2.4.7 Focus Visible",
    level: "AA",
    description: "Keyboard focus indicator must be visible",
    requirements: "Don't remove focus outlines without providing custom focus styles",
    remediation: "Remove outline: none or add custom focus styles: button:focus { outline: 2px solid blue; }"
  },
  "target-size": {
    criterion: "2.5.8 Target Size (Minimum)",
    level: "AA",
    description: "Touch targets must be at least 24x24 CSS pixels",
    remediation: "Increase button/link size or add padding. Minimum: 24px × 24px for touch targets."
  },

  // Understandable - Readable
  "html-has-lang": {
    criterion: "3.1.1 Language of Page",
    level: "A",
    description: "HTML element must have a lang attribute",
    requirements: "Specify page language with valid ISO 639-1 code",
    remediation: "Add to <html> tag: <html lang='en'> for English, <html lang='es'> for Spanish, etc."
  },
  "html-lang-valid": {
    criterion: "3.1.1 Language of Page",
    level: "A",
    description: "HTML lang attribute must have valid value",
    remediation: "Use valid ISO 639-1 language code. Common: 'en', 'es', 'fr', 'de', 'ja', 'zh', 'ar'"
  },
  "lang-valid": {
    criterion: "3.1.2 Language of Parts",
    level: "AA",
    description: "lang attribute must have valid value",
    remediation: "Use valid language codes in lang attributes throughout document."
  },

  // Understandable - Input Assistance
  "aria-input-field-name": {
    criterion: "3.3.2 Labels or Instructions",
    level: "A",
    description: "ARIA input fields must have accessible names",
    remediation: "Add aria-label or aria-labelledby to inputs with ARIA roles."
  },

  // Robust - Compatible
  "duplicate-id": {
    criterion: "4.1.1 Parsing",
    level: "A",
    description: "IDs must be unique",
    requirements: "Each id attribute value must be used only once per page",
    remediation: "Find duplicate IDs and make them unique. Common cause: copying/pasting HTML without changing IDs."
  },
  "duplicate-id-active": {
    criterion: "4.1.1 Parsing",
    level: "A",
    description: "IDs of active elements must be unique",
    remediation: "Interactive elements with duplicate IDs confuse assistive technology. Make IDs unique."
  },
  "duplicate-id-aria": {
    criterion: "4.1.1 Parsing",
    level: "A",
    description: "IDs referenced by ARIA must be unique",
    remediation: "Elements referenced by aria-labelledby, aria-describedby must have unique IDs."
  },
  "aria-required-attr": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "ARIA roles must have all required attributes",
    requirements: "Check ARIA spec for required attributes per role",
    remediation: "Add missing ARIA attributes. Example: role='checkbox' requires aria-checked. role='slider' requires aria-valuemin, aria-valuemax, aria-valuenow."
  },
  "aria-roles": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "ARIA role must be valid",
    remediation: "Use valid ARIA 1.2 roles. Common: button, checkbox, dialog, navigation, main, complementary, tabpanel."
  },
  "aria-valid-attr": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "ARIA attributes must be valid",
    remediation: "Check attribute spelling. Common typos: aria-labelled-by → aria-labelledby, aria-describeby → aria-describedby"
  },
  "aria-valid-attr-value": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "ARIA attributes must have valid values",
    requirements: "Boolean attributes need 'true'/'false', IDs must reference existing elements",
    remediation: "Fix invalid values. aria-pressed='yes' → aria-pressed='true', aria-labelledby must reference existing id."
  },
  "aria-allowed-attr": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "ARIA attributes must be allowed for role",
    remediation: "Remove ARIA attributes not supported by the element's role. Check ARIA spec for allowed attributes."
  },
  "aria-hidden-focus": {
    criterion: "4.1.2 Name, Role, Value",
    level: "A",
    description: "aria-hidden elements must not be focusable",
    requirements: "Elements with aria-hidden='true' cannot receive keyboard focus",
    remediation: "Remove aria-hidden='true' from focusable elements, or add tabindex='-1' to prevent focus."
  },
  "aria-live": {
    criterion: "4.1.3 Status Messages",
    level: "AA",
    description: "Status messages should use appropriate ARIA live regions",
    remediation: "Use role='status', role='alert', or aria-live for dynamic status messages."
  },

  // Additional Common Rules
  "table-duplicate-name": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Data tables should not have duplicate names",
    remediation: "Ensure table captions and summaries are unique or properly describe different tables."
  },
  "td-headers-attr": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Table cells using headers attribute must reference valid header cells",
    remediation: "Ensure headers attribute references valid th element IDs."
  },
  "th-has-data-cells": {
    criterion: "1.3.1 Info and Relationships",
    level: "A",
    description: "Table headers must have associated data cells",
    remediation: "Ensure each <th> has corresponding <td> cells in table."
  },
  "label-content-name-mismatch": {
    criterion: "2.5.3 Label in Name",
    level: "A",
    description: "Visible label text must be part of accessible name",
    remediation: "If button shows 'Submit' text, aria-label should include 'Submit'. Don't contradict visible text."
  }
};

class AccessibilityMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "accessibility-testing-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "scan_url_accessibility":
            return await this.scanUrlAccessibility(args as any);
          
          case "scan_website_accessibility":
            return await this.scanWebsiteAccessibility(args as any);
          
          case "get_wcag_guidance":
            return await this.getWcagGuidance(args as any);
          
          case "check_element_accessibility":
            return await this.checkElementAccessibility(args as any);
          
          case "generate_accessibility_report":
            return await this.generateAccessibilityReport(args as any);

          case "browser_snapshot":
            return await this.browserSnapshot(args as any);

          case "browser_navigate":
            return await this.browserNavigate(args as any);

          case "browser_click":
            return await this.browserClick(args as any);

          case "browser_type":
            return await this.browserType(args as any);

          case "browser_take_screenshot":
            return await this.browserTakeScreenshot(args as any);

          case "browser_console_messages":
            return await this.browserConsoleMessages(args as any);

          case "browser_network_requests":
            return await this.browserNetworkRequests(args as any);

          case "browser_screen_click":
            return await this.browserScreenClick(args as any);

          case "scan_page":
            return await this.scanPage(args as any);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async scanUrlAccessibility(args: { 
    url: string; 
    wcagLevel?: string;
    outputFormat?: string;
    saveToFile?: boolean;
    headless?: boolean;
    recordVideo?: boolean;
    captureScreenshots?: boolean;
  }) {
    const { 
      url, 
      wcagLevel = "AA",
      outputFormat = "text",
      saveToFile = outputFormat !== "text",
      headless = true,
      recordVideo = false,
      captureScreenshots = false
    } = args;

    console.error(`[MCP] Scanning ${url} for WCAG ${wcagLevel} violations...`);
    console.error(`[MCP] Output format: ${outputFormat}, Save to file: ${saveToFile}`);
    console.error(`[MCP] Visual: headless=${headless}, video=${recordVideo}, screenshots=${captureScreenshots}`);

    // Prepare video recording if requested
    let videoDir: string | undefined;
    if (recordVideo) {
      videoDir = await ensureVideosDir();
    }

    const browser = await chromium.launch({ 
      headless,
      slowMo: headless ? 0 : 300  // Slow down visible browser for better viewing
    });
    
    const contextOptions: any = {};
    if (recordVideo) {
      contextOptions.recordVideo = {
        dir: videoDir,
        size: { width: 1280, height: 720 }
      };
    }
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    try {
      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Capture "before" screenshot if requested
      let screenshotPaths: string[] = [];
      if (captureScreenshots) {
        const screenshotsDir = await ensureScreenshotsDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const beforePath = path.join(screenshotsDir, `scan-${timestamp}-before.png`);
        await page.screenshot({ path: beforePath, fullPage: true });
        screenshotPaths.push(beforePath);
        console.error(`[MCP] 📸 Screenshot saved: ${beforePath}`);
      }
      
      // Run accessibility analysis
      const axeResults = await new AxeBuilder({ page })
        .withTags([`wcag2${wcagLevel.toLowerCase()}`, 'wcag21aa', 'best-practice'])
        .analyze();

      // Capture "after" screenshot if requested
      if (captureScreenshots) {
        const screenshotsDir = await ensureScreenshotsDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const afterPath = path.join(screenshotsDir, `scan-${timestamp}-after.png`);
        await page.screenshot({ path: afterPath, fullPage: true });
        screenshotPaths.push(afterPath);
        console.error(`[MCP] 📸 Screenshot saved: ${afterPath}`);
      }

      const violations = axeResults.violations;
      const passes = axeResults.passes;

      const summary = {
        url,
        wcagLevel,
        timestamp: new Date().toISOString(),
        violations: violations.length,
        passes: passes.length,
        critical: violations.filter((v: any) => v.impact === 'critical').length,
        serious: violations.filter((v: any) => v.impact === 'serious').length,
        moderate: violations.filter((v: any) => v.impact === 'moderate').length,
        minor: violations.filter((v: any) => v.impact === 'minor').length,
      };

      // Prepare ALL violations for export (not just first 10)
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

      // First 10 for text report
      const detailedViolations = allViolations.slice(0, 10);

      const report = `# Accessibility Scan Report

**URL:** ${url}
**WCAG Level:** ${wcagLevel}
**Scanned:** ${new Date().toISOString()}

## Summary
- ✅ **Passed Checks:** ${summary.passes}
- ❌ **Total Violations:** ${summary.violations}
  - 🔴 Critical: ${summary.critical}
  - 🟠 Serious: ${summary.serious}
  - 🟡 Moderate: ${summary.moderate}
  - 🔵 Minor: ${summary.minor}

## Top Issues (First 10)

${detailedViolations.map((v: any, i: number) => `
### ${i + 1}. ${v.help}

**Impact:** ${v.impact?.toUpperCase() || 'UNKNOWN'}
**Rule ID:** ${v.id}
**WCAG Tags:** ${v.tags.filter((t: string) => t.startsWith('wcag')).join(', ')}

**Description:** ${v.description}

**Affected Elements:** ${v.nodes} instance(s)
**Example:** \`${v.selector}\`

\`\`\`html
${v.exampleHtml}
\`\`\`

**Documentation:** ${v.helpUrl}
`).join('\n---\n')}

${violations.length > 10 ? `\n*Note: Showing 10 of ${violations.length} total violations. Run full scan for complete report.*` : ''}

## Next Steps
1. Fix critical and serious issues first
2. Review moderate issues for user impact
3. Address minor issues for best practices
4. Re-scan after fixes to verify
`;

      // Handle video recording
      let videoPath: string | undefined;
      if (recordVideo) {
        const videoTempPath = await page.video()?.path();
        await page.close();
        await context.close();
        
        if (videoTempPath) {
          // Rename video with proper timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          videoPath = path.join(videoDir!, `scan-${timestamp}.webm`);
          await rename(videoTempPath, videoPath);
          console.error(`[MCP] 🎥 Video saved: ${videoPath}`);
        }
      }

      await browser.close();

      // Generate file exports if requested
      const exportData: ExportData = {
        summary,
        violations: allViolations
      };

      const generatedFiles: string[] = [];
      const visualFiles: { video?: string; screenshots: string[] } = { screenshots: [] };
      let responseText = report;

      // Track visual feedback files
      if (videoPath) {
        visualFiles.video = videoPath;
      }
      if (screenshotPaths.length > 0) {
        visualFiles.screenshots = screenshotPaths;
      }

      if (saveToFile) {
        try {
          if (outputFormat === 'excel' || outputFormat === 'all') {
            const excelPath = await generateExcelReport(exportData);
            generatedFiles.push(excelPath);
            console.error(`[MCP] ✅ Excel report saved: ${excelPath}`);
          }

          if (outputFormat === 'json' || outputFormat === 'all') {
            const jsonPath = await generateJsonReport(exportData);
            generatedFiles.push(jsonPath);
            console.error(`[MCP] ✅ JSON report saved: ${jsonPath}`);
          }

          if (outputFormat === 'markdown' || outputFormat === 'all') {
            const mdPath = await generateMarkdownReport(exportData, report);
            generatedFiles.push(mdPath);
            console.error(`[MCP] ✅ Markdown report saved: ${mdPath}`);
          }

          // Add file paths to response with download URLs
          if (generatedFiles.length > 0) {
            responseText += `\n\n---\n\n## 📁 Generated Report Files\n\n`;
            generatedFiles.forEach((filepath, idx) => {
              const filename = filepath.split('/').pop()!;
              const downloadUrl = fileServer.getDownloadUrl('reports', filename);
              responseText += `${idx + 1}. **${filename}**\n`;
              responseText += `   📥 Download: ${downloadUrl}\n`;
              responseText += `   📁 Path: \`${filepath}\`\n\n`;
            });
            responseText += `\nAll reports saved to: \`${generatedFiles[0].split('/').slice(0, -1).join('/')}/\`\n`;
          }
        } catch (exportError) {
          console.error('[MCP] ⚠️  Error generating file exports:', exportError);
          responseText += `\n\n⚠️ **Warning:** Failed to generate some file exports. Text report is still available above.\n`;
        }
      }

      // Add visual feedback files to response with download URLs
      if (visualFiles.video || visualFiles.screenshots.length > 0) {
        responseText += `\n\n---\n\n## 🎬 Visual Feedback Files\n\n`;
        
        if (visualFiles.video) {
          const filename = visualFiles.video.split('/').pop()!;
          const downloadUrl = fileServer.getDownloadUrl('videos', filename);
          responseText += `**📹 Video Recording:**\n`;
          responseText += `- **${filename}**\n`;
          responseText += `  📥 **Download:** ${downloadUrl}\n`;
          responseText += `  📁 Path: \`${visualFiles.video}\`\n`;
          responseText += `  ⏱️  Duration: ~${Math.ceil((Date.now() - new Date(summary.timestamp).getTime()) / 1000)}s\n\n`;
        }
        
        if (visualFiles.screenshots.length > 0) {
          responseText += `**📸 Screenshots:**\n`;
          visualFiles.screenshots.forEach((screenshot, idx) => {
            const filename = screenshot.split('/').pop()!;
            const downloadUrl = fileServer.getDownloadUrl('screenshots', filename);
            responseText += `${idx + 1}. **${filename}**\n`;
            responseText += `   📥 Download: ${downloadUrl}\n`;
            responseText += `   📁 Path: \`${screenshot}\`\n\n`;
          });
        }

        const baseDir = visualFiles.video 
          ? visualFiles.video.split('/').slice(0, -2).join('/') 
          : visualFiles.screenshots[0].split('/').slice(0, -2).join('/');
        responseText += `All visual files saved to: \`${baseDir}/\`\n`;
        responseText += `\n💡 **Tip:** Click the download links above or open them in your browser!\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      try {
        await page?.close();
        await context?.close();
        await browser?.close();
      } catch (closeError) {
        console.error('[MCP] Error closing browser:', closeError);
      }
      throw error;
    }
  }

  private async scanWebsiteAccessibility(args: {
    url: string;
    maxPages?: number;
    wcagLevel?: string;
    outputFormat?: string;
    recordVideo?: boolean;
    captureScreenshots?: boolean;
  }) {
    const {
      url,
      maxPages = 10,
      wcagLevel = "AA",
      outputFormat = "text",
      recordVideo = true,
      captureScreenshots = true
    } = args;

    console.error(`[MCP] 🌐 Scanning website: ${url} (max ${maxPages} pages)`);
    console.error(`[MCP] WCAG Level: ${wcagLevel}, Video: ${recordVideo}, Screenshots: ${captureScreenshots}`);

    let videoDir: string | undefined;
    let screenshotsDir: string | undefined;
    
    if (recordVideo) videoDir = await ensureVideosDir();
    if (captureScreenshots) screenshotsDir = await ensureScreenshotsDir();

    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const contextOptions: any = { viewport: { width: 1280, height: 720 } };
    if (recordVideo) {
      contextOptions.recordVideo = {
        dir: videoDir,
        size: { width: 1280, height: 720 }
      };
    }
    
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    const visitedUrls = new Set<string>();
    const toVisit: string[] = [url];
    const allResults: any[] = [];
    const baseUrl = new URL(url);
    
    try {
      while (toVisit.length > 0 && visitedUrls.size < maxPages) {
        const currentUrl = toVisit.shift()!;
        if (visitedUrls.has(currentUrl)) continue;
        
        visitedUrls.add(currentUrl);
        console.error(`[MCP] 📄 Scanning page ${visitedUrls.size}/${maxPages}: ${currentUrl}`);
        
        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle', timeout: 30000 });
          
          if (captureScreenshots && screenshotsDir) {
            const timestamp = Date.now();
            const pageNum = visitedUrls.size;
            const screenshotPath = path.join(screenshotsDir, `page-${pageNum}-${timestamp}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.error(`[MCP] 📸 Screenshot: ${screenshotPath}`);
          }
          
          const axeResults = await new AxeBuilder({ page })
            .withTags([`wcag2${wcagLevel.toLowerCase()}`, 'wcag21aa'])
            .analyze();
          
          allResults.push({
            url: currentUrl,
            pageNumber: visitedUrls.size,
            violations: axeResults.violations.length,
            passes: axeResults.passes.length,
            incomplete: axeResults.incomplete.length,
            violationDetails: axeResults.violations.map((v: any) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              help: v.help,
              helpUrl: v.helpUrl,
              tags: v.tags,
              nodes: v.nodes.length,
              exampleHtml: v.nodes[0]?.html || 'N/A',
              selector: v.nodes[0]?.target?.join(', ') || 'N/A'
            }))
          });
          
          if (visitedUrls.size < maxPages) {
            const links = await page.$$eval('a[href]', (anchors) =>
              anchors.map((a) => (a as HTMLAnchorElement).href)
            );
            
            for (const link of links) {
              try {
                const linkUrl = new URL(link);
                if (linkUrl.origin === baseUrl.origin && !linkUrl.hash && !visitedUrls.has(link) && !toVisit.includes(link)) {
                  toVisit.push(link);
                }
              } catch (e) {}
            }
          }
        } catch (pageError) {
          console.error(`[MCP] ⚠️  Error scanning ${currentUrl}:`, pageError);
        }
      }
      
      let videoPath: string | undefined;
      if (recordVideo) {
        const videoTempPath = await page.video()?.path();
        await page.close();
        await context.close();
        
        if (videoTempPath) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          videoPath = path.join(videoDir!, `website-scan-${timestamp}.webm`);
          await rename(videoTempPath, videoPath);
          console.error(`[MCP] 🎥 Video saved: ${videoPath}`);
        }
      }
      
      await browser.close();
      
      const totalViolations = allResults.reduce((sum, r) => sum + r.violations, 0);
      const totalPasses = allResults.reduce((sum, r) => sum + r.passes, 0);
      const allViolations = allResults.flatMap(r => r.violationDetails);
      const criticalCount = allViolations.filter(v => v.impact === 'critical').length;
      const seriousCount = allViolations.filter(v => v.impact === 'serious').length;
      const moderateCount = allViolations.filter(v => v.impact === 'moderate').length;
      const minorCount = allViolations.filter(v => v.impact === 'minor').length;
      
      const violationCounts = new Map<string, number>();
      allViolations.forEach(v => {
        violationCounts.set(v.id, (violationCounts.get(v.id) || 0) + 1);
      });
      
      const topViolations = Array.from(violationCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => {
          const example = allViolations.find(v => v.id === id)!;
          return { id, count, help: example.help, impact: example.impact };
        });
      
      const summary = {
        url,
        wcagLevel,
        timestamp: new Date().toISOString(),
        violations: totalViolations,
        passes: totalPasses,
        critical: criticalCount,
        serious: seriousCount,
        moderate: moderateCount,
        minor: minorCount
      };
      
      const websiteInfo = {
        pagesScanned: visitedUrls.size,
        maxPages
      };
      
      const report = `# Website Accessibility Scan Report

**Starting URL:** ${url}
**Pages Scanned:** ${websiteInfo.pagesScanned} / ${websiteInfo.maxPages}
**WCAG Level:** ${wcagLevel}
**Scanned:** ${new Date().toISOString()}

## Overall Summary
- ✅ **Total Passed Checks:** ${totalPasses}
- ❌ **Total Violations:** ${totalViolations}
  - 🔴 Critical: ${criticalCount}
  - 🟠 Serious: ${seriousCount}
  - 🟡 Moderate: ${moderateCount}
  - 🔵 Minor: ${minorCount}

## Top 10 Most Common Issues

${topViolations.map((v, i) => `${i + 1}. **${v.help}** (${v.count} occurrences)
   - Impact: ${v.impact?.toUpperCase() || 'UNKNOWN'}
   - Rule ID: ${v.id}`).join('\n\n')}

## Page-by-Page Results

${allResults.map(result => `### Page ${result.pageNumber}: ${result.url}
- Violations: ${result.violations}
- Passes: ${result.passes}
- Status: ${result.violations === 0 ? '✅ PASSED' : `❌ ${result.violations} issue(s)`}`).join('\n\n')}

## Recommendations
1. **Critical Priority:** Fix ${criticalCount} critical violations across all pages
2. **High Priority:** Address ${seriousCount} serious violations
3. **Medium Priority:** Resolve ${moderateCount} moderate issues
4. **Low Priority:** ${minorCount} minor issues for best practices
`;

      const exportData: ExportData = { summary, violations: allViolations };
      const generatedFiles: string[] = [];
      let responseText = report;
      
      if (outputFormat === 'excel' || outputFormat === 'all') {
        const excelPath = await generateExcelReport(exportData);
        generatedFiles.push(excelPath);
      }
      if (outputFormat === 'json' || outputFormat === 'all') {
        const jsonPath = await generateJsonReport(exportData);
        generatedFiles.push(jsonPath);
      }
      if (outputFormat === 'markdown' || outputFormat === 'all') {
        const markdownPath = await generateMarkdownReport(exportData, report);
        generatedFiles.push(markdownPath);
      }
      
      if (generatedFiles.length > 0) {
        responseText += `\n\n## 📥 Generated Reports\n\n`;
        generatedFiles.forEach(filePath => {
          const filename = filePath.split('/').pop()!;
          const downloadUrl = fileServer.getDownloadUrl('reports', filename);
          responseText += `- **${filename}**\n  📥 Download: ${downloadUrl}\n  📁 Path: \`${filePath}\`\n\n`;
        });
      }
      
      if (videoPath) {
        const filename = videoPath.split('/').pop()!;
        const downloadUrl = fileServer.getDownloadUrl('videos', filename);
        responseText += `\n## 🎥 Scan Video\n\nWatch the entire scan session:\n- **${filename}**\n  📥 Download: ${downloadUrl}\n  📁 Path: \`${videoPath}\`\n  ⏱️  Duration: ~${websiteInfo.pagesScanned * 5} seconds\n\n`;
      }
      
      responseText += `\n💡 **Tip:** All files saved to \`~/mcp-accessibility-reports/\`\n`;
      
      return {
        content: [{
          type: "text",
          text: responseText
        }]
      };
      
    } catch (error) {
      try {
        await page?.close();
        await context?.close();
        await browser?.close();
      } catch (closeError) {
        console.error('[MCP] Error closing browser:', closeError);
      }
      throw error;
    }
  }

  private async getWcagGuidance(args: { ruleId: string }) {
    const { ruleId } = args;
    const guidance = WCAG_GUIDANCE[ruleId];

    if (!guidance) {
      // Return generic guidance for unknown rules
      return {
        content: [
          {
            type: "text",
            text: `WCAG guidance for "${ruleId}" not found in database. 

Common WCAG rules:
- color-contrast (1.4.3)
- aria-required-attr (4.1.2)
- image-alt (1.1.1)
- label (1.3.1, 4.1.2)
- button-name (4.1.2)
- link-name (2.4.4, 4.1.2)
- html-has-lang (3.1.1)

For detailed guidance, visit: https://www.w3.org/WAI/WCAG21/quickref/`,
          },
        ],
      };
    }

    const report = `# WCAG Guidance: ${ruleId}

**Success Criterion:** ${guidance.criterion}
**Conformance Level:** ${guidance.level}

## Description
${guidance.description}

${guidance.requirements ? `## Requirements\n${guidance.requirements}\n` : ''}

## Remediation
${guidance.remediation}

## Resources
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md)
`;

    return {
      content: [
        {
          type: "text",
          text: report,
        },
      ],
    };
  }

  private async checkElementAccessibility(args: { url: string; selector: string }) {
    const { url, selector } = args;

    console.error(`[MCP] Checking element "${selector}" on ${url}...`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Check if element exists
      const elementExists = await page.$(selector);
      if (!elementExists) {
        await browser.close();
        return {
          content: [
            {
              type: "text",
              text: `❌ Element not found: "${selector}"\n\nThe selector did not match any elements on the page. Please verify the CSS selector is correct.`,
            },
          ],
        };
      }

      // Run axe on specific element
      const axeResults = await new AxeBuilder({ page })
        .include(selector)
        .analyze();

      const violations = axeResults.violations;

      const report = `# Element Accessibility Check

**URL:** ${url}
**Selector:** \`${selector}\`
**Scanned:** ${new Date().toISOString()}

## Results
${violations.length === 0 ? '✅ **No violations found!** This element passes automated accessibility checks.' : `❌ **Found ${violations.length} violation(s)**`}

${violations.length > 0 ? violations.map((v: any, i: number) => `
### ${i + 1}. ${v.help}

**Impact:** ${v.impact?.toUpperCase() || 'UNKNOWN'}
**Rule ID:** ${v.id}

**Description:** ${v.description}

**Fix:** Check the rule documentation at ${v.helpUrl}
`).join('\n---\n') : ''}

${violations.length > 0 ? `\n## Recommendation\nAddress these issues to ensure this element is accessible to all users.` : ''}
`;

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async generateAccessibilityReport(args: { scanResults: string }) {
    const { scanResults } = args;

    try {
      const results = JSON.parse(scanResults);

      const report = `# Accessibility Report Summary

## Executive Summary
This report provides an analysis of accessibility compliance based on automated testing.

**Total Violations:** ${results.violations || 0}
**Conformance Level:** WCAG ${results.wcagLevel || 'AA'}

## Priority Breakdown
${results.critical ? `- 🔴 **Critical:** ${results.critical} (Fix immediately)` : ''}
${results.serious ? `- 🟠 **Serious:** ${results.serious} (Fix soon)` : ''}
${results.moderate ? `- 🟡 **Moderate:** ${results.moderate} (Plan to fix)` : ''}
${results.minor ? `- 🔵 **Minor:** ${results.minor} (Good to fix)` : ''}

## Recommendations
1. **Immediate Action:** Address all critical and serious violations
2. **Short Term:** Fix moderate impact issues affecting common user paths
3. **Long Term:** Resolve minor issues and implement accessibility testing in CI/CD
4. **Ongoing:** Regular audits and manual testing with assistive technologies

## Compliance Status
${results.violations === 0 ? '✅ **PASSED** - No automated violations detected' : `⚠️ **NEEDS WORK** - ${results.violations} violation(s) found`}

*Note: Automated testing covers ~30-40% of WCAG criteria. Manual testing is required for full compliance.*
`;

      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Invalid scan results JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async browserSnapshot(args: { url: string; includeHidden?: boolean }) {
    const { url, includeHidden = false } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Get accessibility tree snapshot
      const snapshot = await page.accessibility.snapshot({ interestingOnly: !includeHidden });

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `# Accessibility Tree Snapshot\n\n**URL:** ${url}\n**Include Hidden:** ${includeHidden}\n\n\`\`\`json\n${JSON.stringify(snapshot, null, 2)}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async browserNavigate(args: { url: string; waitUntil?: string }) {
    const { url, waitUntil = 'networkidle' } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: waitUntil as any, timeout: 30000 });
      const title = await page.title();

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `✅ Navigated to ${url}\nPage title: ${title}`,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async browserClick(args: { url: string; selector: string; waitForNavigation?: boolean }) {
    const { url, selector, waitForNavigation = false } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const elementExists = await page.locator(selector).count() > 0;
      if (!elementExists) {
        await browser.close();
        return {
          content: [{ type: "text", text: `❌ Element not found: "${selector}"` }],
        };
      }

      if (waitForNavigation) {
        await Promise.all([
          page.waitForNavigation({ timeout: 10000 }),
          page.click(selector)
        ]);
      } else {
        await page.click(selector);
      }

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `✅ Clicked element: ${selector}`,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async browserType(args: { url: string; selector: string; text: string }) {
    const { url, selector, text } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.fill(selector, text);

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `✅ Typed "${text}" into ${selector}`,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async browserTakeScreenshot(args: { url: string; fullPage?: boolean; highlightSelector?: string; annotate?: boolean }) {
    const { url, fullPage = true, highlightSelector, annotate = false } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Highlight element if selector provided
      if (highlightSelector) {
        await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          if (element) {
            (element as HTMLElement).style.outline = '3px solid red';
          }
        }, highlightSelector);
      }

      // Annotate violations if requested
      if (annotate) {
        const axeResults = await new AxeBuilder({ page }).analyze();
        const violationsData = axeResults.violations.map((v: any, index: number) => ({
          index: index + 1,
          nodes: v.nodes.map((n: any) => ({ target: n.target[0] }))
        }));

        await page.evaluate((violations: any[]) => {
          violations.forEach((v) => {
            v.nodes.forEach((node: any) => {
              const element = document.querySelector(node.target);
              if (element) {
                const badge = document.createElement('div');
                badge.textContent = `${v.index}`;
                badge.style.cssText = 'position:absolute;background:red;color:white;padding:4px 8px;border-radius:50%;font-weight:bold;z-index:10000;';
                const rect = element.getBoundingClientRect();
                badge.style.top = `${rect.top + window.scrollY}px`;
                badge.style.left = `${rect.left + window.scrollX}px`;
                document.body.appendChild(badge);
              }
            });
          });
        }, violationsData);
      }

      const screenshotsDir = await ensureScreenshotsDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const screenshotPath = path.join(screenshotsDir, `screenshot-${timestamp}.png`);

      await page.screenshot({ path: screenshotPath, fullPage });

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `✅ Screenshot saved: ${screenshotPath}${highlightSelector ? `\nHighlighted: ${highlightSelector}` : ''}${annotate ? '\nAnnotated with violation markers' : ''}`,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async browserConsoleMessages(args: { url: string; types?: string[] }) {
    const { url, types } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const messages: any[] = [];

    try {
      page.on('console', (msg) => {
        const msgType = msg.type();
        if (!types || types.includes(msgType)) {
          messages.push({
            type: msgType,
            text: msg.text(),
            location: msg.location()
          });
        }
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000); // Wait for console messages

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `# Console Messages\n\n**URL:** ${url}\n**Messages:** ${messages.length}\n\n${messages.map(m => `[${m.type.toUpperCase()}] ${m.text}\n  Location: ${m.location.url}:${m.location.lineNumber}`).join('\n\n')}`,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async browserNetworkRequests(args: { url: string; filterType?: string }) {
    const { url, filterType = 'all' } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const requests: any[] = [];

    try {
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (filterType === 'all' || resourceType === filterType) {
          requests.push({
            url: request.url(),
            method: request.method(),
            resourceType,
          });
        }
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `# Network Requests\n\n**URL:** ${url}\n**Filter:** ${filterType}\n**Total Requests:** ${requests.length}\n\n${requests.slice(0, 50).map(r => `[${r.method}] ${r.resourceType}: ${r.url}`).join('\n')}${requests.length > 50 ? `\n\n... and ${requests.length - 50} more` : ''}`,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async browserScreenClick(args: { url: string; x: number; y: number }) {
    const { url, x, y } = args;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.mouse.click(x, y);

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: `✅ Clicked at coordinates (${x}, ${y})`,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private async scanPage(args: {
    url: string;
    standards?: string[];
    categories?: string[];
    outputFormat?: string;
  }) {
    const {
      url,
      standards = ['wcag2aa', 'wcag21aa'],
      categories,
      outputFormat = 'text'
    } = args;

    console.error(`[MCP] Scanning ${url} with comprehensive standards...`);
    console.error(`[MCP] Standards: ${standards.join(', ')}`);
    if (categories) {
      console.error(`[MCP] Categories: ${categories.join(', ')}`);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Build axe configuration
      const axeBuilder = new AxeBuilder({ page });

      // Combine standards and categories
      const allTags = [...standards];
      if (categories && categories.length > 0) {
        allTags.push(...categories);
      }

      axeBuilder.withTags(allTags);

      const axeResults = await axeBuilder.analyze();

      const violations = axeResults.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact || 'moderate',
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags,
        nodes: v.nodes.length,
        nodeDetails: v.nodes.map((n: any) => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary
        }))
      }));

      const passes = axeResults.passes.length;
      const incomplete = axeResults.incomplete.length;

      await browser.close();

      const summary = {
        url,
        standards,
        categories: categories || [],
        timestamp: new Date().toISOString(),
        violations: violations.length,
        passes,
        incomplete,
        critical: violations.filter(v => v.impact === 'critical').length,
        serious: violations.filter(v => v.impact === 'serious').length,
        moderate: violations.filter(v => v.impact === 'moderate').length,
        minor: violations.filter(v => v.impact === 'minor').length,
      };

      if (outputFormat === 'json') {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ summary, violations }, null, 2),
            },
          ],
        };
      }

      // Text format
      const report = `# Comprehensive Accessibility Scan

**URL:** ${url}
**Standards:** ${standards.join(', ')}
${categories ? `**Categories:** ${categories.join(', ')}` : ''}
**Scanned:** ${new Date().toISOString()}

## Summary
- ✅ **Passed Checks:** ${passes}
- ❌ **Violations:** ${violations.length}
  - 🔴 Critical: ${summary.critical}
  - 🟠 Serious: ${summary.serious}
  - 🟡 Moderate: ${summary.moderate}
  - 🔵 Minor: ${summary.minor}
- ⚠️ **Incomplete:** ${incomplete}

## Violations

${violations.length === 0 ? '✅ No violations found!' : violations.map((v, i) => `
### ${i + 1}. ${v.help}

**Impact:** ${v.impact?.toUpperCase() || 'UNKNOWN'}
**Rule ID:** ${v.id}
**Affected Elements:** ${v.nodes}
**Tags:** ${v.tags.join(', ')}

**Description:** ${v.description}

**Fix:** ${v.helpUrl}

**Example HTML:**
\`\`\`html
${v.nodeDetails[0]?.html || 'N/A'}
\`\`\`
`).join('\n---\n')}
`;

      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  async run() {
    // Start file server for downloads
    await fileServer.start();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Accessibility Testing MCP Server running on stdio");
  }
}

// Start server
const server = new AccessibilityMCPServer();
server.run().catch(console.error);
