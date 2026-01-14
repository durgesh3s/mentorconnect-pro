import { ReactNode } from "react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

interface ScrollRevealProps {
  children: ReactNode;
  animationType?: "fadeInUp" | "fadeIn" | "fadeInLeft" | "fadeInRight" | "scaleIn" | "slideUp";
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
  stagger?: boolean;
  staggerDelay?: number;
}

export function ScrollReveal({
  children,
  animationType = "fadeInUp",
  delay = 0,
  duration = 0.8,
  className = "",
  threshold = 0.1,
  stagger = false,
  staggerDelay = 0.1,
}: ScrollRevealProps) {
  const { ref, className: animationClass, style, isVisible } = useScrollAnimation({
    animationType,
    delay,
    duration,
    threshold,
    triggerOnce: true,
  });

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`${animationClass} ${className} ${stagger ? "stagger-container" : ""}`}
      style={{
        ...style,
        ...(stagger && { "--stagger-delay": `${staggerDelay}s` } as React.CSSProperties),
      }}
      data-stagger={stagger ? "true" : undefined}
    >
      {children}
    </div>
  );
}
