import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium, Browser, Page, BrowserContext } from "playwright";

// Types
interface AccessibilityNode {
  role: string;
  name: string;
  value?: string;
  description?: string;
  checked?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  children?: AccessibilityNode[];
}

interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

// Browser state
let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

// Tool definitions
const tools: Tool[] = [
  {
    name: "browser_launch",
    description: "Launch a new browser instance",
    inputSchema: {
      type: "object",
      properties: {
        headless: {
          type: "boolean",
          description: "Run browser in headless mode (default: false)",
        },
      },
    },
  },
  {
    name: "browser_navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to navigate to",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_snapshot",
    description:
      "Get accessibility snapshot of current page. Returns the accessibility tree with roles, names, and states of all elements.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "browser_click",
    description: "Click an element by its accessible name (aria-label or text content)",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "The accessible name of the element to click",
        },
        role: {
          type: "string",
          description: "Optional role to filter by (button, link, checkbox, etc.)",
        },
      },
      required: ["label"],
    },
  },
  {
    name: "browser_fill",
    description: "Fill text into an input field by its accessible name",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "The accessible name of the input field",
        },
        value: {
          type: "string",
          description: "The text to fill into the field",
        },
      },
      required: ["label", "value"],
    },
  },
  {
    name: "browser_select",
    description: "Select an option from a dropdown by accessible names",
    inputSchema: {
      type: "object",
      properties: {
        dropdownLabel: {
          type: "string",
          description: "The accessible name of the dropdown",
        },
        optionLabel: {
          type: "string",
          description: "The label of the option to select",
        },
      },
      required: ["dropdownLabel", "optionLabel"],
    },
  },
  {
    name: "browser_check",
    description: "Check or uncheck a checkbox by its accessible name",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "The accessible name of the checkbox",
        },
        checked: {
          type: "boolean",
          description: "Whether to check (true) or uncheck (false)",
        },
      },
      required: ["label", "checked"],
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the current page",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to save the screenshot",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "browser_get_text",
    description: "Get text content of an element by its accessible name",
    inputSchema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "The accessible name of the element",
        },
      },
      required: ["label"],
    },
  },
  {
    name: "browser_close",
    description: "Close the browser instance",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Tool implementations
async function launchBrowser(headless: boolean = false): Promise<ActionResult> {
  try {
    if (browser) {
      return { success: false, message: "Browser already launched" };
    }
    browser = await chromium.launch({ headless });
    context = await browser.newContext();
    page = await context.newPage();
    return { success: true, message: "Browser launched successfully" };
  } catch (error) {
    return { success: false, message: `Failed to launch browser: ${error}` };
  }
}

async function navigate(url: string): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    return { success: true, message: `Navigated to ${url}` };
  } catch (error) {
    return { success: false, message: `Navigation failed: ${error}` };
  }
}

async function getAccessibilitySnapshot(): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    const snapshot = await page.accessibility.snapshot();
    return {
      success: true,
      message: "Accessibility snapshot captured",
      data: snapshot,
    };
  } catch (error) {
    return { success: false, message: `Failed to get snapshot: ${error}` };
  }
}

async function clickElement(label: string, role?: string): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    if (role) {
      await page.getByRole(role as any, { name: label }).click();
    } else {
      // Try multiple strategies
      const locator = page.getByLabel(label).or(page.getByRole("button", { name: label }))
        .or(page.getByRole("link", { name: label }))
        .or(page.getByText(label, { exact: true }));
      await locator.first().click();
    }
    return { success: true, message: `Clicked element: ${label}` };
  } catch (error) {
    return { success: false, message: `Failed to click element "${label}": ${error}` };
  }
}

async function fillInput(label: string, value: string): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    const locator = page.getByLabel(label).or(page.getByPlaceholder(label));
    await locator.first().fill(value);
    return { success: true, message: `Filled "${label}" with "${value}"` };
  } catch (error) {
    return { success: false, message: `Failed to fill input "${label}": ${error}` };
  }
}

async function selectOption(dropdownLabel: string, optionLabel: string): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    await page.getByLabel(dropdownLabel).selectOption({ label: optionLabel });
    return { success: true, message: `Selected "${optionLabel}" in "${dropdownLabel}"` };
  } catch (error) {
    return { success: false, message: `Failed to select option: ${error}` };
  }
}

async function setCheckbox(label: string, checked: boolean): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    const checkbox = page.getByLabel(label);
    if (checked) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
    return { success: true, message: `${checked ? "Checked" : "Unchecked"} "${label}"` };
  } catch (error) {
    return { success: false, message: `Failed to set checkbox "${label}": ${error}` };
  }
}

async function takeScreenshot(path: string): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    await page.screenshot({ path, fullPage: true });
    return { success: true, message: `Screenshot saved to ${path}` };
  } catch (error) {
    return { success: false, message: `Failed to take screenshot: ${error}` };
  }
}

async function getText(label: string): Promise<ActionResult> {
  if (!page) {
    return { success: false, message: "Browser not launched. Call browser_launch first." };
  }
  try {
    const locator = page.getByLabel(label).or(page.getByText(label));
    const text = await locator.first().textContent();
    return { success: true, message: "Text retrieved", data: text };
  } catch (error) {
    return { success: false, message: `Failed to get text: ${error}` };
  }
}

async function closeBrowser(): Promise<ActionResult> {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      context = null;
      page = null;
    }
    return { success: true, message: "Browser closed" };
  } catch (error) {
    return { success: false, message: `Failed to close browser: ${error}` };
  }
}

// Create and configure server
const server = new Server(
  {
    name: "mcp-browser-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  let result: ActionResult;

  switch (name) {
    case "browser_launch":
      result = await launchBrowser(args?.headless as boolean);
      break;
    case "browser_navigate":
      result = await navigate(args?.url as string);
      break;
    case "browser_snapshot":
      result = await getAccessibilitySnapshot();
      break;
    case "browser_click":
      result = await clickElement(args?.label as string, args?.role as string);
      break;
    case "browser_fill":
      result = await fillInput(args?.label as string, args?.value as string);
      break;
    case "browser_select":
      result = await selectOption(args?.dropdownLabel as string, args?.optionLabel as string);
      break;
    case "browser_check":
      result = await setCheckbox(args?.label as string, args?.checked as boolean);
      break;
    case "browser_screenshot":
      result = await takeScreenshot(args?.path as string);
      break;
    case "browser_get_text":
      result = await getText(args?.label as string);
      break;
    case "browser_close":
      result = await closeBrowser();
      break;
    default:
      result = { success: false, message: `Unknown tool: ${name}` };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Browser Server running on stdio");
}

main().catch(console.error);
