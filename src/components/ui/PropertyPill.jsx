const STATUS_STYLES = {
  idea: 'bg-warning/10 text-warning border-warning/25',
  seed: 'bg-warning/10 text-warning border-warning/25',
  drafting: 'bg-accent/10 text-accent border-accent/25',
  scheduled: 'bg-accent-purple/10 text-accent-purple border-accent-purple/25',
  published: 'bg-success/10 text-success border-success/25',
  draft: 'bg-accent/10 text-accent border-accent/25',
};

export default function PropertyPill({ label, dot = false, className = '' }) {
  if (!label) return null;
  const key = label.toLowerCase();
  const style = STATUS_STYLES[key] || 'bg-bg-elevated text-text-secondary border-border-brand/50';
  const dotColor = key === 'published' ? 'bg-success' : key === 'scheduled' ? 'bg-accent-purple' : key === 'drafting' ? 'bg-accent' : 'bg-warning';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColor}`} />}
      {label}
    </span>
  );
}
