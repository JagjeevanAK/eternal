"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatRole } from "@/features/exchange/lib/format";
import type { UserRole } from "@/features/exchange/types";

interface AuthGateProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGate({ children, allowedRoles }: AuthGateProps) {
  const pathname = usePathname();
  const { loading, user } = useSession();

  if (loading) {
    return (
      <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
        <CardContent className="px-6 py-10 text-sm text-muted-foreground">
          Loading your exchange workspace...
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to continue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            This workspace talks to the local exchange API and unlocks portfolio, payments, and
            order execution for investor accounts.
          </p>
          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Open investor sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Card className="border-white/70 bg-card/92 shadow-2xl shadow-sky-950/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">Access restricted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This screen is only available to {allowedRoles.map((value) => formatRole(value)).join(" and ")} accounts.
          </p>
          <p>You are signed in as {formatRole(user.role)}.</p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
