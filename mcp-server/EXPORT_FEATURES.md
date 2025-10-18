# 📊 Export Features - Accessibility MCP Server

## Overview

The Accessibility MCP Server now supports **multiple output formats** with **file exports**!

Choose how you want your scan results:
- **Text** (AI-readable Markdown) - Default
- **Excel** (XLSX spreadsheets) - Professional reports
- **JSON** (structured data) - For integration
- **Markdown** (MD files) - Shareable reports
- **All** (generates all formats) - Complete package

---

## 🎯 How to Use

### Basic Text Output (Default)

```
Ask AI: "Scan https://example.com for accessibility issues"
```

Returns: Markdown text report (AI-readable, no files saved)

---

### Excel Report

```
Ask AI: "Scan https://example.com and save as Excel"

Or be specific:
"Scan https://example.com with outputFormat='excel'"
```

**What you get:**
- ✅ **Professional XLSX file** with multiple sheets
- ✅ **Summary Sheet**: Statistics, counts, breakdown
- ✅ **Violations Sheet**: All issues with full details
- ✅ **Color-coded by severity**: Critical (red), Serious (orange), Moderate (yellow), Minor (blue)
- ✅ **Saved to**: `~/mcp-accessibility-reports/accessibility-scan-YYYY-MM-DDTHH-MM-SS.xlsx`

**Excel File Structure:**
```
Sheet 1: Summary
├─ URL Scanned
├─ WCAG Level
├─ Total Violations
├─ Passed Checks
└─ Severity Breakdown (Critical/Serious/Moderate/Minor)

Sheet 2: Violations
├─ Rule ID | Impact | Issue | Description
├─ Affected Elements | Selector | WCAG Tags
└─ Documentation URL
```

---

### JSON Report

```
Ask AI: "Scan https://example.com and output as JSON"

Or:
"Scan https://example.com with outputFormat='json'"
```

**What you get:**
- ✅ **Structured JSON file** with complete scan data
- ✅ **Machine-readable** for integrations
- ✅ **Includes metadata**: generator, version, timestamp
- ✅ **Saved to**: `~/mcp-accessibility-reports/accessibility-scan-YYYY-MM-DDTHH-MM-SS.json`

**JSON Structure:**
```json
{
  "summary": {
    "url": "https://example.com",
    "wcagLevel": "AA",
    "timestamp": "2025-10-18T...",
    "violations": 12,
    "passes": 45,
    "critical": 2,
    "serious": 5,
    "moderate": 3,
    "minor": 2
  },
  "violations": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "...",
      "help": "...",
      "helpUrl": "...",
      "tags": ["wcag2aa", "wcag143"],
      "nodes": 5,
      "exampleHtml": "<div>...",
      "selector": "#main .content"
    }
  ],
  "metadata": {
    "generatedBy": "Accessibility Testing MCP Server",
    "version": "1.0.0",
    "exportedAt": "2025-10-18T..."
  }
}
```

---

### Markdown File

```
Ask AI: "Scan https://example.com and save as Markdown"

Or:
"Scan https://example.com with outputFormat='markdown'"
```

**What you get:**
- ✅ **Markdown (.md) file** with full report
- ✅ **Shareable** with team members
- ✅ **Readable** in any text editor or GitHub
- ✅ **Saved to**: `~/mcp-accessibility-reports/accessibility-scan-YYYY-MM-DDTHH-MM-SS.md`

---

### All Formats

```
Ask AI: "Scan https://example.com and generate all output formats"

Or:
"Scan https://example.com with outputFormat='all'"
```

**What you get:**
- ✅ **3 files generated**: Excel + JSON + Markdown
- ✅ **Complete package** for different use cases
- ✅ **File paths returned** in response

---

## 📁 File Locations

All reports are saved to:
```
~/mcp-accessibility-reports/
├── accessibility-scan-2025-10-18T10-30-45.xlsx
├── accessibility-scan-2025-10-18T10-30-45.json
└── accessibility-scan-2025-10-18T10-30-45.md
```

**On Replit:** `/home/runner/mcp-accessibility-reports/`
**On Mac:** `/Users/yourname/mcp-accessibility-reports/`
**On Linux:** `/home/yourname/mcp-accessibility-reports/`

---

## 🔧 Advanced Usage

### Scan with Custom WCAG Level + Excel Export

```
"Scan https://example.com for WCAG AAA violations and save as Excel"
```

Parameters:
- `url`: "https://example.com"
- `wcagLevel`: "AAA"
- `outputFormat`: "excel"

---

### Control File Saving

By default:
- `text` format → **No files saved** (returns text only)
- `excel`, `json`, `markdown`, `all` → **Files saved automatically**

To override:
```
"Scan https://example.com with outputFormat='text' and saveToFile=true"
```

This will save a Markdown file even though output is text.

---

## 💡 Use Cases

### For Developers
**JSON format** - Integrate scan results into CI/CD pipelines

### For Managers
**Excel format** - Professional reports for stakeholders

### For Teams
**Markdown format** - Share in documentation, GitHub, Slack

### For Comprehensive Analysis
**All formats** - Keep complete records in multiple formats

---

## 🎯 Example Prompts

1. **Quick scan (text only)**
   > "Scan google.com for accessibility issues"

2. **Professional report**
   > "Scan my-website.com and generate an Excel report"

3. **Data export**
   > "Scan the-site.com and save results as JSON"

4. **Complete package**
   > "Scan example.com and create all output formats"

5. **Custom WCAG level with Excel**
   > "Scan the-app.com for WCAG AAA violations and export to Excel"

---

## 📊 What's Included in Exports

### All Formats Include:

✅ **Summary Statistics**
- Total violations and passes
- Severity breakdown (Critical/Serious/Moderate/Minor)
- WCAG level tested
- Timestamp

✅ **Detailed Violations**
- Rule ID and impact level
- Description and remediation help
- Affected element count
- Example HTML and CSS selectors
- WCAG criteria tags
- Documentation links

✅ **Complete Data**
- Excel/JSON exports include **ALL violations** (not limited to 10)
- Text reports show first 10 with note about total count

---

## 🎉 Benefits

1. **Flexibility** - Choose the right format for your needs
2. **Professional** - Excel reports ready for stakeholders
3. **Automation** - JSON for CI/CD integration
4. **Shareability** - Markdown for team collaboration
5. **Completeness** - "all" format gives you everything

---

## 🔄 Response Format

When files are generated, the AI response includes:

```markdown
# Accessibility Scan Report
[... full report text ...]

---

## 📁 Generated Files

1. **accessibility-scan-2025-10-18T10-30-45.xlsx**
   Path: `/home/runner/mcp-accessibility-reports/accessibility-scan-2025-10-18T10-30-45.xlsx`

2. **accessibility-scan-2025-10-18T10-30-45.json**
   Path: `/home/runner/mcp-accessibility-reports/accessibility-scan-2025-10-18T10-30-45.json`

All reports saved to: `/home/runner/mcp-accessibility-reports/`
```

---

**Now your accessibility scans can be exported professionally! 🚀**
