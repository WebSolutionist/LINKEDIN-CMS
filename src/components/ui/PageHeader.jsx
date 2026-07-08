export default function PageHeader({ title, subtitle, actions, badge }) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border-brand/40 animate-slideUp">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
