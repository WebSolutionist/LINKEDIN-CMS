export const PILLARS = [
  'Website Reality',
  'Strategic Reframe',
  'Building in Public'
];

export const PILLAR_DOTS = {
  'Website Reality': 'bg-emerald-400',
  'Strategic Reframe': 'bg-amber-400',
  'Building in Public': 'bg-purple-400',
};

export function getPillarDotColor(pillar) {
  return PILLAR_DOTS[pillar] || 'bg-accent';
}
