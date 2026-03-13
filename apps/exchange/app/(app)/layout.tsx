import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';

interface AssetAppLayoutProps {
  children: ReactNode;
}

export default function AssetAppLayout({ children }: AssetAppLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
