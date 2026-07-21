import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { TranscriptSegment } from '../../shared/types';
import { formatTimestamp, youtubeUrl } from '../lib';

interface Props {
  transcript: TranscriptSegment[];
  videoId: string;
}

export default function TranscriptPane({ transcript, videoId }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transcript;
    return transcript.filter((s) => s.text.toLowerCase().includes(q));
  }, [transcript, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transcript…"
          className="w-full rounded-lg border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div className="scroll-thin flex-1 space-y-1 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-sm text-slate-500">No matching lines.</p>
        ) : (
          filtered.map((seg, i) => (
            <a
              key={i}
              href={youtubeUrl(videoId, seg.start)}
              target="_blank"
              rel="noreferrer"
              className="group flex gap-3 rounded-md px-2 py-1.5 hover:bg-slate-800/60"
            >
              <span className="shrink-0 font-mono text-xs text-slate-500 group-hover:text-sky-400">
                {formatTimestamp(seg.start)}
              </span>
              <span className="text-sm leading-relaxed text-slate-300">
                {seg.text}
              </span>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
