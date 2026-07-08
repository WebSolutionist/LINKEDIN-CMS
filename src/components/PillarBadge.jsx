import { PILLAR_DOTS } from '../utils/pillar';

const PILLAR_STYLES = {
  'Website Reality': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  'Strategic Reframe': 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  'Web Solution Thinking': 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  'Personal Reflection': 'bg-pink-500/10 text-pink-400 border-pink-500/25',
  'Soft Positioning': 'bg-violet-500/10 text-violet-400 border-violet-500/25',
};

export default function PillarBadge({ pillar, size = 'sm' }) {
  if (!pillar) return null;
  const base = PILLAR_STYLES[pillar] || 'bg-bg-elevated text-text-secondary border-border-brand/50';
  const dot = PILLAR_DOTS[pillar] || 'bg-text-muted';
  const sizing = size === 'lg' ? 'text-xs px-3 py-1' : 'text-[11px] px-2 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${base} ${sizing}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {pillar}
    </span>
  );
}
