# AI Pipeline Studio — UI Mockups

## Screen 1: Main Pipeline Editor (Default View)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Pipeline Studio    │ Untitled Pipeline ▾ │           │ Enter input... │ ▶ Run │
├──────────┬───────────────────────────────────────────────────────┬───────────────┤
│ NODES    │                                                       │               │
│          │   · · · · · · · · · · · · · · · · · · · · · · · ·     │               │
│ ┌──────┐ │         ╔══════════╗       ╔══════════╗               │               │
│ │📥 In │ │         ║ 📥 Input ║──────▶║ 🤖 Agent ║               │               │
│ └──────┘ │         ║   Data   ║       ║ Research ║               │               │
│ ┌──────┐ │         ╚══════════╝       ╚═════╤════╝               │               │
│ │🤖 AI │ │                                  │                    │               │
│ │Agent │ │                                  ▼                    │               │
│ └──────┘ │                            ╔══════════╗               │               │
│ ┌──────┐ │                            ║ 🤖 Agent ║               │               │
│ │🔀 If │ │                            ║  Writer  ║               │  No node      │
│ └──────┘ │                            ╚═════╤════╝               │  selected     │
│ ┌──────┐ │                                  │                    │               │
│ │🔁Loop│ │                                  ▼                    │  Click a node │
│ └──────┘ │                            ╔══════════╗               │  to configure │
│ ┌──────┐ │                            ║ 🤖 Agent ║               │  it here.     │
│ │⚡Para│ │                            ║  Editor  ║               │               │
│ └──────┘ │                            ╚═════╤════╝               │               │
│ ┌──────┐ │                                  │                    │               │
│ │📤 Out│ │                                  ▼                    │               │
│ └──────┘ │                            ╔══════════╗               │               │
│──────────│                            ║ 📤Output ║               │               │
│ QUICK    │                            ║  Result  ║               │               │
│ TEMPLATES│                            ╚══════════╝               │               │
│          │                                                       │               │
│ Content  │   · · · · · · · · · · · · · · · · · · · · · · · ·     │               │
│ Writer   │                                                       │               │
│          │ 4 nodes │ 3 connections                  [MiniMap]     │               │
│ Data     ├───────────────────────────────────────────────────────┤               │
│ Analyst  │                                                       │               │
│          │                                                       │               │
│ Support  │                                                       │               │
│ Router   │                                                       │               │
└──────────┴───────────────────────────────────────────────────────┴───────────────┘
```

**Key interactions:**
- Drag nodes from left palette onto canvas
- Click nodes to select and configure
- Drag between node ports to create connections
- Pan and zoom canvas with mouse/trackpad
- Click "Run" to execute pipeline

---

## Screen 2: Agent Configuration Panel (Right Side)

```
┌─────────────────────────────────────────┐
│ Agent Configuration                   ✕ │
├─────────────────────────────────────────┤
│ [General] [Prompt] [I/O] [Advanced]    │
├─────────────────────────────────────────┤
│                                         │
│ System Prompt                           │
│ (defines agent personality and behavior)│
│ ┌─────────────────────────────────────┐ │
│ │ You are a talented blog writer      │ │
│ │ known for engaging, well-researched │ │
│ │ articles. Write in a conversational │ │
│ │ yet authoritative tone. Use short   │ │
│ │ paragraphs, clear transitions, and  │ │
│ │ concrete examples.                  │ │
│ │                                     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ 187 characters                          │
│                                         │
│ User Prompt Template                    │
│ (use {{input}} for pipeline data)       │
│ ┌─────────────────────────────────────┐ │
│ │ Write a complete blog post based    │ │
│ │ on this outline:                    │ │
│ │                                     │ │
│ │ {{input}}                           │ │
│ │                                     │ │
│ │ Requirements:                       │ │
│ │ - 1500-2000 words                   │ │
│ │ - Engaging introduction with hook   │ │
│ └─────────────────────────────────────┘ │
│ Variables: {{input}}, {{fieldName}}     │
│                                         │
│ Temperature: 0.7                        │
│ ├────────────●──────────┤               │
│ Precise (0)      Creative (2)          │
│                                         │
│ Max Tokens                              │
│ ┌─────────────────────────────────────┐ │
│ │ 4096                                │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

---

