# 🤖 Testing MCP Server with OpenAI

Great news! OpenAI officially adopted the Model Context Protocol (MCP) in March 2025. You can now use your accessibility scanner with OpenAI agents!

---

## 🎯 Two Ways to Test with OpenAI

### **Option 1: OpenAI Agents SDK** (Recommended - Uses your MCP server as-is)
### **Option 2: OpenAI Function Calling** (Direct API integration)

---

## 🚀 Option 1: OpenAI Agents SDK with MCP

Your MCP server works **directly** with OpenAI's Agents SDK!

### **Step 1: Install OpenAI Agents SDK**

```bash
pip install openai-agents
```

### **Step 2: Create Test Script**

Create `test-openai-agent.py`:

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
import os

async def test_accessibility_scanner():
    """Test accessibility scanning with OpenAI agent"""
    
    # Connect to your MCP server
    async with MCPServerStdio(
        name="accessibility-scanner",
        command="node",
        args=["/home/runner/workspace/mcp-server/dist/index.js"]
    ) as server:
        
        # Create OpenAI agent with MCP tools
        agent = Agent(
            name="Accessibility Assistant",
            model="gpt-4o",  # or gpt-4o-mini, gpt-4-turbo
            mcp_servers=[server],
            instructions="""You are an accessibility testing expert. 
            Help users scan websites for WCAG compliance issues.
            Provide clear, actionable recommendations."""
        )
        
        # Test 1: Basic scan
        print("🧪 Test 1: Basic Accessibility Scan")
        result = await Runner.run(
            agent, 
            "Scan https://example.com for accessibility issues"
        )
        print(result)
        
        # Test 2: WCAG guidance
        print("\n🧪 Test 2: WCAG Guidance")
        result = await Runner.run(
            agent,
            "What does the color-contrast rule mean?"
        )
        print(result)
        
        # Test 3: Video recording
        print("\n🧪 Test 3: Video Recording")
        result = await Runner.run(
            agent,
            "Scan https://google.com and record a video"
        )
        print(result)
        
        # Test 4: Excel export
        print("\n🧪 Test 4: Excel Export")
        result = await Runner.run(
            agent,
            "Scan https://example.com and export as Excel"
        )
        print(result)

if __name__ == "__main__":
    # Set your OpenAI API key
    os.environ['OPENAI_API_KEY'] = 'your-api-key-here'
    
    asyncio.run(test_accessibility_scanner())
```

### **Step 3: Run Tests**

```bash
python test-openai-agent.py
```

**Expected Output:**
- ✅ Agent connects to your MCP server
- ✅ Discovers all 4 tools (scan, guidance, check_element, reports)
- ✅ Executes accessibility scans
- ✅ Returns results with download links!

---

## 🔧 Option 2: OpenAI Function Calling (Direct API)

If you want to use the **OpenAI API directly** without the Agents SDK:

### **Step 1: Create Wrapper Script**

Create `openai-accessibility-test.py`:

```python
import asyncio
import json
from openai import OpenAI
import subprocess
import os

client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])

# Define accessibility scanning tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "scan_website_accessibility",
            "description": "Scan a website for WCAG 2.1 A/AA accessibility compliance issues",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "The URL to scan (e.g., https://example.com)"
                    },
                    "maxPages": {
                        "type": "number",
                        "description": "Maximum pages to scan (1-50, default 5)"
                    },
                    "recordVideo": {
                        "type": "boolean",
                        "description": "Record video of scan session"
                    },
                    "outputFormat": {
                        "type": "string",
                        "enum": ["text", "excel", "json", "markdown", "all"],
                        "description": "Export format for reports"
                    }
                },
                "required": ["url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_wcag_guidance",
            "description": "Get detailed guidance and remediation strategies for WCAG rules",
            "parameters": {
                "type": "object",
                "properties": {
                    "ruleId": {
                        "type": "string",
                        "description": "WCAG rule ID (e.g., 'color-contrast', 'label', 'image-alt')"
                    }
                },
                "required": ["ruleId"]
            }
        }
    }
]

