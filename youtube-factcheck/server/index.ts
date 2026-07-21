// ============================================================================
// Express server for YouTube Fact-Check.
//
// POST /api/factcheck  { url, apiKey? }
//   Streams progress as Server-Sent Events while it:
//     1. fetches the transcript,
//     2. extracts checkable claims,
//     3. verifies each claim with Claude + web search.
// ============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchTranscript, parseVideoId, TranscriptError } from './youtube.js';
import { extractClaims, verifyClaim, getClient } from './factcheck.js';
import type { CheckedClaim, ProgressEvent } from '../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const CONCURRENCY = 4;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
    model: process.env.FACTCHECK_MODEL || 'claude-sonnet-5',
  });
});

app.post('/api/factcheck', async (req, res) => {
  const { url, apiKey } = req.body ?? {};

  // Set up the Server-Sent Events stream.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event: ProgressEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const fail = (message: string) => {
    send({ type: 'error', message });
    res.end();
  };

  try {
    if (typeof url !== 'string' || !url.trim()) {
      return fail('Please provide a YouTube URL.');
    }

    const videoId = parseVideoId(url);
    if (!videoId) {
      return fail('That does not look like a valid YouTube link.');
    }

    // Build the Anthropic client up front so a missing key fails fast.
    let client;
    try {
      client = getClient(typeof apiKey === 'string' ? apiKey : undefined);
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err));
    }

    // ---- 1. Transcript -----------------------------------------------------
    send({
      type: 'status',
      stage: 'fetching-transcript',
      message: 'Fetching transcript from YouTube…',
    });

    const { video, transcript } = await fetchTranscript(videoId);
    send({ type: 'video', video });
    send({ type: 'transcript', transcript });

    // ---- 2. Extract claims -------------------------------------------------
    send({
      type: 'status',
      stage: 'extracting-claims',
      message: 'Reading the transcript and pulling out checkable claims…',
    });

    const claims = await extractClaims(client, video, transcript);
    send({ type: 'claims', claims });

    if (claims.length === 0) {
      send({ type: 'done' });
      return res.end();
    }

    // ---- 3. Verify claims (bounded concurrency) ----------------------------
    send({
      type: 'status',
      stage: 'checking-claims',
      message: `Fact-checking ${claims.length} claim${
        claims.length === 1 ? '' : 's'
      } with live web search…`,
    });

    let cursor = 0;
    const worker = async () => {
      while (cursor < claims.length) {
        const claim = claims[cursor++];
        const checked: CheckedClaim = await verifyClaim(client, video, claim);
        send({ type: 'claim-checked', claim: checked });
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, claims.length) }, worker)
    );

    send({ type: 'done' });
    res.end();
  } catch (err) {
    const message =
      err instanceof TranscriptError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Unexpected server error.';
    // If we've already started streaming, emit an error event; otherwise 500.
    if (res.headersSent) fail(message);
    else res.status(500).json({ error: message });
  }
});

// Serve the built frontend in production.
// At runtime this file lives at dist-server/server/index.js, so the built
// client (dist/) is two levels up.
const clientDir = path.resolve(__dirname, '../../dist');
app.use(express.static(clientDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found. Run the dev server with `npm run dev`.');
  });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`YouTube Fact-Check API listening on http://localhost:${PORT}`);
});
