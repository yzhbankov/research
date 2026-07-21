// ============================================================================
// YouTube transcript fetching — dependency-free.
//
// Uses YouTube's public InnerTube "player" endpoint to resolve video metadata
// and the list of available caption tracks, then downloads the timed-text
// track and parses it into transcript segments. No audio download and no
// third-party npm packages are required.
// ============================================================================

import type { TranscriptSegment, VideoInfo } from '../shared/types.js';

// Long-lived public InnerTube key for the web client.
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class TranscriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TranscriptError';
  }
}

/**
 * Extracts the 11-character video ID from any common YouTube URL form,
 * or returns the input unchanged if it already looks like a bare ID.
 */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim();

  // Already a bare video id.
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host.endsWith('youtube.com')) {
      // /watch?v=ID
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      // /embed/ID, /shorts/ID, /live/ID, /v/ID
      const parts = url.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) =>
        ['embed', 'shorts', 'live', 'v'].includes(p)
      );
      if (idx >= 0 && parts[idx + 1]) {
        const id = parts[idx + 1];
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    // not a URL; fall through
  }

  return null;
}

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  kind?: string; // "asr" for auto-generated
  name?: { simpleText?: string; runs?: { text: string }[] };
}

interface PlayerResponse {
  videoDetails?: {
    videoId: string;
    title: string;
    author: string;
    lengthSeconds: string;
  };
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: CaptionTrack[];
    };
  };
  playabilityStatus?: { status?: string; reason?: string };
}

async function fetchPlayerResponse(videoId: string): Promise<PlayerResponse> {
  const body = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00',
        hl: 'en',
      },
    },
    videoId,
  };

  const res = await fetch(INNERTUBE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new TranscriptError(
      `YouTube InnerTube request failed (HTTP ${res.status}).`
    );
  }

  return (await res.json()) as PlayerResponse;
}

function pickTrack(
  tracks: CaptionTrack[],
  preferredLang: string
): CaptionTrack | null {
  if (tracks.length === 0) return null;

  // 1. Exact language match, prefer human (non-asr) captions.
  const byLang = tracks.filter((t) =>
    t.languageCode?.toLowerCase().startsWith(preferredLang.toLowerCase())
  );
  const human = byLang.find((t) => t.kind !== 'asr');
  if (human) return human;
  if (byLang[0]) return byLang[0];

  // 2. Any human caption track.
  const anyHuman = tracks.find((t) => t.kind !== 'asr');
  if (anyHuman) return anyHuman;

  // 3. Whatever exists.
  return tracks[0];
}

interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: { utf8?: string }[];
}

function parseJson3(raw: string): TranscriptSegment[] {
  const data = JSON.parse(raw) as { events?: Json3Event[] };
  const segments: TranscriptSegment[] = [];

  for (const ev of data.events ?? []) {
    if (!ev.segs || ev.tStartMs === undefined) continue;
    const text = ev.segs
      .map((s) => s.utf8 ?? '')
      .join('')
      .replace(/\n/g, ' ')
      .trim();
    if (!text) continue;
    segments.push({
      start: ev.tStartMs / 1000,
      duration: (ev.dDurationMs ?? 0) / 1000,
      text,
    });
  }

  return segments;
}

// Fallback parser for the legacy XML timedtext format.
function parseXml(raw: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  const regex = /<text start="([\d.]+)"(?: dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const text = decodeEntities(match[3]).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    segments.push({
      start: parseFloat(match[1]),
      duration: match[2] ? parseFloat(match[2]) : 0,
      text,
    });
  }

  return segments;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function fetchTimedText(baseUrl: string): Promise<TranscriptSegment[]> {
  // Prefer the clean JSON format; fall back to XML if it comes back empty.
  const jsonUrl = baseUrl.includes('fmt=')
    ? baseUrl
    : `${baseUrl}&fmt=json3`;

  const res = await fetch(jsonUrl, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en-US,en;q=0.9' },
  });
  if (!res.ok) {
    throw new TranscriptError(
      `Failed to download caption track (HTTP ${res.status}).`
    );
  }
  const raw = await res.text();

  try {
    const segments = parseJson3(raw);
    if (segments.length > 0) return segments;
  } catch {
    // not json3, try xml below
  }

  const xmlSegments = parseXml(raw);
  if (xmlSegments.length > 0) return xmlSegments;

  throw new TranscriptError('Caption track was empty or in an unknown format.');
}

export interface TranscriptResult {
  video: VideoInfo;
  transcript: TranscriptSegment[];
}

/**
 * Fetches metadata and the transcript for a YouTube video.
 * @param preferredLang two-letter language preference for caption selection.
 */
export async function fetchTranscript(
  videoId: string,
  preferredLang = 'en'
): Promise<TranscriptResult> {
  const player = await fetchPlayerResponse(videoId);

  const status = player.playabilityStatus?.status;
  if (status && status !== 'OK') {
    throw new TranscriptError(
      `Video is not playable: ${player.playabilityStatus?.reason ?? status}.`
    );
  }

  const tracks =
    player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (tracks.length === 0) {
    throw new TranscriptError(
      'This video has no captions available. Fact-checking needs a transcript — try a video that has captions or subtitles enabled.'
    );
  }

  const track = pickTrack(tracks, preferredLang);
  if (!track) {
    throw new TranscriptError('Could not select a caption track.');
  }

  const transcript = await fetchTimedText(track.baseUrl);

  const details = player.videoDetails;
  const durationFromDetails = details ? Number(details.lengthSeconds) : 0;
  const lastSeg = transcript[transcript.length - 1];
  const durationSeconds =
    durationFromDetails ||
    (lastSeg ? Math.round(lastSeg.start + lastSeg.duration) : 0);

  const video: VideoInfo = {
    videoId,
    title: details?.title ?? 'Unknown title',
    author: details?.author ?? 'Unknown channel',
    language:
      track.languageCode +
      (track.kind === 'asr' ? ' (auto-generated)' : ''),
    durationSeconds,
  };

  return { video, transcript };
}
