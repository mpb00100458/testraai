# WCAG Quick Reference - MCP Server

## ✅ What You Now Have

Your MCP server now includes **comprehensive WCAG 2.1/2.2 guidance** for 60+ accessibility rules!

---

## 📚 Documentation Files

1. **`WCAG_CRITERIA_REFERENCE.md`** - Full WCAG 2.1/2.2 standards documentation
   - All 4 principles: Perceivable, Operable, Understandable, Robust
   - Success criteria organized by level (A, AA, AAA)
   - Common axe-core rule IDs mapped to WCAG criteria
   - Practical examples and remediation strategies

2. **`WCAG_GUIDANCE` (in index.ts)** - Built-in MCP server database
   - 60+ rule definitions with detailed guidance
   - Accessible via `get_wcag_guidance` tool
   - Used by AI agents to explain violations

---

## 🔍 How to Use WCAG Guidance

### From OpenAI Agent Builder:

**Ask for guidance on specific violations:**
```
"What is the color-contrast rule and how do I fix it?"
"Explain WCAG 1.4.3 Contrast requirements"
"How do I fix image-alt violations?"
```

**The agent will call:**
```json
{
  "tool": "get_wcag_guidance",
  "arguments": {
    "ruleId": "color-contrast"
  }
}
```

**Response includes:**
- ✅ WCAG Success Criterion (e.g., "1.4.3 Contrast (Minimum)")
- ✅ Conformance Level (A, AA, or AAA)
- ✅ Description of the rule
- ✅ Specific requirements (e.g., "4.5:1 for normal text")
- ✅ Step-by-step remediation guidance
- ✅ Code examples (good vs. bad)

---

## 📊 Coverage by WCAG Principle

### 1️⃣ Perceivable (17 rules)
- ✅ **Text Alternatives:** `image-alt`, `input-image-alt`, `area-alt`
- ✅ **Contrast:** `color-contrast`, `color-contrast-enhanced`
- ✅ **Adaptable:** `label`, `heading-order`, `list`, `landmark-one-main`, `region`
- ✅ **Distinguishable:** `link-in-text-block`, `meta-viewport`, `autocomplete-valid`

### 2️⃣ Operable (13 rules)
- ✅ **Keyboard:** `button`, `link`, `tabindex`, `focus-order-semantics`
- ✅ **Navigation:** `bypass`, `document-title`, `button-name`, `link-name`, `focus-visible`
- ✅ **Input Modalities:** `target-size`, `label-content-name-mismatch`

### 3️⃣ Understandable (5 rules)
- ✅ **Readable:** `html-has-lang`, `html-lang-valid`, `lang-valid`
- ✅ **Input Assistance:** `aria-input-field-name`

### 4️⃣ Robust (25+ rules)
- ✅ **Parsing:** `duplicate-id`, `duplicate-id-active`, `duplicate-id-aria`
- ✅ **ARIA:** `aria-required-attr`, `aria-roles`, `aria-valid-attr`, `aria-valid-attr-value`, `aria-allowed-attr`, `aria-hidden-focus`
- ✅ **Tables:** `table-duplicate-name`, `td-headers-attr`, `th-has-data-cells`

---

## 🎯 Most Common Violations Covered

### Critical Priority (Level A)
1. **`image-alt`** - Images without alt text (1.1.1)
2. **`label`** - Form inputs without labels (1.3.1, 4.1.2)
3. **`button-name`** - Buttons without accessible names (4.1.2)
4. **`link-name`** - Links without accessible names (4.1.2, 2.4.4)
5. **`html-has-lang`** - Missing language attribute (3.1.1)
6. **`duplicate-id`** - Duplicate IDs in page (4.1.1)

