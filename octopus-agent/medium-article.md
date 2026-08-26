# The Octopus Agent: One Repo, Eight Tentacles, No Backend

*A Claude Agent SDK pattern where the brain is stateless, a GitHub repo is the entire memory, and every MCP server is an arm that thinks for itself.*

---

## Most AI agents are built like a startup, not like an animal

Look at the architecture diagram of almost any "production AI agent" and you'll find the same shape:

- a **database** for conversation state,
- a **vector store** for memory,
- a **queue** for background jobs,
- an **admin UI** for editing prompts,
- an **audit log** table nobody reads,
- and somewhere in the corner, a small box labeled *LLM*.

Eighty percent of the code has nothing to do with the agent. It's plumbing. And it's plumbing you already own, for free, in a tool you use every day.

This article describes a different shape. It's small enough to build in an afternoon, and it holds up as it grows because every part of it is something engineers already know how to review, revert, and reason about.

The shape is an **octopus**.

---

## Why an octopus is the right mental model

An octopus has roughly 500 million neurons — about as many as a dog. The interesting part isn't the number, it's the *distribution*: only about a third sit in the central brain. The other two thirds live in the arms.

An octopus arm is not a puppet on a string. It has its own neural circuitry. It can find, grip, and identify an object largely on its own. The central brain doesn't micromanage the suckers — it decides *what the animal wants* and lets the arms work out *how*.

That is exactly the division of labor the Model Context Protocol gives you.

```
                         ┌──────────────────────┐
                         │   THE HEAD           │
                         │  Claude Agent SDK    │
                         │  loop (stateless)    │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │   THE SPINE: your GitHub repo       │
                 │   instructions in · results out     │
                 └──┬────┬────┬────┬────┬────┬────┬───┘
                    │    │    │    │    │    │    │
                  ╭─╯  ╭─╯  ╭─╯  ╭─╯  ╭─╯  ╭─╯  ╭─╯
                 ╱    ╱    ╱    ╱    ╱    ╱    ╱
              GitHub Slack Jira  DB  Web  S3  Sentry
              ────── ───── ────  ──  ───  ──  ──────
                    MCP servers = the tentacles
```

**The head** is a `query()` call. It holds no state between runs.
**The tentacles** are MCP servers. Each one already knows how to talk to its service — auth, pagination, rate limits, schemas. You didn't write any of it.
**The spine** — the part almost everyone gets wrong — is a plain GitHub repository.

---

## The one idea: the repository *is* the agent

Not "the repository holds the agent's code." The repository **is** the agent's identity, memory, permissions, and output.

Everything an agent needs to persist falls into three buckets, and git handles all three natively:

| The agent needs | Everyone builds | An octopus agent uses |
|---|---|---|
| Instructions / persona | Prompt table + admin UI | `CLAUDE.md`, `.claude/skills/` |
| Long-term memory | Vector DB | Markdown files, read with Grep |
| Work output | S3 + a results table | Commits and pull requests |
| Audit trail | `events` table | `git log` |
| Undo | ...nothing, usually | `git revert` |
| Capability config | Feature-flag service | `.mcp.json` |
| Human approval | Custom review queue | PR review |
| Experiments | Prompt versioning tool | branches |

Here is the whole thing:

```
my-agent/
├── CLAUDE.md               # who the agent is, how it behaves
├── .mcp.json               # which tentacles it grows
├── .claude/
│   ├── settings.json       # which tools it may touch, unattended
│   └── skills/
│       ├── triage/SKILL.md      # a procedure, in English
│       └── weekly-report/SKILL.md
├── missions/               # instructions IN
│   └── 2026-08-24-churn-analysis.md
├── results/                # work OUT
│   └── 2026-08-24-churn-analysis/
│       ├── report.md
│       └── query.sql
└── run.ts                  # ~40 lines. the head.
```

Two directories carry the entire runtime contract: **`missions/` is the inbox, `results/` is the outbox.** A mission is a markdown file a human (or another agent) writes. A result is a commit. That's the API.

---

## The head, in full

This is not pseudocode or an abridged version. This is the agent.

```typescript
// run.ts
import { query } from "@anthropic-ai/claude-agent-sdk";

const mission = process.argv[2]; // e.g. "missions/2026-08-24-churn-analysis.md"

for await (const message of query({
  prompt: `Read ${mission} and carry it out.
           Write everything you produce into results/<mission-slug>/.
           Commit your work on a new branch and open a pull request.`,
  options: {
    model: "claude-opus-5",

    // Claude Code's full harness: file tools, bash, search, safety rules.
    systemPrompt: { type: "preset", preset: "claude_code" },

    // Load CLAUDE.md, .claude/settings.json, .claude/skills/ and .mcp.json
    // from the repo itself. The repo configures the agent.
    settingSources: ["project"],

    // The suckers this arm may use, unattended.
    allowedTools: [
      "mcp__github__*",
      "mcp__postgres__execute_sql",
      "mcp__slack__send_message",
    ],
  },
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

The same thing in Python:

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

async def main(mission: str):
    options = ClaudeAgentOptions(
        model="claude-opus-5",
        system_prompt={"type": "preset", "preset": "claude_code"},
        setting_sources=["project"],
        allowed_tools=[
            "mcp__github__*",
            "mcp__postgres__execute_sql",
            "mcp__slack__send_message",
        ],
    )
    async for message in query(
        prompt=f"Read {mission} and carry it out. "
               f"Write results into results/<mission-slug>/, "
               f"commit on a branch, and open a pull request.",
        options=options,
    ):
        if isinstance(message, ResultMessage) and message.subtype == "success":
            print(message.result)

asyncio.run(main("missions/2026-08-24-churn-analysis.md"))
```

