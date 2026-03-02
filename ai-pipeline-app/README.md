# AI Pipeline Studio

**Visual AI Agent Pipeline Builder** — Design, configure, and execute chains of AI agents through an intuitive drag-and-drop interface. No coding required.

```
  ╔══════════╗       ╔══════════╗       ╔══════════╗       ╔══════════╗
  ║ 📥 Input ║──────▶║ 🤖 Agent ║──────▶║ 🤖 Agent ║──────▶║ 📤 Output║
  ║   Data   ║       ║ Analyze  ║       ║ Generate ║       ║  Result  ║
  ╚══════════╝       ╚══════════╝       ╚══════════╝       ╚══════════╝
```

## What Is This?

AI Pipeline Studio lets you **visually build multi-agent AI workflows**. Instead of writing code to chain LLM calls together, you:

1. **Drag nodes** onto a visual canvas (inputs, AI agents, conditions, outputs)
2. **Connect them** by drawing edges between ports
3. **Configure each agent** — pick a model, write prompts, set temperature
4. **Provide input data** and click **Run**
5. **Watch execution** in real-time with per-node status, streaming output, and cost tracking

Think of it as **"Figma meets LangChain"** — the power of multi-agent orchestration with the accessibility of a visual builder.

---

## Key Features

### Visual Pipeline Editor
- Drag-and-drop canvas built on ReactFlow
- Node types: Input, AI Agent, Condition, Loop, Parallel, Output
- Auto-layout and snap-to-grid
- Minimap for large pipelines
- Zoom, pan, and multi-select

### Deep Agent Configuration
- **4-tab config panel**: General, Prompt, I/O, Advanced
- System prompt editor with character count
- User prompt templates with `{{variable}}` interpolation
- Temperature slider, max tokens, top-p controls
- Per-agent retry policy and timeout settings

### Multi-Provider Support
| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini, o1-preview, o1-mini |
| Anthropic | Claude Opus 4, Claude Sonnet 4, Claude Haiku 4.5 |
| Google | Gemini 2.0 Flash, Gemini 2.0 Pro |
| Local | Ollama (Llama 3.1, Mistral, CodeLlama) |
| Custom | Any OpenAI-compatible endpoint |

### Real-Time Execution Dashboard
- Live progress bar and per-node status
- Streaming token output
- Token usage and cost tracking per node
- Error details with retry information
- Expandable node details (input/output inspection)

### Pipeline Templates
4 pre-built templates included:
- **Blog Post Writer** — Research → Outline → Draft → Edit (4 agents)
- **Customer Support Router** — Classify → Route → Respond → QA (7 agents)
- **Data Analysis & Reporting** — Clean → Analyze → Insights → Format (4 agents)
- **Automated Code Review** — Analyze + Bug Find → Improve → Summarize (4 agents)

### Pipeline Engine
- Topological sort for correct execution order
- Parallel execution support
- Conditional branching
- Configurable retry with exponential backoff
- Event-driven architecture for real-time updates
- Pipeline validation (cycle detection, connectivity checks)

---

## Architecture

```
ai-pipeline-app/
├── src/
│   ├── models/
│   │   └── types.ts              # Core type definitions (50+ interfaces)
│   ├── engine/
│   │   ├── PipelineEngine.ts     # Execution engine (topological sort, retry, events)
│   │   ├── providers.ts          # AI provider adapters (OpenAI, Anthropic, Mock)
│   │   └── EventEmitter.ts       # Typed event system
│   ├── store/
│   │   └── pipelineStore.ts      # Zustand state management
│   ├── components/
│   │   ├── App.tsx               # Main application shell
│   │   ├── canvas/
│   │   │   ├── PipelineCanvas.tsx # Visual graph editor
│   │   │   └── nodes/
│   │   │       ├── AgentNode.tsx  # AI agent node
│   │   │       ├── InputNode.tsx  # Data input node
│   │   │       ├── OutputNode.tsx # Result output node
│   │   │       └── ConditionNode.tsx # Branching node
│   │   ├── panels/
│   │   │   ├── AgentConfigPanel.tsx  # Agent configuration (4 tabs)
│   │   │   └── NodePalette.tsx       # Draggable node palette
│   │   └── dashboard/
│   │       └── ExecutionDashboard.tsx # Real-time execution monitoring
│   └── templates/
│       └── samplePipelines.ts    # 4 pre-built pipeline templates
├── docs/
│   ├── BUSINESS_PLAN.md          # Full business plan & monetization
│   └── MOCKUPS.md                # ASCII mockups of 6 key screens
├── package.json
├── tsconfig.json
└── README.md
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Graph Editor | ReactFlow |
| State Management | Zustand |
| Styling | Tailwind CSS |
| AI SDKs | OpenAI SDK, Anthropic SDK |
| Validation | Zod |
| Build | Vite |
| Testing | Vitest |

---

## Getting Started

```bash
# Clone and install
cd ai-pipeline-app
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Configure API Keys

API keys are stored in memory only (never persisted to disk). Enter them in the Settings panel:

