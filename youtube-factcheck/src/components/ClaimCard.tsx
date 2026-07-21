import { useState } from 'react';
import { ChevronDown, ExternalLink, Clock, User, Loader2 } from 'lucide-react';
import type { CheckedClaim, Claim } from '../../shared/types';
import { VERDICT_STYLES, formatTimestamp, youtubeUrl } from '../lib';

interface Props {
  claim: Claim;
  checked?: CheckedClaim;
  videoId: string;
}

function isChecked(c: Claim | CheckedClaim): c is CheckedClaim {
  return 'verdict' in c;
}

export default function ClaimCard({ claim, checked, videoId }: Props) {
  const [open, setOpen] = useState(false);
  const data = checked ?? claim;
  const done = isChecked(data);
  const style = done ? VERDICT_STYLES[data.verdict] : null;

  return (
    <div
      className={`rounded-xl border border-slate-800 border-l-4 bg-slate-900/60 transition-colors ${
        style?.accent ?? 'border-l-slate-700'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <div className="mt-0.5 shrink-0">
          {done && style ? (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}
            >
              {style.label}
              {typeof data.confidence === 'number' && (
                <span className="ml-1.5 opacity-70">{data.confidence}%</span>
              )}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug text-slate-100">
            {data.claim}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {data.speaker}
            </span>
            <a
              href={youtubeUrl(videoId, data.timestamp)}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-sky-400"
            >
              <Clock className="h-3 w-3" />
              {formatTimestamp(data.timestamp)}
            </a>
          </div>
        </div>

        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-800 px-4 pb-4 pt-3 text-sm">
          {data.quote && (
            <blockquote className="border-l-2 border-slate-700 pl-3 italic text-slate-400">
              “{data.quote}”
            </blockquote>
          )}

          {done ? (
            <>
              <p className="leading-relaxed text-slate-300">
                {data.explanation}
              </p>
              {data.sources.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sources
                  </p>
                  <ul className="space-y-1">
                    {data.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-start gap-1.5 text-sky-400 hover:text-sky-300 hover:underline"
                        >
                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="break-all">{s.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-500">Searching the web for evidence…</p>
          )}
        </div>
      )}
    </div>
  );
}
