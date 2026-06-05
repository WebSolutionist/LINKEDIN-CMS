export const spring = {
  stiff: { type: 'spring', stiffness: 400, damping: 30 },
  bouncy: { type: 'spring', stiffness: 500, damping: 25 },
  gentle: { type: 'spring', stiffness: 300, damping: 35 },
  snappy: { type: 'spring', stiffness: 600, damping: 20 },
  smooth: { type: 'spring', stiffness: 350, damping: 28 },
};

export const micro = {
  hover: { scale: 1.02 },
  tap: { scale: 0.97 },
  hoverLift: { scale: 1.03, y: -2 },
  iconHover: { scale: 1.12, rotate: 2 },
};

export const stagger = {
  fast: { staggerChildren: 0.04 },
  medium: { staggerChildren: 0.07 },
  slow: { staggerChildren: 0.1 },
};

export const fadeSlideUp = (d = 0.35) => ({
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: d, ease: [0.16, 1, 0.3, 1] } },
});

export const fadeSlideDown = (d = 0.35) => ({
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: d, ease: [0.16, 1, 0.3, 1] } },
});

export const fadeScale = (d = 0.3) => ({
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: d, ease: [0.16, 1, 0.3, 1] } },
});

export const staggerContainer = (staggerAmount = 0.07, childDuration = 0.35) => ({
  hidden: {},
  visible: { transition: { staggerChildren: staggerAmount, delayChildren: 0.05 } },
});

export const cardItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export const listItem = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 350, damping: 28 },
  },
};

export const viewTransition = (direction = 1) => ({
  initial: { opacity: 0, x: 16 * direction, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -16 * direction, scale: 0.98 },
  transition: { type: 'spring', stiffness: 350, damping: 30 },
});

export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.94, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.94, y: 20 },
  transition: { type: 'spring', stiffness: 400, damping: 30 },
};

export const toastItem = {
  initial: { opacity: 0, y: 24, scale: 0.9 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 24, scale: 0.9 },
  transition: { type: 'spring', stiffness: 400, damping: 28 },
};
