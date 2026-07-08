export default function ViewToggle({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-0.5 p-1 bg-bg-primary/80 border border-border-brand/60 rounded-xl backdrop-blur-sm">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-ui cursor-pointer ${
            value === opt.id
              ? 'bg-bg-elevated text-text-primary shadow-sm border border-border-brand/50'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