## Screen 3: Execution Dashboard (During Pipeline Run)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Pipeline Studio    │ Blog Post Writer   │           │ AI in Health.. │ ▶ Run │
├──────────┬────────────────────────────────────────────────┬──────────────────────┤
│          │                                                │ Pipeline Execution   │
│          │     ╔══════════╗      ╔══════════╗             │ abc12345             │
│          │     ║ 📥 Input ║─────▶║🤖Research║             │ [>>] Running         │
│          │     ║ ✅ done  ║      ║ 🔄 run.. ║             │                      │
│          │     ╚══════════╝      ╚═════╤════╝             │ Progress             │
│          │                             │                  │ ████░░░░░░ 2/5 (40%) │
│          │                             ▼                  │                      │
│          │                       ╔══════════╗             │ [Nodes][Output][Cost]│
│          │                       ║🤖Outline ║             │─────────────────────│
│          │                       ║ .. queue ║             │                      │
│          │                       ╚═════╤════╝             │ [OK] Input Data      │
│          │                             │                  │      0ms             │
│          │                             ▼                  │                      │
│          │                       ╔══════════╗             │ [>>] Researcher      │
│          │                       ║🤖 Writer ║             │      3.2s  842 tok   │
│          │                       ║ .. queue ║             │  ▼ expand             │
│          │                       ╚═════╤════╝             │ ┌──────────────────┐ │
│          │                             │                  │ │ Input: "AI in    │ │
│          │                             ▼                  │ │ Healthcare"      │ │
│          │                       ╔══════════╗             │ │                  │ │
│          │                       ║🤖 Editor ║             │ │ Output: "## Key  │ │
│          │                       ║ .. queue ║             │ │ Facts: AI in     │ │
│          │                       ╚═════╤════╝             │ │ healthcare is    │ │
│          │                             │                  │ │ projected to..." │ │
│          │                             ▼                  │ └──────────────────┘ │
│          │                       ╔══════════╗             │                      │
│          │                       ║📤 Output ║             │ [..] Outline Writer  │
│          │                       ║ .. queue ║             │      queued          │
│          │                       ╚══════════╝             │                      │
│          │                                                │ [..] Draft Writer    │
│          │                                                │      queued          │
│          │                                                │                      │
│          │                                                │ [Cancel]             │
└──────────┴────────────────────────────────────────────────┴──────────────────────┘
```

---

## Screen 4: Execution Complete — Metrics View

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Pipeline Studio    │ Blog Post Writer   │           │ AI in Health.. │ ▶ Run │
├──────────┬────────────────────────────────────────────────┬──────────────────────┤
│          │                                                │ Pipeline Execution   │
│          │     ╔══════════╗      ╔══════════╗             │ abc12345             │
│          │     ║ 📥 Input ║─────▶║🤖Research║             │ [OK] Completed       │
│          │     ║ ✅       ║      ║ ✅       ║             │                      │
│          │     ╚══════════╝      ╚═════╤════╝             │ Progress             │
│          │                             │                  │ ██████████ 5/5 100%  │
│          │                             ▼                  │                      │
│          │                       ╔══════════╗             │ [Nodes][Output][Cost]│
│          │                       ║🤖Outline ║             │─────────────────────│
│          │                       ║ ✅       ║             │                      │
│          │                       ╚═════╤════╝             │  Total Duration      │
│          │                             │                  │  ┌────────────────┐  │
│          │                             ▼                  │  │   42.3 sec     │  │
│          │                       ╔══════════╗             │  └────────────────┘  │
│          │                       ║🤖 Writer ║             │                      │
│          │                       ║ ✅       ║             │  Total Tokens        │
│          │                       ╚═════╤════╝             │  ┌────────────────┐  │
│          │                             │                  │  │   12,847       │  │
│          │                             ▼                  │  └────────────────┘  │
│          │                       ╔══════════╗             │                      │
│          │                       ║🤖 Editor ║             │  Estimated Cost      │
│          │                       ║ ✅       ║             │  ┌────────────────┐  │
│          │                       ╚═════╤════╝             │  │   $0.0847      │  │
│          │                             │                  │  └────────────────┘  │
│          │                             ▼                  │                      │
│          │                       ╔══════════╗             │  Nodes Executed      │
│          │                       ║📤 Output ║             │  ┌────────────────┐  │
│          │                       ║ ✅       ║             │  │   5 / 5        │  │
│          │                       ╚══════════╝             │  └────────────────┘  │
│          │                                                │                      │
│          │                                                │  [Retry]  [Export]   │
└──────────┴────────────────────────────────────────────────┴──────────────────────┘
```

---

