import { useEffect, useRef } from "react";

/**
 * useScrollReveal Hook
 * Automatically attaches an IntersectionObserver to the returned ref
 * and adds the `is-revealed` class when scrolled into view.
 */
export function useScrollReveal(options = {}) {
  const { threshold = 0.12, rootMargin = "0px 0px -40px 0px" } = options;
  const elementRef = useRef(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Check if IntersectionObserver is supported
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-revealed");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-revealed");
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [threshold, rootMargin]);

  return elementRef;
}

/**
 * Attaches IntersectionObserver to any child elements containing `.reveal-init`
 */
export function useBatchScrollReveal(containerRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!("IntersectionObserver" in window)) {
      const items = container.querySelectorAll(".reveal-init");
      items.forEach((item) => item.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    const items = container.querySelectorAll(".reveal-init");
    items.forEach((item) => observer.observe(item));

    return () => {
      items.forEach((item) => observer.unobserve(item));
    };
  }, [containerRef]);
}