### High Priority (Level AA)
1. **`color-contrast`** - Insufficient text contrast (1.4.3)
2. **`focus-visible`** - Missing focus indicators (2.4.7)
3. **`heading-order`** - Incorrect heading hierarchy (1.3.1)
4. **`document-title`** - Missing page titles (2.4.2)
5. **`meta-viewport`** - Zoom disabled (1.4.4)
6. **`target-size`** - Touch targets too small (2.5.8 - WCAG 2.2)

---

## 💡 Example Queries for Your Agent

### Ask about specific violations:
```
"What does the aria-required-attr violation mean?"
"How do I fix heading-order issues?"
"Explain WCAG 4.1.2 Name, Role, Value"
```

### Get remediation guidance:
```
"How do I add alt text to images properly?"
"What's the correct contrast ratio for normal text?"
"Show me how to fix duplicate ID violations"
```

### Learn about WCAG levels:
```
"What's the difference between WCAG A, AA, and AAA?"
"Which WCAG criteria are required for Level AA compliance?"
"What are the most critical accessibility violations to fix first?"
```

---

## 🔧 Testing with MCP Server

### 1. Scan a URL and get guidance on violations:
```
Agent: "Scan https://example.com for accessibility issues"
→ Returns violations with rule IDs

Agent: "Explain the color-contrast violations found"
→ Gets detailed WCAG guidance
```

### 2. Website audit with automatic guidance:
```
Agent: "Audit the first 10 pages of https://mysite.com and explain the top 3 violations"
→ Scans multiple pages
→ Identifies most common issues
→ Provides WCAG guidance for each
```

### 3. Proactive education:
```
User: "I'm building a form - what accessibility requirements should I know?"
Agent calls get_wcag_guidance for: label, aria-required-attr, aria-input-field-name
→ Returns comprehensive form accessibility guidance
```

---

## 📖 Quick WCAG Principles Summary

### **Perceivable**
Information must be presentable to users in ways they can perceive.
- Provide text alternatives for non-text content
- Ensure sufficient color contrast
- Make content adaptable to different presentations

### **Operable**
User interface components must be operable.
- Make all functionality keyboard accessible
- Give users enough time to read and use content
- Provide ways to navigate and find content

### **Understandable**
Information and UI must be understandable.
- Make text readable
- Make pages appear and operate predictably
- Help users avoid and correct mistakes

### **Robust**
Content must be robust enough for various user agents and assistive technologies.
- Maximize compatibility with current and future tools
- Use valid, well-formed HTML
- Ensure ARIA is used correctly

---

## 🎯 Conformance Levels

| Level | Description | Coverage |
|-------|-------------|----------|
| **A** | Minimum accessibility | Must satisfy |
| **AA** | Recommended standard | Most websites aim for this |
| **AAA** | Highest accessibility | Not always achievable for all content |

**Target:** Most organizations aim for **WCAG 2.1 Level AA** compliance.

---

## 🚀 Next Steps

1. **Test your MCP server:**
   ```bash
   cd mcp-server && npm run sse
   ```

2. **Connect to OpenAI Agent Builder:**
   - Add SSE endpoint: `https://[your-repl-url]/sse`
   - Test: "Scan https://example.com for WCAG AA violations"

3. **Use get_wcag_guidance:**
   - Ask: "Explain the image-alt rule"
   - Ask: "What does WCAG 1.4.3 require?"

---

## 📥 All Available Files

```
mcp-server/
├── WCAG_CRITERIA_REFERENCE.md     ← Full WCAG 2.1/2.2 documentation
├── WCAG_QUICK_REFERENCE.md         ← This file (quick guide)
├── SCAN_WEBSITE_CODE.md            ← scan_website_accessibility implementation
├── index.ts                        ← MCP server (60+ WCAG rules in WCAG_GUIDANCE)
├── sse-server.ts                   ← SSE wrapper for OpenAI Agent Builder
├── exportUtils.ts                  ← Report generation
├── fileServer.ts                   ← Download server
└── dist/                           ← Built server files
```

---

**Your MCP server is now a comprehensive WCAG compliance assistant! 🎉**
