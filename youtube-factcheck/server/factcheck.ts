// ============================================================================
// Fact-checking with Claude.
//
//  1. extractClaims()  — reads the transcript and pulls out discrete,
//                         checkable factual claims (with speaker + timestamp).
//  2. verifyClaim()    — verifies a single claim using Claude with the
//                         Anthropic server-side web_search tool, returning a
//                         verdict, explanation, confidence and cited sources.
// ============================================================================

import Anthropic from '@anthropic-ai/sdk';
import type {
  Claim,
  CheckedClaim,
  Source,
  TranscriptSegment,
  Verdict,
  VideoInfo,
} from '../shared/types.js';

const DEFAULT_MODEL = process.env.FACTCHECK_MODEL || 'claude-sonnet-5';

const VALID_VERDICTS: Verdict[] = [
  'true',
  'mostly-true',
  'misleading',
  'false',
  'unverifiable',
  'opinion',
];

export function getClient(apiKey?: string): Anthropic {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      'No Anthropic API key configured. Set ANTHROPIC_API_KEY in the server environment (see .env.example).'
    );
  }
  return new Anthropic({ apiKey: key });
}

function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Build a compact, timestamped plain-text transcript for the prompt. */
function renderTranscript(transcript: TranscriptSegment[]): string {
  return transcript
    .map((seg) => `[${formatTimestamp(seg.start)}] ${seg.text}`)
    .join('\n');
}

/** Robustly pull the first top-level JSON value out of a model response. */
function extractJson<T>(text: string): T {
  // Prefer fenced ```json blocks.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates: string[] = [];
  if (fenced) candidates.push(fenced[1]);

  // Otherwise scan for the first balanced { } or [ ] region.
  const firstBrace = text.search(/[{[]/);
  if (firstBrace >= 0) candidates.push(text.slice(firstBrace));

  for (const c of candidates) {
    try {
      return JSON.parse(c.trim()) as T;
    } catch {
      // Try to trim trailing prose after the JSON value.
      const trimmed = trimToBalanced(c.trim());
      if (trimmed) {
        try {
          return JSON.parse(trimmed) as T;
        } catch {
          /* keep trying */
        }
      }
    }
  }
  throw new Error('Model did not return parseable JSON.');
}

/** Return the substring covering the first balanced {...} or [...]. */
function trimToBalanced(s: string): string | null {
  const open = s[0];
  if (open !== '{' && open !== '[') return null;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(0, i + 1);
    }
  }
  return null;
}

function collectText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

// ---------------------------------------------------------------------------
// 1. Claim extraction
// ---------------------------------------------------------------------------

interface RawClaim {
  claim?: string;
  quote?: string;
  speaker?: string;
  timestamp?: string | number;
}

const EXTRACTION_SYSTEM = `You are a fact-checking research assistant. You read video transcripts and identify the specific, checkable factual claims that speakers make.

A good claim to extract is a concrete, verifiable assertion about the world: statistics, historical events, attributions ("X said Y"), scientific statements, records, dates, causal claims, or quantities.

Do NOT extract:
- Pure opinions, predictions, jokes, hypotheticals, or rhetorical questions.
- Vague generalities that cannot be checked.
- Trivial small-talk.

Focus on the claims most worth checking — the ones that are consequential, surprising, or likely to be disputed. Extract at most 12 of the strongest claims.

For each claim, provide:
- "claim": the assertion rewritten as a clean, standalone, checkable statement.
- "quote": the relevant words roughly as spoken in the transcript.
- "speaker": who made it, if identifiable from context; otherwise "Speaker".
- "timestamp": the [H:MM:SS] or [M:SS] marker nearest to where the claim is made.

Respond with ONLY a JSON array of claim objects, no prose.`;

