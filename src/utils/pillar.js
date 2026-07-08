export const PILLAR_DOTS = {
  'Website Reality': 'bg-emerald-400',
  'Strategic Reframe': 'bg-amber-400',
  'Web Solution Thinking': 'bg-blue-400',
  'Personal Reflection': 'bg-pink-400',
  'Soft Positioning': 'bg-violet-400',
};

export function getPillarDotColor(pillar) {
  return PILLAR_DOTS[pillar] || 'bg-accent';
}