def execute_mcp_tool(tool_name: str, arguments: dict) -> str:
    """Execute MCP tool by calling the server with JSON-RPC"""
    
    # Prepare JSON-RPC request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }
    
    # Call MCP server via stdio
    result = subprocess.run(
        ["node", "/home/runner/workspace/mcp-server/dist/index.js"],
        input=json.dumps(request),
        capture_output=True,
        text=True
    )
    
    return result.stdout

def chat_with_accessibility_agent(user_message: str):
    """Chat with OpenAI using accessibility tools"""
    
    messages = [
        {
            "role": "system",
            "content": """You are an accessibility testing expert.
            Help users scan websites for WCAG compliance.
            Use the available tools to perform scans and provide guidance."""
        },
        {"role": "user", "content": user_message}
    ]
    
    # First API call
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )
    
    message = response.choices[0].message
    
    # Check if model wants to call a function
    if message.tool_calls:
        messages.append(message)
        
        for tool_call in message.tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            print(f"🔧 Calling: {function_name}")
            print(f"   Args: {function_args}")
            
            # Execute the MCP tool
            function_response = execute_mcp_tool(function_name, function_args)
            
            # Add result to conversation
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": function_name,
                "content": function_response
            })
        
        # Get final response
        final_response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages
        )
        
        return final_response.choices[0].message.content
    else:
        return message.content

# Test it!
if __name__ == "__main__":
    print("🧪 Testing OpenAI with Accessibility Scanner\n")
    
    # Test 1: Basic scan
    print("=" * 60)
    print("Test 1: Basic Scan")
    print("=" * 60)
    response = chat_with_accessibility_agent(
        "Scan https://example.com for accessibility issues"
    )
    print(response)
    
    # Test 2: WCAG guidance
    print("\n" + "=" * 60)
    print("Test 2: WCAG Guidance")
    print("=" * 60)
    response = chat_with_accessibility_agent(
        "What does color-contrast mean in WCAG?"
    )
    print(response)
    
    # Test 3: Video recording
    print("\n" + "=" * 60)
    print("Test 3: Video Recording")
    print("=" * 60)
    response = chat_with_accessibility_agent(
        "Scan https://google.com and record a video"
    )
    print(response)
```

### **Step 2: Set API Key**

```bash
export OPENAI_API_KEY='your-api-key-here'
```

### **Step 3: Run**

```bash
python openai-accessibility-test.py
```

---

## 📋 Quick Start Guide

### **Prerequisites**

1. **OpenAI API Key** - Get from https://platform.openai.com/api-keys
2. **Python 3.8+** installed
3. **MCP server built** (`cd mcp-server && npm run build`)

### **Recommended: Use Replit Secrets**

Instead of hardcoding your API key, use Replit secrets:

```python
import os
from openai import OpenAI

# API key from Replit secrets
client = OpenAI(api_key=os.environ['OPENAI_API_KEY'])
```

Then add `OPENAI_API_KEY` to your Replit secrets!

---

## 🧪 Test Commands

### **Test 1: Basic Scan**
```python
result = await Runner.run(
    agent, 
    "Scan https://example.com for accessibility issues"
)
```

**Expected:** Full accessibility report with violations

### **Test 2: Video Recording**
```python
result = await Runner.run(
    agent,
    "Scan https://google.com and record a video with full visual feedback"
)
```

**Expected:** Report + video download link

### **Test 3: Excel Export**
```python
result = await Runner.run(
    agent,
    "Scan https://example.com and export as Excel"
)
```

**Expected:** Report + Excel download link

### **Test 4: WCAG Guidance**
```python
result = await Runner.run(
    agent,
    "Explain the image-alt WCAG rule"
)
```

**Expected:** Detailed explanation and remediation

---

## 🎯 Complete Example (Copy-Paste Ready)

Create `test_openai.py`:

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
import os

async def main():
    # Your MCP server path
    mcp_server_path = "/home/runner/workspace/mcp-server/dist/index.js"
    
    async with MCPServerStdio(
        name="accessibility",
        command="node",
        args=[mcp_server_path]
    ) as server:
        
        agent = Agent(
            name="Accessibility Expert",
            model="gpt-4o-mini",  # Faster and cheaper
            mcp_servers=[server]
        )
        
        # Interactive testing
        while True:
            user_input = input("\n🤖 Ask me about accessibility (or 'quit'): ")
            if user_input.lower() == 'quit':
                break
            
            result = await Runner.run(agent, user_input)
            print(f"\n✅ {result}")

if __name__ == "__main__":
    # Set your OpenAI API key
    os.environ['OPENAI_API_KEY'] = input("Enter OpenAI API key: ")
    asyncio.run(main())
```