1. Click **Settings** in the top toolbar
2. Enter your API keys for each provider you want to use
3. Keys are validated on entry

---

## How It Works

### 1. Build Your Pipeline

Drag nodes from the left palette onto the canvas. Available node types:

| Node | Purpose |
|------|---------|
| 📥 **Input** | Entry point — manual text, file upload, API endpoint, or webhook |
| 🤖 **AI Agent** | Configurable LLM agent with custom system/user prompts |
| 🔀 **Condition** | Branch pipeline based on an expression (e.g., `input.score > 0.8`) |
| 🔁 **Loop** | Repeat a section until a stop condition is met |
| ⚡ **Parallel** | Execute multiple agents simultaneously (race, all, or any) |
| 📤 **Output** | Collect results — display, save to file, API, webhook, or email |

### 2. Configure Each Agent

Click an agent node to open the configuration panel:

- **General**: Name, description, role, AI provider, model
- **Prompt**: System prompt (agent personality), user prompt template with `{{input}}` variables
- **I/O**: Input/output data types and JSON schemas
- **Advanced**: Streaming, retry policy, timeout, top-p

### 3. Connect & Run

- Draw edges between nodes to define data flow
- Enter your pipeline input in the top toolbar
- Click **Run Pipeline**
- Watch execution in the right-side dashboard

### 4. Monitor & Iterate

The execution dashboard shows:
- Real-time progress with per-node status
- Streaming output from each agent
- Token usage and cost per node
- Total pipeline metrics (duration, tokens, cost)

---

## Business Model

See [docs/BUSINESS_PLAN.md](docs/BUSINESS_PLAN.md) for the complete business plan.

### Pricing Overview

| Plan | Price | Key Features |
|------|-------|-------------|
| **Free** | $0/mo | 3 pipelines, 100 runs/mo |
| **Starter** | $29/mo | 20 pipelines, 1K runs/mo, all providers |
| **Pro** | $79/mo | Unlimited pipelines, 10K runs/mo, API access, team |
| **Enterprise** | Custom | SSO, audit logs, on-premise, SLA |

### Revenue Streams
1. **SaaS subscriptions** — tiered plans
2. **Usage-based add-ons** — extra runs, seats, logs
3. **Template marketplace** — 70/30 creator revenue share
4. **API & embed SDK** — programmatic pipeline execution
5. **Enterprise contracts** — custom deployment + support

---

## UI Mockups

See [docs/MOCKUPS.md](docs/MOCKUPS.md) for detailed ASCII mockups of all 6 screens:

1. Main Pipeline Editor
2. Agent Configuration Panel
3. Execution Dashboard (Running)
4. Execution Complete (Metrics)
5. Template Marketplace
6. Pricing Page

---

## Sample Pipeline: Blog Post Writer

```
📥 Blog Topic
   │
   ▼
🤖 Researcher (GPT-4o, temp=0.3)
   "Research the topic thoroughly..."
   │
   ▼
🤖 Outline Writer (GPT-4o-mini, temp=0.5)
   "Create a detailed outline..."
   │
   ▼
🤖 Draft Writer (Claude Sonnet, temp=0.7)
   "Write a complete blog post..."
   │
   ▼
🤖 Editor (Claude Sonnet, temp=0.3)
   "Edit and polish the blog post..."
   │
   ▼
📤 Final Article
```

Each agent has a specialized role, model, and prompt. Data flows automatically from one to the next, with the output of each agent becoming the input of the next.

---

## Roadmap

### Phase 1 — MVP (Current)
- [x] Core type system and data models
- [x] Pipeline execution engine with topological sort
- [x] AI provider adapters (OpenAI, Anthropic, Mock)
- [x] Visual pipeline editor (ReactFlow-based)
- [x] Agent configuration panel (4-tab editor)
- [x] Node palette with drag-and-drop
- [x] Execution dashboard with real-time monitoring
- [x] 4 sample pipeline templates
- [x] Business plan and monetization strategy

### Phase 2 — Beta
- [ ] Backend API (Node.js + Fastify)
- [ ] Database persistence (PostgreSQL + Prisma)
- [ ] User authentication (Clerk)
- [ ] Pipeline versioning and history
- [ ] Template marketplace
- [ ] Webhook input/output support
- [ ] Pipeline import/export (JSON)

### Phase 3 — Launch
- [ ] Team collaboration (shared workspaces)
- [ ] API access for programmatic execution
- [ ] Billing and subscription management (Stripe)
- [ ] Advanced nodes (loops, parallel, aggregator)
- [ ] Custom function nodes (JavaScript)
- [ ] Integration connectors (Slack, Sheets, Notion)

### Phase 4 — Scale
- [ ] Enterprise features (SSO, audit logs, on-premise)
- [ ] Pipeline analytics and optimization suggestions
- [ ] A/B testing for prompt variations
- [ ] Mobile-responsive editor
- [ ] AI-assisted pipeline builder ("describe what you want")

---

## License

MIT
