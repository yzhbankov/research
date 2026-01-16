# AI-MCP-Browser Accessibility Examples

This directory contains working examples demonstrating AI agents controlling web browsers through accessibility-based interactions using MCP (Model Context Protocol).

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User Input    │────▶│    AI Agent     │────▶│   MCP Server    │
│ (Natural Lang)  │     │  (Claude LLM)   │     │  (Playwright)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  React Web App  │
                                                │ (A11y-Enhanced) │
                                                └─────────────────┘
```

## Components

### 1. MCP Browser Server (`mcp-browser-server/`)

A TypeScript MCP server that exposes browser control tools using Playwright:

- `browser_launch` - Launch browser instance
- `browser_navigate` - Navigate to URL
- `browser_snapshot` - Get accessibility tree snapshot
- `browser_click` - Click element by accessible name
- `browser_fill` - Fill input by accessible name
- `browser_select` - Select dropdown option
- `browser_check` - Check/uncheck checkbox
- `browser_screenshot` - Take screenshot
- `browser_get_text` - Get element text
- `browser_close` - Close browser

### 2. AI Agent (`ai-agent/`)

A TypeScript AI agent that:

- Accepts natural language instructions
- Uses Claude to interpret commands
- Calls MCP tools to control the browser
- Reports results to the user

### 3. Web Application (`web-app/`)

A React application with full accessibility support:

- Semantic HTML structure
- ARIA labels on all interactive elements
- Proper roles and states
- Focus management
- Screen reader compatible

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Anthropic API key

### Installation

```bash
# Install MCP server dependencies
cd mcp-browser-server
npm install
npx playwright install chromium
npm run build

# Install AI agent dependencies
cd ../ai-agent
npm install
npm run build

# Install web app dependencies
cd ../web-app
npm install
```

### Configuration

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

## Running the Example

### Step 1: Start the Web Application

```bash
cd web-app
npm start
# App runs at http://localhost:3000
```

### Step 2: Run the AI Agent

```bash
cd ai-agent
npm start
```

### Step 3: Interact with Natural Language

Example commands:

```
You: Go to localhost:3000 and search for headphones

You: Add the Wireless Headphones to my cart

You: Open the login form and enter test@example.com as email

You: Click the checkout button
```

## How It Works

1. **User provides natural language instruction**
   - "Search for headphones and add the first result to cart"

2. **AI agent interprets the instruction**
   - Breaks down into steps: navigate, search, click add to cart

3. **MCP server executes browser actions**
   - Uses Playwright with accessibility-based selectors

4. **Web app responds with accessible UI**
   - All elements have aria-labels the AI can understand

5. **AI verifies and reports results**
   - Takes snapshots to confirm actions succeeded

## Key Accessibility Patterns

### Input Fields
```html
<input
  aria-label="Search products by name or keyword"
  placeholder="Enter product name"
/>
```

### Buttons
```html
<button aria-label="Add Wireless Headphones to cart">
  Add to Cart
</button>
```

### Dynamic Content
```html
<div role="status" aria-live="polite">
  Product added to cart
</div>
```

### Modals
```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
```

## Extending the Example

### Adding New MCP Tools

Edit `mcp-browser-server/src/index.ts`:

```typescript
// Add tool definition
const tools: Tool[] = [
  // ... existing tools
  {
    name: "browser_scroll",
    description: "Scroll the page",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["up", "down"] }
      }
    }
  }
];

// Add implementation
async function scroll(direction: string): Promise<ActionResult> {
  // Implementation
}
```

### Adding Accessible Components

When adding new React components, ensure:

1. All interactive elements have `aria-label`
2. Forms have proper `<label>` associations
3. Dynamic content uses `aria-live` regions
4. Focus is managed for modals/dialogs
5. State changes are announced

## Troubleshooting

### "Browser not launched" error
Call `browser_launch` before other browser commands.

### "Could not find element" error
- Take an accessibility snapshot first
- Check the exact aria-label text
- Ensure the element is visible/enabled

### MCP connection issues
- Ensure the MCP server is built: `npm run build`
- Check the server path in the agent configuration
