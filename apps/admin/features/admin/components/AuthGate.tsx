"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/features/admin/context/SessionContext";
import { formatRole } from "@/features/admin/lib/format";
import type { UserRole } from "@/features/admin/types";

interface AuthGateProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGate({ children, allowedRoles }: AuthGateProps) {
  const pathname = usePathname();
  const { loading, user } = useSession();

  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">
        Loading your local product workspace...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold text-foreground">Sign in to continue</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This review workspace runs on the local API and is reserved for admin approvals.
        </p>
        <Link
          href={`/signin?next=${encodeURIComponent(pathname)}`}
          className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Open local sign in
        </Link>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="rounded-3xl border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold text-foreground">Access restricted</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This workspace is only available to {allowedRoles.map((value) => formatRole(value)).join(" and ")} accounts.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
