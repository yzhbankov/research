# AI-MCP-Browser Accessibility Integration

## Technical Specification and Implementation Guide

### Overview

This document provides technical instructions for implementing an AI agent system that uses MCP (Model Context Protocol) servers to control web browsers, with accessibility attributes as the primary interface layer.

### Prerequisites

- Node.js 18+ or Python 3.10+
- Playwright or Puppeteer
- MCP SDK
- Access to an LLM API (Claude, GPT, etc.)

---

## Part 1: Application-Side Requirements

### 1.1 Accessibility Attribute Standards

All interactive UI elements MUST include appropriate accessibility attributes:

**Required Attributes by Element Type:**

| Element Type | Required Attributes |
|-------------|---------------------|
| Buttons | `aria-label`, `role="button"` (if not `<button>`) |
| Text Inputs | `aria-label` or `aria-labelledby`, `type` |
| Dropdowns | `aria-label`, `role="listbox"` or `role="combobox"` |
| Links | Descriptive text content or `aria-label` |
| Modals | `role="dialog"`, `aria-labelledby`, `aria-modal="true"` |
| Navigation | `role="navigation"`, `aria-label` |
| Forms | `aria-label` on `<form>`, labels on all fields |

### 1.2 Naming Conventions

Accessibility labels should follow these patterns:

```
Action + Object + [Context]

Examples:
- "Submit login form"
- "Search products"
- "Open user menu"
- "Select departure date"
- "Remove item from cart"
- "Expand shipping options"
```

### 1.3 Implementation Checklist

```markdown
[ ] All buttons have aria-label describing their action
[ ] All form inputs have associated labels
[ ] All images have alt text (empty string for decorative)
[ ] Navigation landmarks are properly labeled
[ ] Dynamic content has aria-live regions
[ ] Focus order follows logical reading order
[ ] Modal dialogs trap focus correctly
[ ] Error messages are associated with their fields
[ ] Loading states are announced
[ ] Page titles are descriptive and unique
```

---

## Part 2: MCP Server Implementation

### 2.1 Server Structure

