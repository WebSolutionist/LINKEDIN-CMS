import React from 'react';

export default function Sidebar({ currentView, setCurrentView }) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      id: 'writing-room',
      label: 'Writing Room',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'calendar',
      label: 'Content Calendar',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'published-tracker',
      label: 'Published Tracker',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'war-room',
      label: 'War Room',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-[--bg-secondary] border-r border-[--border-color] flex flex-col h-screen select-none shrink-0 z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-[--border-color]/60 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[--accent-primary] animate-pulse shadow-[0_0_8px_var(--accent-primary)]" />
          <h1 className="text-md font-black tracking-wider uppercase gradient-text bg-gradient-to-r from-[--accent-primary] to-white">
            Web Solutionist
          </h1>
        </div>
        <p className="text-[10px] font-bold text-[--text-secondary] tracking-widest uppercase opacity-75">
          Founder CMS
        </p>
      </div>

      {/* Menu Navigation */}
      <nav className="flex-1 p-4 space-y-2 mt-4">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 relative group cursor-pointer ${
                isActive
                  ? 'bg-[--bg-tertiary] text-white border border-[--border-color] shadow-[0_4px_20px_rgba(0,180,216,0.06)]'
                  : 'text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary]/30 border border-transparent'
              }`}
            >
              {/* Active Indicator Pillar */}
              {isActive && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-[--accent-primary] glow-accent" />
              )}

              {/* Icon */}
              <span
                className={`transition-colors ${
                  isActive ? 'text-[--accent-primary]' : 'text-[--text-secondary] group-hover:text-[--text-primary]'
                }`}
              >
                {item.icon}
              </span>

              {/* Label */}
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Premium Footer Info */}
      <div className="p-5 border-t border-[--border-color]/40 bg-[--bg-primary]/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[--accent-primary] to-[--accent-secondary] flex items-center justify-center font-bold text-xs text-white shadow-lg shadow-[--accent-glow]">
            P
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Precious</p>
            <p className="text-[9px] text-[--text-secondary] tracking-wider uppercase font-semibold">Web Solutionist</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
