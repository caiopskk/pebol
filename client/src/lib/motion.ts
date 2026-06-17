import type { Transition } from "framer-motion";

// Shared Framer Motion presets so screens animate consistently. Global
// reduced-motion is honored via <MotionConfig reducedMotion="user"> in main.ts,
// so these can be used freely without per-component a11y branching.

const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;

/** Standard screen entrance (fade + slight rise). */
export const screenIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: EASE_OUT } as Transition,
};

/** Drop-in hover/press feedback for buttons. */
export const pressFx = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.96 },
} as const;