## Screen 5: Template Marketplace (Future)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Pipeline Studio   │ My Pipelines │ Marketplace │ Settings        │ ▸ Profile │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  🏪 Template Marketplace                               Search templates... 🔍    │
│                                                                                  │
│  Categories: [All] [Content] [Data] [Support] [Code] [Marketing] [Education]    │
│                                                                                  │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐        │
│  │ 📝 Blog Post Writer │ │ 📊 Data Analyst     │ │ 🎧 Support Router  │        │
│  │                     │ │                     │ │                     │        │
│  │ End-to-end blog     │ │ Clean, analyze,     │ │ Classify tickets,   │        │
│  │ creation with       │ │ generate insights,  │ │ route to specialist │        │
│  │ research, outline,  │ │ and format exec     │ │ agents, QA check    │        │
│  │ draft, and editing  │ │ reports.            │ │ responses.          │        │
│  │                     │ │                     │ │                     │        │
│  │ 4 agents │ ★ 4.8    │ │ 4 agents │ ★ 4.6   │ │ 7 agents │ ★ 4.9   │        │
│  │ 2,847 uses │ FREE   │ │ 1,203 uses │ FREE  │ │ 956 uses │ $9.99   │        │
│  │                     │ │                     │ │                     │        │
│  │ [Use Template]      │ │ [Use Template]      │ │ [Buy & Use]         │        │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘        │
│                                                                                  │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐        │
│  │ 💻 Code Reviewer    │ │ 📧 Email Campaign   │ │ 🎓 Essay Grader    │        │
│  │                     │ │                     │ │                     │        │
│  │ Multi-agent code    │ │ Generate, A/B test, │ │ Grade student       │        │
│  │ review with bug     │ │ and optimize email  │ │ essays with rubric  │        │
│  │ detection and fix   │ │ marketing copy.     │ │ and feedback.       │        │
│  │ suggestions.        │ │                     │ │                     │        │
│  │                     │ │                     │ │                     │        │
│  │ 4 agents │ ★ 4.7    │ │ 3 agents │ ★ 4.3   │ │ 3 agents │ ★ 4.5   │        │
│  │ 3,412 uses │ FREE   │ │ 782 uses │ $4.99   │ │ 421 uses │ FREE    │        │
│  │                     │ │                     │ │                     │        │
│  │ [Use Template]      │ │ [Buy & Use]         │ │ [Use Template]      │        │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘        │
│                                                                                  │
│  Showing 1-6 of 127 templates                           [1] [2] [3] ... [22] ▸  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Screen 6: Pricing Page

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Pipeline Studio   │ Features │ Pricing │ Docs │ Templates         │ Sign In  │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│                    Choose the plan that fits your workflow                        │
│                                                                                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐    │
│  │     FREE       │ │    STARTER     │ │      PRO       │ │  ENTERPRISE    │    │
│  │                │ │                │ │   ★ Popular    │ │                │    │
│  │    $0/mo       │ │   $29/mo       │ │   $79/mo       │ │   Custom       │    │
│  │                │ │                │ │                │ │                │    │
│  │ ✓ 3 pipelines  │ │ ✓ 20 pipelines │ │ ✓ Unlimited    │ │ ✓ Unlimited    │    │
│  │ ✓ 100 runs/mo  │ │ ✓ 1K runs/mo   │ │ ✓ 10K runs/mo  │ │ ✓ Unlimited    │    │
│  │ ✓ OpenAI only  │ │ ✓ All providers│ │ ✓ All providers│ │ ✓ All providers│    │
│  │ ✓ Community    │ │ ✓ Basic tpls   │ │ ✓ Premium tpls │ │ ✓ Custom tpls  │    │
│  │   templates    │ │ ✓ Email support│ │ ✓ API access   │ │ ✓ SSO / SAML   │    │
│  │                │ │                │ │ ✓ 5 team seats │ │ ✓ Audit logs   │    │
│  │                │ │                │ │ ✓ Priority     │ │ ✓ On-premise   │    │
│  │                │ │                │ │   execution    │ │ ✓ Dedicated    │    │
│  │                │ │                │ │                │ │   support      │    │
│  │                │ │                │ │                │ │ ✓ SLA          │    │
│  │                │ │                │ │                │ │                │    │
│  │  [Get Started] │ │ [Start Trial]  │ │ [Start Trial]  │ │ [Contact Us]   │    │
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘    │
│                                                                                  │
│                    All paid plans include 14-day free trial                       │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```
