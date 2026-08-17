import React, { useEffect, useRef, useState } from 'react';

/**
 * Render children once the placeholder has been scrolled near.
 *
 * An account page stacks several chain tables, and all of them queried on
 * mount even though only the first is usually on screen (#57). This defers
 * the ones below the fold without changing the layout — no tabs, no
 * disclosure, the page looks and scrolls exactly as before.
 *
 * Falls back to rendering immediately where IntersectionObserver is missing,
 * so the content is never unreachable.
 */
export function WhenVisible({
  children,
  rootMargin = '400px',
  placeholder = null,
}: {
  children: React.ReactNode;
  /** How far ahead to start loading. Generous, so it feels eager. */
  rootMargin?: string;
  placeholder?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(
    typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (visible || !ref.current) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
        }
      },
      { rootMargin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref}>{visible ? children : placeholder}</div>;
}