Notice what isn't there. No message history serialization. No memory store. No tool implementations. No retry queue. `settingSources: ["project"]` is the load-bearing line: it tells the SDK to read the agent's brain out of the checked-out repo.

---

## Growing a tentacle is a two-line diff

This is where the pattern stops being cute and starts being useful. Adding a capability isn't a code change — it's a config change:

```json
{
  "mcpServers": {
    "github":   { "type": "http", "url": "https://api.githubcopilot.com/mcp/",
                  "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" } },
    "postgres": { "command": "npx", "args": ["-y", "@bytebase/dbhub", "--config", "dbhub.toml"] },
    "sentry":   { "type": "http", "url": "https://mcp.sentry.dev/mcp" }
  }
}
```

Want the agent to see production errors? Add three lines and one entry to `allowedTools`. No deploy of your own code, no new tool schema, no integration test against Sentry's API. The arm arrives pre-wired.

Because `.mcp.json` lives in the repo, **the agent can propose its own new tentacle** — as a pull request. It hits a wall, notices there's an MCP server that would unblock it, edits the config, and opens a PR. A human merges or doesn't. The agent extends its own capabilities, and code review is the gate. That's self-extension with a brake pedal, and it costs you nothing to build: it's just the repo doing what repos do.

---

## The whole loop, driven by GitHub

Missions arrive as issues. Results arrive as pull requests. The agent runs where the code already runs:

```yaml
# .github/workflows/agent.yml
name: octopus
on:
  issues:
    types: [labeled]
  schedule:
    - cron: "0 7 * * 1"   # Monday morning tentacle-stretch

jobs:
  run:
    if: github.event.label.name == 'mission'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx tsx run.ts "issue:${{ github.event.issue.number }}"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.AGENT_PAT }}
```

Label an issue `mission`. A few minutes later a pull request appears containing the work, the reasoning, and the artifacts. Review it like you'd review a colleague's branch. Merge, or close it and write a better mission.

You now have a scheduler, a work queue, a permissions model, a review flow, a notification system, and a complete audit trail — and you wrote none of them.

---

## Five things you get for free that are hard to buy

**1. Memory that's greppable, not embedded.** The agent's memory is markdown in `results/`. It searches with Grep, the same way you do. You can read it. You can fix it by editing a file. Nobody has to explain a cosine similarity score to your product manager.

**2. Auditability without an audit system.** "Why did the agent do that?" `git log`. Every action is a commit with a diff. Every decision left a message. Compliance teams already accept this format.

**3. Undo.** `git revert`. This is not a small thing. Most agent architectures have no coherent story for "unmake what you just made."

**4. The PR as a permission boundary.** Read-only tentacles can run unattended. Anything that changes the world lands as a pull request first. The trust dial isn't a config flag — it's a branch protection rule, and your org already knows how to argue about those.

**5. The agent is portable.** `git clone` gives someone the whole agent: persona, procedures, capabilities, and history. Fork it to get a variant. Delete a folder to lop off an arm. There is no environment to reproduce, because the environment *is* the repo.

---

## Where the octopus gets you into trouble

An honest architecture article names its failure modes.

**Tentacles carry untrusted content.** An MCP tool result — an issue comment, a Jira ticket, a scraped page — is text that arrives inside the model's context. Anyone who can file an issue in your repo can write text your agent will read. Treat every tool result as data, never instructions, keep write-capable tentacles behind pull requests, and scope tokens narrowly. Prompt injection is the real security boundary here, not the API key.

**Too many arms is a real failure mode.** Every connected server adds tool definitions and results that compete for the context window. Keep `allowedTools` tight per mission rather than granting every arm to every run — the SDK's tool search helps, but curation helps more.

**Git is not a database.** Two agent runs writing the same file will conflict. That's fine — a mission per branch is the natural unit — but don't reach for this pattern to build a high-frequency transactional system. It fits work measured in minutes and reviewed by humans, not milliseconds.

**Secrets never belong in the repo.** The config references `${GITHUB_TOKEN}`; the value lives in the runner's secret store. The one file the agent must never be able to write is the one holding its own credentials.

---

## Start with one arm

The temptation is to design all eight tentacles first. Don't. The octopus pattern's whole virtue is that it grows one two-line diff at a time.

Do this instead, this afternoon:

1. Make a repo. Write `CLAUDE.md` describing what the agent is for, in plain English.
2. Write one `missions/first.md` — an actual task you'd otherwise do by hand.
3. Copy the forty lines of `run.ts` above.
4. Connect **one** MCP server. The GitHub one, probably.
5. Run it locally. Read the pull request it opens. Fix `CLAUDE.md` where it went wrong.

That fifth step is the loop that matters, and it's the one this architecture makes cheap: the agent's behavior is a text file in a repo, so improving it is a commit — reviewed, versioned, and revertible like everything else you ship.

Then grow the next arm.

---

*Built with the [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk) and the [Model Context Protocol](https://modelcontextprotocol.io). The head is stateless, the spine is git, and the arms already know how to do their jobs.*
