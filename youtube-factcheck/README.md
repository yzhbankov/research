# YouTube Fact-Check

Paste a YouTube link and get:

1. a **timestamped transcript** pulled straight from the video's captions,
2. the specific **factual claims** people make in it, and
3. an AI **fact-check of each claim** — verdict, confidence, explanation, and
   cited web sources.

Fact-checking is done by **Claude** using Anthropic's server-side **web search**
tool, so verdicts are backed by live sources rather than model memory. Results
stream into the UI as each claim is checked.

![architecture](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20Express%20%2B%20Claude-0ea5e9)

---

## How it works

```
YouTube URL
   │
   ▼
[server/youtube.ts]  Resolve video + download caption track (YouTube InnerTube
   │                 player API → timedtext). No audio download, no yt-dlp.
   ▼
[server/factcheck.ts · extractClaims]  Claude reads the transcript and returns
   │                 up to 12 discrete, checkable claims with speaker + timestamp.
   ▼
[server/factcheck.ts · verifyClaim]    For each claim, Claude searches the web
   │                 and returns a verdict + explanation + sources.
   ▼
[server/index.ts]    Streams every step to the browser over Server-Sent Events.
   ▼
[src/*]              React UI: claim cards, verdict badges, searchable transcript.
```

### Verdicts

| Verdict        | Meaning                                                    |
| -------------- | ---------------------------------------------------------- |
| `true`         | Accurate and well-supported.                               |
| `mostly-true`  | Largely accurate, minor caveats.                           |
| `misleading`   | Contains truth but creates a false impression.             |
| `false`        | Contradicted by the evidence.                              |
| `unverifiable` | No reliable evidence either way.                           |
| `opinion`      | A value judgment or prediction, not a factual claim.       |

---

## Setup

Requires Node.js 18+.

```bash
cd youtube-factcheck
npm install
cp .env.example .env      # then add your ANTHROPIC_API_KEY
```

`.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
# FACTCHECK_MODEL=claude-sonnet-5   # optional model override
# PORT=8787                         # optional API port
```

> If no server-side key is set, the web UI shows a field to paste an Anthropic
> API key per request instead.

## Run

**Development** (Vite dev server + API with hot reload):

```bash
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the Express
backend on port 8787.

**Production**:

```bash
npm run build     # compiles the server and bundles the client into dist/
npm start         # serves API + built client from http://localhost:8787
```

## Scripts

| Script              | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Run client and server together with hot reload.    |
| `npm run build`     | Type-check + build server (`dist-server/`) & client (`dist/`). |
| `npm start`         | Run the built production server.                   |
| `npm run typecheck` | Type-check both client and server.                 |

---

## API

### `POST /api/factcheck`

Body: `{ "url": "<youtube url>", "apiKey": "<optional anthropic key>" }`

Responds with a `text/event-stream`. Each SSE frame is a JSON
[`ProgressEvent`](./shared/types.ts):

| `type`          | Payload                                             |
| --------------- | --------------------------------------------------- |
| `status`        | `{ stage, message }` — current pipeline stage.      |
| `video`         | `{ video }` — title, author, language, duration.    |
| `transcript`    | `{ transcript }` — array of timestamped segments.   |
| `claims`        | `{ claims }` — extracted claims (before checking).  |
| `claim-checked` | `{ claim }` — one claim with its verdict + sources. |
| `done`          | Stream complete.                                    |
| `error`         | `{ message }` — a human-readable error.             |

### `GET /api/health`

`{ ok, hasKey, model }` — whether a server-side key is configured.

---

## Notes & limitations

- **Captions required.** Transcription reads YouTube's own caption track. Videos
  with captions disabled can't be checked (the UI reports this clearly). Adding a
  Whisper audio-transcription fallback would lift this restriction.
- **Auto-generated captions** are used when human captions aren't available;
  their punctuation and speaker attribution are rougher.
- **Fact-checks are AI-generated** from web sources and can be wrong. The UI
  always links the cited sources — verify important claims against the primaries.
- Claim extraction is capped at 12 claims and the transcript is clipped at
  ~120k characters to stay within the model context window.

## Layout

```
youtube-factcheck/
├── server/
│   ├── index.ts       Express app + SSE streaming endpoint
│   ├── youtube.ts     Video-id parsing + caption fetching (dependency-free)
│   └── factcheck.ts   Claim extraction + web-search verification (Claude)
├── shared/
│   └── types.ts       Types shared by server and client
├── src/
│   ├── App.tsx        Main UI + state machine
│   ├── api.ts         SSE streaming client
│   ├── lib.ts         Formatting + verdict styles
│   └── components/     ClaimCard, TranscriptPane
└── ...
```
