import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import * as readline from "readline";

// Types
interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are a web automation agent that controls a browser through accessibility-based interactions.

## Your Capabilities
You have access to browser control tools through MCP. Use these tools to:
- Launch and close browser instances
- Navigate to URLs
- Take accessibility snapshots to understand page content
- Click buttons and links by their accessible labels
- Fill form fields by their accessible labels
- Select options from dropdowns
- Check/uncheck checkboxes
- Take screenshots

## How to Interact with Pages

1. ALWAYS launch the browser first with browser_launch
2. Navigate to the target URL with browser_navigate
3. Take an accessibility snapshot with browser_snapshot to understand the page
4. Identify elements by their aria-label, role, or text content
5. Use the exact label text when interacting with elements
6. Verify each action by taking a new snapshot afterward
7. Report results to the user

## Snapshot Interpretation

When you receive an accessibility snapshot, it contains a tree of elements with:
- role: The type of element (button, textbox, link, heading, etc.)
- name: The accessible label (use this to interact with elements)
- value: Current value for inputs
- checked/pressed/expanded: State information

## Important Rules

- Never guess element labels - always use snapshot first
- If an action fails, take a new snapshot and try a different approach
- Describe what you see and do to the user as you work
- Ask for clarification if instructions are ambiguous
- Always close the browser when done with browser_close

## Example Interaction

User: "Go to example.com and click the login button"

1. browser_launch → Launch browser
2. browser_navigate → Go to example.com
3. browser_snapshot → See what's on the page
4. Find button with name containing "login" or "Login"
5. browser_click → Click the login button
6. browser_snapshot → Verify the action worked
7. Report success to user`;

class BrowserAgent {
  private anthropic: Anthropic;
  private mcpClient: Client | null = null;
  private tools: Tool[] = [];
  private conversationHistory: Message[] = [];

  constructor() {
    this.anthropic = new Anthropic();
  }

  async initialize(): Promise<void> {
    console.log("Initializing MCP connection...");

    // Create MCP client
    this.mcpClient = new Client(
      { name: "browser-agent", version: "1.0.0" },
      { capabilities: {} }
    );

    // Connect to MCP server via stdio
    const serverPath = new URL("../../mcp-browser-server/dist/index.js", import.meta.url).pathname;

    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    await this.mcpClient.connect(transport);

    // Get available tools
    const toolsResponse = await this.mcpClient.listTools();
    this.tools = toolsResponse.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.inputSchema as Record<string, unknown>,
    }));

    console.log(`Connected to MCP server. Available tools: ${this.tools.map((t) => t.name).join(", ")}`);
  }

  async processUserInput(userMessage: string): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    let response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: this.tools,
      messages: this.conversationHistory,
    });

    // Process tool calls in a loop
    while (response.stop_reason === "tool_use") {
      const assistantContent = response.content;
      this.conversationHistory.push({
        role: "assistant",
        content: assistantContent,
      });

      // Execute each tool call
      const toolResults: ContentBlock[] = [];
      for (const block of assistantContent) {
        if (block.type === "tool_use") {
          console.log(`\n[Executing tool: ${block.name}]`);
          if (block.input && Object.keys(block.input).length > 0) {
            console.log(`[Input: ${JSON.stringify(block.input)}]`);
          }

          const result = await this.executeTool(block.name, block.input as Record<string, unknown>);
          console.log(`[Result: ${result.substring(0, 200)}${result.length > 200 ? "..." : ""}]`);

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          } as any);
        }
      }

      this.conversationHistory.push({
        role: "user",
        content: toolResults,
      });

      // Get next response
      response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: this.tools,
        messages: this.conversationHistory,
      });
    }

    // Extract final text response
    const finalContent = response.content;
    this.conversationHistory.push({
      role: "assistant",
      content: finalContent,
    });

    const textBlocks = finalContent.filter((block) => block.type === "text");
    return textBlocks.map((block) => (block as { text: string }).text).join("\n");
  }

  private async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    if (!this.mcpClient) {
      return JSON.stringify({ success: false, message: "MCP client not initialized" });
    }

    try {
      const result = await this.mcpClient.callTool({ name, arguments: args });
      const content = result.content as Array<{ type: string; text?: string }>;
      return content.map((c) => c.text || "").join("\n");
    } catch (error) {
      return JSON.stringify({ success: false, message: `Tool execution failed: ${error}` });
    }
  }

  async close(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
  }
}

// Main interactive loop
async function main() {
  const agent = new BrowserAgent();

  try {
    await agent.initialize();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n===========================================");
    console.log("Browser Automation Agent Ready");
    console.log("===========================================");
    console.log("Enter natural language instructions to control the browser.");
    console.log("Type 'exit' or 'quit' to end the session.\n");

    const prompt = () => {
      rl.question("You: ", async (input) => {
        const trimmedInput = input.trim();

        if (trimmedInput.toLowerCase() === "exit" || trimmedInput.toLowerCase() === "quit") {
          console.log("\nClosing browser and shutting down...");
          await agent.close();
          rl.close();
          process.exit(0);
        }

        if (!trimmedInput) {
          prompt();
          return;
        }

        try {
          const response = await agent.processUserInput(trimmedInput);
          console.log(`\nAgent: ${response}\n`);
        } catch (error) {
          console.error(`\nError: ${error}\n`);
        }

        prompt();
      });
    };

    prompt();
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    process.exit(1);
  }
}

main();
