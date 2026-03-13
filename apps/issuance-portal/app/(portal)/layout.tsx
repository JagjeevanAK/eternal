import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  return <PortalShell>{children}</PortalShell>;
}
