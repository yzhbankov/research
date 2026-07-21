import type { Verdict } from '../shared/types';

export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export interface VerdictStyle {
  label: string;
  /** Tailwind classes for the badge. */
  badge: string;
  /** Tailwind classes for the card's left accent border. */
  accent: string;
  dot: string;
}

export const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  true: {
    label: 'True',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    accent: 'border-l-emerald-500',
    dot: 'bg-emerald-400',
  },
  'mostly-true': {
    label: 'Mostly True',
    badge: 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30',
    accent: 'border-l-teal-500',
    dot: 'bg-teal-400',
  },
  misleading: {
    label: 'Misleading',
    badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    accent: 'border-l-amber-500',
    dot: 'bg-amber-400',
  },
  false: {
    label: 'False',
    badge: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    accent: 'border-l-rose-500',
    dot: 'bg-rose-400',
  },
  unverifiable: {
    label: 'Unverifiable',
    badge: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
    accent: 'border-l-slate-500',
    dot: 'bg-slate-400',
  },
  opinion: {
    label: 'Opinion',
    badge: 'bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30',
    accent: 'border-l-violet-500',
    dot: 'bg-violet-400',
  },
};

export function youtubeUrl(videoId: string, seconds: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(seconds)}s`;
}