```typescript
// mcp-browser-server/index.ts

import { Server } from "@modelcontextprotocol/sdk/server";
import { chromium, Browser, Page } from "playwright";

interface AccessibilityNode {
  role: string;
  name: string;
  value?: string;
  description?: string;
  children?: AccessibilityNode[];
  state?: Record<string, boolean>;
}

class BrowserMCPServer {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize() {
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
  }

  // Tool: Get accessibility snapshot
  async getAccessibilitySnapshot(): Promise<AccessibilityNode> {
    if (!this.page) throw new Error("Browser not initialized");

    const snapshot = await this.page.accessibility.snapshot();
    return this.processSnapshot(snapshot);
  }

  // Tool: Find element by accessible name
  async findByAccessibleName(name: string): Promise<ElementInfo[]> {
    if (!this.page) throw new Error("Browser not initialized");

    const elements = await this.page.getByLabel(name).all();
    // Also check by role + name
    const byRole = await this.page.getByRole('button', { name }).all();

    return this.mergeAndDedupe(elements, byRole);
  }

  // Tool: Click element by label
  async clickByLabel(label: string): Promise<ActionResult> {
    if (!this.page) throw new Error("Browser not initialized");

    try {
      await this.page.getByLabel(label).click();
      return { success: true, message: `Clicked element: ${label}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Tool: Type into element by label
  async typeByLabel(label: string, text: string): Promise<ActionResult> {
    if (!this.page) throw new Error("Browser not initialized");

    try {
      await this.page.getByLabel(label).fill(text);
      return { success: true, message: `Typed into: ${label}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Tool: Navigate to URL
  async navigate(url: string): Promise<ActionResult> {
    if (!this.page) throw new Error("Browser not initialized");

    try {
      await this.page.goto(url);
      await this.page.waitForLoadState('domcontentloaded');
      return { success: true, message: `Navigated to: ${url}` };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
```

### 2.2 MCP Tool Definitions

```typescript
const tools = [
  {
    name: "browser_navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to navigate to" }
      },
      required: ["url"]
    }
  },
  {
    name: "browser_snapshot",
    description: "Get accessibility snapshot of current page",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "browser_click",
    description: "Click an element by its accessible label",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "The aria-label or accessible name of the element"
        }
      },
      required: ["label"]
    }
  },
  {
    name: "browser_type",
    description: "Type text into an input by its accessible label",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "The aria-label or accessible name of the input"
        },
        text: {
          type: "string",
          description: "The text to type"
        }
      },
      required: ["label", "text"]
    }
  },
  {
    name: "browser_select",
    description: "Select an option from a dropdown by accessible labels",
    inputSchema: {
      type: "object",
      properties: {
        dropdownLabel: {
          type: "string",
          description: "The accessible name of the dropdown"
        },
        optionLabel: {
          type: "string",
          description: "The accessible name of the option to select"
        }
      },
      required: ["dropdownLabel", "optionLabel"]
    }
  }
];
```

---

## Part 3: AI Agent Configuration

### 3.1 System Prompt Template

```markdown
You are a web automation agent that controls a browser through
accessibility-based interactions.

## Your Capabilities
- Navigate to URLs
- Take accessibility snapshots to understand page content
- Click buttons and links by their accessible labels
- Type into form fields by their accessible labels
- Select options from dropdowns

## How to Interact with Pages

1. ALWAYS take an accessibility snapshot first to understand the page
2. Identify elements by their aria-label or accessible name
3. Use the exact label text when interacting with elements
4. Verify each action by taking a new snapshot afterward
5. Report any elements you cannot find

## Snapshot Interpretation

When you receive an accessibility snapshot, it contains:
- role: The type of element (button, textbox, link, etc.)
- name: The accessible label (this is what you use to interact)
- value: Current value for inputs
- state: Current states (pressed, expanded, checked, etc.)

## Example Workflow

User: "Search for 'wireless headphones' on the website"

1. Call browser_snapshot to see the current page
2. Find: textbox with name "Search products"
3. Call browser_type with label="Search products", text="wireless headphones"
4. Find: button with name "Submit search" or "Search"
5. Call browser_click with label="Submit search"
6. Call browser_snapshot to see results
7. Report what you found

## Important Rules

- Never guess element labels - always use snapshot first
- If an action fails, take a new snapshot and try again
- Describe what you see to the user as you work
- Ask for clarification if instructions are ambiguous
```

### 3.2 Example Agent Loop

```python
# agent.py

async def execute_task(user_instruction: str):
    """Main agent loop for executing user instructions."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_instruction}
    ]

    while True:
        # Get AI response
        response = await llm.chat(messages, tools=MCP_TOOLS)

        if response.stop_reason == "end_turn":
            # AI is done
            return response.content

        if response.stop_reason == "tool_use":
            # Execute MCP tools
            tool_results = []
            for tool_call in response.tool_calls:
                result = await mcp_client.call_tool(
                    tool_call.name,
                    tool_call.arguments
                )
                tool_results.append({
                    "tool_use_id": tool_call.id,
                    "content": result
                })

            # Add results to conversation
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
```

---

## Part 4: Testing and Validation

### 4.1 Accessibility Audit Script

```javascript
// audit-accessibility.js

async function auditPage(page) {
  const snapshot = await page.accessibility.snapshot();
  const issues = [];

  function checkNode(node, path = '') {
    const currentPath = path ? `${path} > ${node.role}` : node.role;

    // Check for missing names on interactive elements
    const interactiveRoles = ['button', 'link', 'textbox', 'combobox', 'checkbox'];
    if (interactiveRoles.includes(node.role) && !node.name) {
      issues.push({
        severity: 'error',
        message: `Interactive element without accessible name`,
        path: currentPath,
        role: node.role
      });
    }

    // Check for generic names
    const genericNames = ['click here', 'button', 'link', 'input'];
    if (node.name && genericNames.includes(node.name.toLowerCase())) {
      issues.push({
        severity: 'warning',
        message: `Generic accessible name: "${node.name}"`,
        path: currentPath
      });
    }

    // Recurse into children
    if (node.children) {
      node.children.forEach(child => checkNode(child, currentPath));
    }
  }

  checkNode(snapshot);
  return issues;
}
```

### 4.2 Integration Test Template

```typescript
// integration.test.ts

describe('AI Agent Accessibility Integration', () => {
  it('should complete a search workflow via natural language', async () => {
    const agent = new AIAgent(mcpServer);

    const result = await agent.execute(
      "Search for 'test product' and tell me the first result"
    );

    expect(result.success).toBe(true);
    expect(result.actions).toContain('browser_snapshot');
    expect(result.actions).toContain('browser_type');
    expect(result.actions).toContain('browser_click');
  });

  it('should handle missing accessibility labels gracefully', async () => {
    // Navigate to page with poor accessibility
    await mcpServer.navigate('/poorly-accessible-page');

    const result = await agent.execute("Click the submit button");

    expect(result.success).toBe(false);
    expect(result.error).toContain('Could not find element');
  });
});
```

---

## Part 5: Quick Reference

### Common Accessibility Selectors for MCP

```typescript
// By exact label
page.getByLabel('Submit form')

// By role and name
page.getByRole('button', { name: 'Submit' })

// By role only (returns all)
page.getByRole('textbox')

// By placeholder (fallback)
page.getByPlaceholder('Enter your email')

// By text content
page.getByText('Welcome back')
```

### Accessibility Snapshot Structure

```json
{
  "role": "WebArea",
  "name": "My Application",
  "children": [
    {
      "role": "navigation",
      "name": "Main navigation",
      "children": [
        { "role": "link", "name": "Home" },
        { "role": "link", "name": "Products" },
        { "role": "link", "name": "Contact" }
      ]
    },
    {
      "role": "main",
      "name": "Page content",
      "children": [
        {
          "role": "form",
          "name": "Search products",
          "children": [
            {
              "role": "textbox",
              "name": "Search query",
              "value": ""
            },
            {
              "role": "button",
              "name": "Search",
              "state": { "focusable": true }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Summary

This implementation guide provides a complete framework for building AI agents that interact with web applications through accessibility-first design. By ensuring applications are properly annotated with accessibility attributes and exposing browser control through MCP servers, we create a robust, maintainable system where even simple AI models can reliably execute complex web tasks through natural language instructions.

**Key Takeaways:**

1. Accessibility attributes serve as stable, semantic selectors
2. MCP servers provide a clean abstraction for browser control
3. AI agents interpret accessibility snapshots to understand pages
4. Applications must be built with accessibility-first principles
5. The system is more reliable than visual or DOM-based approaches
