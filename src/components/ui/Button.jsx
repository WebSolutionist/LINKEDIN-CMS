const variants = {
  primary: 'bg-gradient-to-r from-accent-purple to-accent text-white shadow-lg hover:shadow-[0_0_24px_rgba(124,58,237,0.3)] active:scale-[0.98]',
  secondary: 'bg-bg-tertiary text-text-primary border border-border-brand hover:border-accent/40 hover:bg-bg-elevated',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/60',
  danger: 'text-danger border border-danger/30 hover:bg-danger/10',
};

const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-sm' };

export default function Button({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-ui cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
