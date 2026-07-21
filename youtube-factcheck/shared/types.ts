// ============================================================================
// Shared types used by both the Express server and the React client.
// ============================================================================

export interface TranscriptSegment {
  /** Start time of the segment in seconds. */
  start: number;
  /** Duration of the segment in seconds. */
  duration: number;
  /** The spoken text for this segment. */
  text: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  /** Language code of the caption track that was used, e.g. "en". */
  language: string;
  /** Total length of the transcript in seconds (approximate). */
  durationSeconds: number;
}

export type Verdict =
  | 'true'
  | 'mostly-true'
  | 'misleading'
  | 'false'
  | 'unverifiable'
  | 'opinion';

export interface Source {
  title: string;
  url: string;
}

export interface Claim {
  id: string;
  /** The factual claim, paraphrased into a clean, checkable statement. */
  claim: string;
  /** The claim quoted (or closely paraphrased) as spoken in the video. */
  quote: string;
  /** Who made the claim, if identifiable from context ("Speaker", a name, etc.). */
  speaker: string;
  /** Approximate start time of the claim in the video, in seconds. */
  timestamp: number;
}

export interface CheckedClaim extends Claim {
  verdict: Verdict;
  /** 0-100 confidence in the verdict. */
  confidence: number;
  /** A concise explanation of the verdict. */
  explanation: string;
  /** Supporting/refuting web sources found during verification. */
  sources: Source[];
}

export interface FactCheckResult {
  video: VideoInfo;
  transcript: TranscriptSegment[];
  claims: CheckedClaim[];
}

// ---- Server-Sent Event payloads (progress streaming) --------------------

export type ProgressEvent =
  | { type: 'status'; stage: Stage; message: string }
  | { type: 'video'; video: VideoInfo }
  | { type: 'transcript'; transcript: TranscriptSegment[] }
  | { type: 'claims'; claims: Claim[] }
  | { type: 'claim-checked'; claim: CheckedClaim }
  | { type: 'done' }
  | { type: 'error'; message: string };

export type Stage =
  | 'fetching-transcript'
  | 'extracting-claims'
  | 'checking-claims'
  | 'done';