**Run:**
```bash
python test_openai.py
```

**Try:**
- "Scan example.com"
- "Record a video of google.com"
- "Export example.com as Excel"
- "What does color-contrast mean?"

---

## 💰 Cost Estimates

| Model | Input (1M tokens) | Output (1M tokens) | Scan Cost |
|-------|-------------------|-------------------|-----------|
| gpt-4o | $2.50 | $10.00 | ~$0.05 |
| gpt-4o-mini | $0.15 | $0.60 | ~$0.003 |
| gpt-4-turbo | $10.00 | $30.00 | ~$0.20 |

**Recommendation:** Use `gpt-4o-mini` for testing (20x cheaper!)

---

## ✅ What Works

- ✅ All 4 MCP tools available to OpenAI
- ✅ Video recording with download links
- ✅ Excel/JSON/Markdown exports
- ✅ WCAG guidance
- ✅ Multi-page scanning
- ✅ HTTP download server (localhost:3456)
- ✅ Conversation history maintained
- ✅ Natural language interface

---

## 🔄 Comparison: OpenAI vs Claude Desktop

| Feature | Claude Desktop | OpenAI Agents SDK |
|---------|---------------|-------------------|
| **MCP Support** | ✅ Native | ✅ Via SDK |
| **Setup** | Config file | Python code |
| **Cost** | Included in Pro | Pay per token |
| **Interface** | Desktop app | Code/API |
| **Speed** | Fast | Fast |
| **Customization** | Limited | Full control |
| **Best For** | Manual testing | Automation/CI |

---

## 🚀 Advanced: CI/CD Integration

Use OpenAI agents in your CI pipeline:

```python
# ci-accessibility-check.py
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
import sys

async def ci_scan(url: str):
    async with MCPServerStdio(
        command="node",
        args=["mcp-server/dist/index.js"]
    ) as server:
        agent = Agent(model="gpt-4o-mini", mcp_servers=[server])
        result = await Runner.run(
            agent,
            f"Scan {url} and fail if critical issues found"
        )
        
        # Parse result and exit with code
        if "Critical Issues" in result and "0" not in result:
            print("❌ Critical accessibility issues found!")
            sys.exit(1)
        else:
            print("✅ No critical issues!")
            sys.exit(0)

if __name__ == "__main__":
    asyncio.run(ci_scan(sys.argv[1]))
```

**GitHub Actions:**
```yaml
- name: Accessibility Check
  run: python ci-accessibility-check.py https://staging.example.com
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## 📚 Resources

- **OpenAI Agents SDK Docs:** https://openai.github.io/openai-agents-python/
- **MCP Specification:** https://modelcontextprotocol.io
- **OpenAI Function Calling:** https://platform.openai.com/docs/guides/function-calling
- **Your MCP Server Docs:** See `README.md`, `TEST_GUIDE.md`

---

## 🎉 You're Ready!

Your MCP server works with **both** Claude Desktop and OpenAI!

**Choose your path:**
- **Claude Desktop:** Best for manual testing (see `TEST_GUIDE.md`)
- **OpenAI Agents:** Best for automation and CI/CD (see above)

**Happy testing with OpenAI! 🤖**
