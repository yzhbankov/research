import { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Youtube,
  Loader2,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import type {
  CheckedClaim,
  Claim,
  Stage,
  TranscriptSegment,
  VideoInfo,
  Verdict,
} from '../shared/types';
import { streamFactCheck } from './api';
import { VERDICT_STYLES } from './lib';
import ClaimCard from './components/ClaimCard';
import TranscriptPane from './components/TranscriptPane';

const STAGE_LABEL: Record<Stage, string> = {
  'fetching-transcript': 'Fetching transcript',
  'extracting-claims': 'Extracting claims',
  'checking-claims': 'Fact-checking',
  done: 'Done',
};

export default function App() {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [serverHasKey, setServerHasKey] = useState<boolean | null>(null);

  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [checked, setChecked] = useState<Record<string, CheckedClaim>>({});

  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setServerHasKey(Boolean(d.hasKey)))
      .catch(() => setServerHasKey(false));
    return () => abortRef.current?.();
  }, []);

  const reset = () => {
    setVideo(null);
    setTranscript([]);
    setClaims([]);
    setChecked({});
    setError('');
    setStage(null);
    setStatusMsg('');
  };

  const start = () => {
    if (!url.trim() || running) return;
    abortRef.current?.();
    reset();
    setRunning(true);

    abortRef.current = streamFactCheck(
      { url: url.trim(), apiKey: apiKey.trim() || undefined },
      (event) => {
        switch (event.type) {
          case 'status':
            setStage(event.stage);
            setStatusMsg(event.message);
            break;
          case 'video':
            setVideo(event.video);
            break;
          case 'transcript':
            setTranscript(event.transcript);
            break;
          case 'claims':
            setClaims(event.claims);
            break;
          case 'claim-checked':
            setChecked((prev) => ({ ...prev, [event.claim.id]: event.claim }));
            break;
          case 'done':
            setStage('done');
            setRunning(false);
            break;
          case 'error':
            setError(event.message);
            setRunning(false);
            break;
        }
      }
    );
  };

  const checkedCount = Object.keys(checked).length;
  const showKeyField = serverHasKey === false;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Claude with live web search
          </div>
          <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <ShieldCheck className="h-9 w-9 text-sky-400" />
            YouTube Fact-Check
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            Paste a YouTube link. Get a timestamped transcript, the specific
            claims people make, and a fact-check of each one with cited sources.
          </p>
        </header>

        {/* Input */}
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Youtube className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-500" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && start()}
                placeholder="https://www.youtube.com/watch?v=…"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 py-3 pl-11 pr-4 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <button
              onClick={start}
              disabled={running || !url.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Working…
                </>
              ) : (
                'Fact-check'
              )}
            </button>
          </div>

          {showKeyField && (
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Anthropic API key (no server key configured)"
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2.5 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Status / error */}
        {error && (
          <div className="mx-auto mt-6 flex max-w-3xl items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {running && stage && (
          <div className="mx-auto mt-6 max-w-3xl">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
              <span className="font-medium">{STAGE_LABEL[stage]}</span>
              <span className="text-slate-500">— {statusMsg}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {video && (
          <div className="mt-8">
            <VideoHeader
              video={video}
              claims={claims}
              checked={checked}
            />

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)]">
              {/* Claims */}
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Claims{' '}
                  {claims.length > 0 && (
                    <span className="text-slate-500">
                      ({checkedCount}/{claims.length} checked)
                    </span>
                  )}
                </h2>
                {claims.length === 0 && !running ? (
                  <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
                    No checkable factual claims were found in this video.
                  </p>
                ) : (
                  claims.map((c) => (
                    <ClaimCard
                      key={c.id}
                      claim={c}
                      checked={checked[c.id]}
                      videoId={video.videoId}
                    />
                  ))
                )}
              </section>

              {/* Transcript */}
              <aside className="lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
                <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Transcript
                  </h2>
                  {transcript.length > 0 ? (
                    <TranscriptPane
                      transcript={transcript}
                      videoId={video.videoId}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">Loading transcript…</p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}

        <footer className="mt-16 border-t border-slate-800 pt-6 text-center text-xs text-slate-600">
          Fact-checks are AI-generated from web sources and may contain errors.
          Always verify important claims against the cited primary sources.
        </footer>
      </div>
    </div>
  );
}

function VideoHeader({
  video,
  claims,
  checked,
}: {
  video: VideoInfo;
  claims: Claim[];
  checked: Record<string, CheckedClaim>;
}) {
  const counts = countVerdicts(Object.values(checked));
  const order: Verdict[] = [
    'false',
    'misleading',
    'mostly-true',
    'true',
    'opinion',
    'unverifiable',
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <img
            src={`https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
            alt=""
            className="hidden h-16 w-28 shrink-0 rounded-lg object-cover sm:block"
          />
          <div>
            <h2 className="font-semibold leading-snug text-white">
              {video.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{video.author}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {video.language} · {claims.length} claim
              {claims.length === 1 ? '' : 's'} identified
            </p>
          </div>
        </div>
      </div>

      {Object.keys(checked).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {order
            .filter((v) => counts[v])
            .map((v) => (
              <span
                key={v}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${VERDICT_STYLES[v].badge}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${VERDICT_STYLES[v].dot}`}
                />
                {counts[v]} {VERDICT_STYLES[v].label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}

function countVerdicts(list: CheckedClaim[]): Record<Verdict, number> {
  const counts = {
    true: 0,
    'mostly-true': 0,
    misleading: 0,
    false: 0,
    unverifiable: 0,
    opinion: 0,
  } as Record<Verdict, number>;
  for (const c of list) counts[c.verdict]++;
  return counts;
}