function timestampToSeconds(ts: string | number | undefined): number {
  if (typeof ts === 'number') return ts;
  if (!ts) return 0;
  const cleaned = ts.replace(/[[\]]/g, '').trim();
  const parts = cleaned.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

export async function extractClaims(
  client: Anthropic,
  video: VideoInfo,
  transcript: TranscriptSegment[]
): Promise<Claim[]> {
  const transcriptText = renderTranscript(transcript);

  // Guard against very long transcripts blowing the context window.
  const MAX_CHARS = 120_000;
  const clipped =
    transcriptText.length > MAX_CHARS
      ? transcriptText.slice(0, MAX_CHARS) + '\n[transcript truncated]'
      : transcriptText;

  const msg = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4000,
    system: EXTRACTION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Video: "${video.title}" by ${video.author}.\n\nTranscript:\n${clipped}`,
      },
    ],
  });

  const raw = extractJson<RawClaim[]>(collectText(msg.content));
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((c) => c && typeof c.claim === 'string' && c.claim.trim())
    .map((c, i) => ({
      id: `claim-${i + 1}`,
      claim: c.claim!.trim(),
      quote: (c.quote || c.claim || '').trim(),
      speaker: (c.speaker || 'Speaker').trim(),
      timestamp: timestampToSeconds(c.timestamp),
    }));
}

// ---------------------------------------------------------------------------
// 2. Claim verification (with web search)
// ---------------------------------------------------------------------------

interface RawVerdict {
  verdict?: string;
  confidence?: number;
  explanation?: string;
  sources?: { title?: string; url?: string }[];
}

const VERIFY_SYSTEM = `You are a rigorous, non-partisan fact-checker. You verify a single claim by searching the web for authoritative, primary sources.

Method:
1. Search the web for evidence for and against the claim. Prefer primary sources, official data, and reputable outlets.
2. Weigh the evidence honestly. Note if the claim is technically true but misleading, or true in part.
3. Reach a verdict.

Verdict values (choose exactly one):
- "true": accurate and well-supported.
- "mostly-true": largely accurate with minor caveats.
- "misleading": contains truth but creates a false impression, or lacks key context.
- "false": contradicted by the evidence.
- "unverifiable": no reliable evidence either way.
- "opinion": a value judgment or prediction, not a factual claim.

When you are done searching, respond with ONLY a JSON object (no prose) of this exact shape:
{
  "verdict": "true" | "mostly-true" | "misleading" | "false" | "unverifiable" | "opinion",
  "confidence": <integer 0-100>,
  "explanation": "<2-4 sentence justification citing what the sources show>",
  "sources": [ { "title": "<source title>", "url": "<url>" } ]
}

Include the 1-4 most relevant sources you actually used. Be concise and specific.`;

/** Pull web_search result URLs from the response as backup sources. */
function collectSearchSources(content: Anthropic.ContentBlock[]): Source[] {
  const sources: Source[] = [];
  for (const block of content) {
    if (block.type === 'web_search_tool_result') {
      const results = (block as { content?: unknown }).content;
      if (Array.isArray(results)) {
        for (const r of results as { url?: string; title?: string }[]) {
          if (r.url) {
            sources.push({ url: r.url, title: r.title || r.url });
          }
        }
      }
    }
  }
  return sources;
}

function normalizeVerdict(v: string | undefined): Verdict {
  const lower = (v || '').toLowerCase().trim().replace(/\s+/g, '-');
  return (VALID_VERDICTS as string[]).includes(lower)
    ? (lower as Verdict)
    : 'unverifiable';
}

function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    if (!s.url || seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out.slice(0, 5);
}

export async function verifyClaim(
  client: Anthropic,
  video: VideoInfo,
  claim: Claim
): Promise<CheckedClaim> {
  let msg: Anthropic.Message;
  try {
    msg = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      system: VERIFY_SYSTEM,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ] as Anthropic.Messages.ToolUnion[],
      messages: [
        {
          role: 'user',
          content: `Fact-check this claim made in the video "${video.title}" by ${video.author}.

Claim: ${claim.claim}
As spoken: "${claim.quote}"
Attributed to: ${claim.speaker}

Search the web, then return your verdict as the specified JSON object.`,
        },
      ],
    });
  } catch (err) {
    return {
      ...claim,
      verdict: 'unverifiable',
      confidence: 0,
      explanation: `Verification failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
      sources: [],
    };
  }

  const text = collectText(msg.content);
  const searchSources = collectSearchSources(msg.content);

  let parsed: RawVerdict;
  try {
    parsed = extractJson<RawVerdict>(text);
  } catch {
    return {
      ...claim,
      verdict: 'unverifiable',
      confidence: 0,
      explanation:
        text.trim().slice(0, 500) ||
        'The fact-checker did not return a structured verdict.',
      sources: dedupeSources(searchSources),
    };
  }

  const modelSources: Source[] = (parsed.sources || [])
    .filter((s) => s && s.url)
    .map((s) => ({ title: s.title || s.url!, url: s.url! }));

  const confidence = Math.max(
    0,
    Math.min(100, Math.round(Number(parsed.confidence) || 0))
  );

  return {
    ...claim,
    verdict: normalizeVerdict(parsed.verdict),
    confidence,
    explanation:
      (parsed.explanation || '').trim() || 'No explanation provided.',
    sources: dedupeSources([...modelSources, ...searchSources]),
  };
}
