import { useEffect, useRef } from "react";

/* Simple scroll-reveal wrapper using IntersectionObserver + CSS transition. */
export default function Reveal({ children, className = "", delay = 0, style = {} }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("visible");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ ...(style || {}), ...(delay ? { transitionDelay: `${delay}ms` } : {}) }}
    >
      {children}
    </div>
  );
}
