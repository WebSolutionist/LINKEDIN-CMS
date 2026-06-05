import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { modalOverlay, modalContent } from '../../utils/animations';

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-3xl' };

const modalSizing = 'm-0 sm:m-4 min-h-screen sm:min-h-0 rounded-none sm:rounded-2xl';

export default function Modal({ open, onClose, children, size = 'md', className = '' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={modalOverlay.initial}
          animate={modalOverlay.animate}
          exit={modalOverlay.exit}
          transition={modalOverlay.transition}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={modalContent.initial}
            animate={modalContent.animate}
            exit={modalContent.exit}
            transition={modalContent.transition}
            className={`glass-modal relative flex flex-col w-full ${sizes[size]} ${modalSizing} overflow-hidden select-none ${className}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent-purple/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent/8 rounded-full blur-3xl pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.1, type: 'spring', stiffness: 350, damping: 28 } }}
            >
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({ title, subtitle, onClose, children }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border-brand/50">
      <div className="flex-1 min-w-0">
        {title && <h2 className="text-lg font-bold text-text-primary leading-tight">{title}</h2>}
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
        {children}
      </div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-ui cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className = '' }) {
  return <div className={`px-6 py-5 overflow-y-auto max-h-[65vh] ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-6 py-4 border-t border-border-brand/50 bg-bg-primary/30 ${className}`}>
      {children}
    </div>
  );
}
