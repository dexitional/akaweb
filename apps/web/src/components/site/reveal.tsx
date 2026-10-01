import { MotionConfig, motion } from "motion/react";
import type { Variants } from "motion/react";

// Scroll-in transitions for the public site. Each element animates once, the
// first time it scrolls into view. Visitors who prefer reduced motion get a
// plain fade with no movement (MotionConfig reducedMotion="user").

const EASE = [0.22, 1, 0.36, 1] as const;

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

const VIEWPORT = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -60px 0px",
} as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

type Tag = "div" | "section" | "ul" | "li" | "article";

// A single block (heading, image, panel) that fades and rises into view.
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  from = "below",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: Tag;
  from?: "below" | "left" | "right";
}) {
  const Component = motion[as];
  const offset = from === "left" ? { x: -36 } : from === "right" ? { x: 36 } : { y: 28 };
  return (
    <Component
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Component>
  );
}

// A grid or list whose children (StaggerItem) cascade in one after another.
export function Stagger({
  children,
  className,
  as = "div",
  gap = 0.09,
}: {
  children: React.ReactNode;
  className?: string;
  as?: Tag;
  gap?: number;
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: Tag;
}) {
  const Component = motion[as];
  return (
    <Component className={className} variants={item}>
      {children}
    </Component>
  );
}
