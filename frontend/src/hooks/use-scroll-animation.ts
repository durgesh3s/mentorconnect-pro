import { useEffect, useRef, useState } from "react";

interface UseScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  duration?: number;
  animationType?: "fadeInUp" | "fadeIn" | "fadeInLeft" | "fadeInRight" | "scaleIn" | "slideUp";
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = "0px 0px -80px 0px",
    triggerOnce = true,
    delay = 0,
    duration = 0.8,
    animationType = "fadeInUp",
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
            if (triggerOnce) {
              observer.unobserve(entry.target);
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce, delay]);

  const getAnimationClass = () => {
    if (!isVisible) {
      switch (animationType) {
        case "fadeInUp":
          return "opacity-0 translate-y-8";
        case "fadeIn":
          return "opacity-0";
        case "fadeInLeft":
          return "opacity-0 -translate-x-8";
        case "fadeInRight":
          return "opacity-0 translate-x-8";
        case "scaleIn":
          return "opacity-0 scale-95";
        case "slideUp":
          return "opacity-0 translate-y-12";
        default:
          return "opacity-0 translate-y-8";
      }
    }
    return "opacity-100 translate-y-0 translate-x-0 scale-100";
  };

  return {
    ref: elementRef,
    isVisible,
    className: `transition-all ease-out-expo ${getAnimationClass()}`,
    style: {
      transitionDuration: `${duration}s`,
      willChange: "opacity, transform",
    },
  };
}
