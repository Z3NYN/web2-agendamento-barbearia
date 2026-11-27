import type { CSSProperties, ReactNode } from "react";
import { useAnimatedNumber, useScrollReveal } from "./useMotion";

export function Reveal({
  children,
  className = "",
  variant = "up",
  delay = 0,
  staggerIndex,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  variant?: "up" | "fade" | "scale" | "left" | "clip";
  delay?: number;
  staggerIndex?: number;
  disabled?: boolean;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>({ disabled });
  const computedDelay = staggerIndex !== undefined ? delay + Math.min(staggerIndex, 8) * 70 : delay;
  const style = computedDelay ? ({ "--reveal-delay": `${computedDelay}ms` } as CSSProperties) : undefined;

  return (
    <div
      ref={ref}
      style={style}
      className={`reveal reveal--${variant}${visible ? " is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export function StaggerLine({
  children,
  delay = 250,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <span className="stagger-line">
      <span style={{ "--line-delay": `${delay}ms` } as CSSProperties}>{children}</span>
    </span>
  );
}

export function AnimatedValue({
  value,
  format,
  duration = 360,
  className = "",
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const animated = useAnimatedNumber(value, duration);
  return <span className={`tabular ${className}`.trim()}>{format(animated)}</span>;
}
