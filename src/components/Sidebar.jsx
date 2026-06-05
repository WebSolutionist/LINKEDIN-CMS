const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
      </svg>
    ),
  },
  {
    id: 'content-calendar',
    label: 'Calendar',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'writing-room',
    label: 'Writing',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'published-tracker',
    label: 'Published',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Sidebar({ currentView, setCurrentView }) {
  return (
    <aside className="w-[72px] hover:w-56 group/sidebar bg-bg-secondary/80 backdrop-blur-xl border-r border-border-brand/50 flex flex-col h-screen shrink-0 z-30 transition-[width] duration-300 ease-out overflow-hidden">
      <div className="p-4 border-b border-border-brand/40 flex items-center gap-3 min-h-[72px]">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-accent-purple to-accent flex items-center justify-center shadow-lg glow-purple animate-pulseGlow">
          <span className="text-sm font-black text-white">W</span>
        </div>
        <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          <p className="text-sm font-bold gradient-text">Web Solutionist</p>
          <p className="text-[10px] text-text-muted font-medium tracking-wide">Founder CMS</p>
        </div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              title={item.label}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-ui cursor-pointer relative ${
                isActive ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50'
              }`}
            >
              {isActive && (
                <span className="absolute inset-0 bg-gradient-to-r from-accent-purple/15 to-accent/5 rounded-xl border border-accent/20" />
              )}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gradient-to-b from-accent-purple to-accent shadow-[0_0_8px_rgba(124,58,237,0.6)]" />
              )}
              <span className={`relative z-10 shrink-0 ${isActive ? 'text-accent' : ''}`}>{item.icon}</span>
              <span className="relative z-10 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border-brand/40">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-deep flex items-center justify-center text-sm font-bold text-white ring-2 ring-accent/20">
            P
          </div>
          <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <p className="text-xs font-semibold text-text-primary">Precious</p>
            <p className="text-[10px] text-text-muted">Web Solutionist</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
