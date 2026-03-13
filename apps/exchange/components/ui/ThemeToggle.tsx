'use client';

import { useTheme } from 'next-themes';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

const emptySubscribe = () => () => {};
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => void;
};

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

      // Get click position for ripple origin
      const x = e.clientX;
      const y = e.clientY;

      // Check if the browser supports View Transitions
      if (
        typeof document !== 'undefined' &&
        'startViewTransition' in document
      ) {
        const viewTransitionDocument = document as ViewTransitionDocument;

        // Set ripple origin as CSS custom properties
        document.documentElement.style.setProperty('--ripple-x', `${x}px`);
        document.documentElement.style.setProperty('--ripple-y', `${y}px`);

        // Use the View Transition API — it captures snapshots of old/new states
        // so actual page content stays visible during the ripple
        viewTransitionDocument.startViewTransition?.(() => {
          setTheme(nextTheme);
        });
      } else {
        // Fallback: just switch
        setTheme(nextTheme);
      }
    },
    [resolvedTheme, setTheme],
  );

  if (!mounted) {
    return (
      <button
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card transition-colors',
          className,
        )}
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      ref={btnRef}
      onClick={toggle}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent',
        className,
      )}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        /* Sun icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        /* Moon icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
