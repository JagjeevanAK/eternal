import type { ReactNode } from "react";
import { AppShell } from "@/features/exchange/components/AppShell";

export default function ExchangeLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
