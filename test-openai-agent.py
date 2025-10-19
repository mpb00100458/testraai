#!/usr/bin/env python3
"""
Test accessibility MCP server with OpenAI Agents SDK
"""

import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
import os
import sys

async def test_accessibility_with_openai():
    """Test accessibility scanning with OpenAI agent using MCP"""
    
    # MCP server path
    mcp_server_path = os.path.join(
        os.path.dirname(__file__),
        "mcp-server",
        "dist",
        "index.js"
    )
    
    print("🤖 OpenAI Accessibility Agent Test")
    print("=" * 60)
    print(f"📁 MCP Server: {mcp_server_path}")
    print("=" * 60)
    print()
    
    # Check OpenAI API key
    if not os.environ.get('OPENAI_API_KEY'):
        print("❌ Error: OPENAI_API_KEY not set!")
        print()
        print("Set it with:")
        print("  export OPENAI_API_KEY='your-api-key-here'")
        print()
        print("Or use Replit secrets:")
        print("  1. Go to Tools > Secrets")
        print("  2. Add OPENAI_API_KEY with your key")
        sys.exit(1)
    
    try:
        # Connect to MCP server
        async with MCPServerStdio(
            name="accessibility-scanner",
            command="node",
            args=[mcp_server_path]
        ) as server:
            
            print("✅ Connected to MCP server")
            print()
            
            # Create OpenAI agent with MCP tools
            agent = Agent(
                name="Accessibility Expert",
                model="gpt-4o-mini",  # Faster and cheaper for testing
                mcp_servers=[server],
                instructions="""You are an accessibility testing expert.
                Help users scan websites for WCAG compliance issues.
                Provide clear, actionable recommendations with download links."""
            )
            
            print("✅ OpenAI agent created (using gpt-4o-mini)")
            print()
            
            # Test 1: Basic scan
            print("🧪 Test 1: Basic Accessibility Scan")
            print("-" * 60)
            result = await Runner.run(
                agent,
                "Scan https://example.com for accessibility issues"
            )
            print(result)
            print()
            
            # Test 2: WCAG guidance
            print("🧪 Test 2: WCAG Guidance")
            print("-" * 60)
            result = await Runner.run(
                agent,
                "What does the color-contrast rule mean in WCAG?"
            )
            print(result)
            print()
            
            # Test 3: Video recording
            print("🧪 Test 3: Video Recording")
            print("-" * 60)
            result = await Runner.run(
                agent,
                "Scan https://google.com and record a video"
            )
            print(result)
            print()
            
            # Test 4: Excel export
            print("🧪 Test 4: Excel Export")
            print("-" * 60)
            result = await Runner.run(
                agent,
                "Scan https://example.com and export as Excel"
            )
            print(result)
            print()
            
            print("=" * 60)
            print("✅ All tests completed!")
            print("=" * 60)
            print()
            print("📥 Download files at: http://localhost:3456/")
            print()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("Troubleshooting:")
        print("1. Make sure MCP server is built: cd mcp-server && npm run build")
        print("2. Check OPENAI_API_KEY is set correctly")
        print("3. Install agents SDK: pip install openai-agents")
        sys.exit(1)

async def interactive_mode():
    """Interactive chat with accessibility agent"""
    
    mcp_server_path = os.path.join(
        os.path.dirname(__file__),
        "mcp-server",
        "dist",
        "index.js"
    )
    
    print("🤖 Interactive Accessibility Agent")
    print("=" * 60)
    print("Powered by OpenAI + Your MCP Server")
    print("=" * 60)
    print()
    
    if not os.environ.get('OPENAI_API_KEY'):
        print("❌ Error: OPENAI_API_KEY not set!")
        sys.exit(1)
    
    async with MCPServerStdio(
        name="accessibility",
        command="node",
        args=[mcp_server_path]
    ) as server:
        
        agent = Agent(
            name="Accessibility Expert",
            model="gpt-4o-mini",
            mcp_servers=[server],
            instructions="""You are an accessibility testing expert.
            Help users scan websites and understand WCAG compliance."""
        )
        
        print("✅ Agent ready! Ask me about accessibility.")
        print("   Type 'quit' to exit")
        print()
        
        while True:
            try:
                user_input = input("You: ")
                if user_input.lower() in ['quit', 'exit', 'q']:
                    print("\n👋 Goodbye!")
                    break
                
                if not user_input.strip():
                    continue
                
                print()
                result = await Runner.run(agent, user_input)
                print(f"Agent: {result}")
                print()
                
            except KeyboardInterrupt:
                print("\n\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {e}\n")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Test accessibility MCP server with OpenAI")
    parser.add_argument(
        '--interactive',
        '-i',
        action='store_true',
        help='Run in interactive chat mode'
    )
    
    args = parser.parse_args()
    
    if args.interactive:
        asyncio.run(interactive_mode())
    else:
        asyncio.run(test_accessibility_with_openai())
