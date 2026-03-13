'use client';

import { Toaster } from 'sonner';
import { useHydrated } from '@/lib/useHydrated';

export default function GlobalOverlays() {
  const hydrated = useHydrated();

  if (!hydrated) {
    return null;
  }

  return <Toaster />;
}
