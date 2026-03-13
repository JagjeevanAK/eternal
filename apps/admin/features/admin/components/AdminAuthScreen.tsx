"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/features/admin/context/SessionContext";
import { formatRole } from "@/features/admin/lib/format";

const ADMIN_ROUTE = "/review";

export function AdminAuthScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { demoUsers, loginWithOtp, logout, requestOtp, user } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const adminDemoUsers = useMemo(
    () => demoUsers.filter((demoUser) => demoUser.role === "admin"),
    [demoUsers],
  );

  useEffect(() => {
    if (!user || user.role !== "admin") {
      return;
    }

    router.replace(searchParams.get("next") ?? ADMIN_ROUTE);
  }, [router, searchParams, user]);

  const startOtp = async (value: string) => {
    const response = await requestOtp(value.trim());
    setIdentifier(value.trim());
    setChallengeSent(true);
    setCodeHint(response.codeHint);
    setCode(response.deliveryMode === "local" ? "000000" : "");

    toast.success(response.deliveryMode === "local" ? "Local OTP ready." : "OTP sent.", {
      description: response.codeHint,
    });
  };

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      toast.error("Enter the admin email or seeded local phone number.");
      return;
    }

    setLoading(true);

    try {
      await startOtp(identifier);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start OTP flow.");
    } finally {
      setLoading(false);
    }
  };

  const completeAdminSignIn = async (value: string, otp: string, successMessage: string) => {
    const loggedInUser = await loginWithOtp(value, otp);
    if (loggedInUser.role !== "admin") {
      await logout();
      throw new Error("Admin access required. Use an admin account for this workspace.");
    }

    toast.success(successMessage);
    router.replace(searchParams.get("next") ?? ADMIN_ROUTE);
  };

  const handleVerify = async () => {
    if (!identifier.trim() || !code.trim()) {
      toast.error("Identifier and OTP are required.");
      return;
    }

    setLoading(true);

    try {
      await completeAdminSignIn(identifier, code, "Signed in to the admin review console.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (value: string) => {
    setIdentifier(value);
    setChallengeSent(true);
    setCode("000000");
    setCodeHint("Use 000000 for seeded @eternal.local admin accounts.");
    setLoading(true);

    try {
      await completeAdminSignIn(value, "000000", "Signed in with seeded admin account.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[0.92fr,1.08fr]">
      <section className="space-y-6">
        <Badge className="w-fit" variant="secondary">
          Admin Portal
        </Badge>
        <div className="space-y-4">
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight">
            Review issuer submissions and approve supporting documents.
          </h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            This workspace is for admins who validate uploaded ownership and compliance documents before an asset can
            move into tokenization.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-card/90">
            <CardContent className="p-5">
              <Mail className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-medium">OTP access</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Real admin emails receive a one-time code. Seeded demo admins can keep using <code>000000</code>.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/90">
            <CardContent className="p-5">
              <FileText className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-medium">Document queue</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open uploaded files, read the issuer note, and decide whether the request moves ahead.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/90">
            <CardContent className="p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-medium">Admin-only</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Non-admin accounts are blocked from this workspace even if they receive an OTP.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <Card className="border-border bg-card/95 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle>Sign in with OTP</CardTitle>
            <CardDescription>
              Use an admin email address or a seeded local admin identifier to open the review queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or phone</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="admin@example.com or +91 90000 00003"
              />
            </div>

            {challengeSent ? (
              <div className="space-y-2">
                <Label htmlFor="otp">OTP code</Label>
                <Input
                  id="otp"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="000000"
                />
              </div>
            ) : null}

            {codeHint ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                {codeHint}
              </div>
            ) : null}

            {user && user.role !== "admin" ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
                Current session: {user.fullName} ({formatRole(user.role)}). Sign out or use an admin account.
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleRequestOtp} disabled={loading} variant="outline">
                {challengeSent ? "Resend OTP" : "Request OTP"}
              </Button>
              <Button onClick={handleVerify} disabled={loading || !challengeSent}>
                Verify and continue
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle className="text-xl">Seeded local admin accounts</CardTitle>
            <CardDescription>Jump directly into the local review console without email delivery.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {adminDemoUsers.map((demoUser) => (
              <button
                key={demoUser.identifier}
                type="button"
                onClick={() => void handleQuickLogin(demoUser.identifier)}
                disabled={loading}
                className="rounded-[1.4rem] border border-border bg-background p-4 text-left transition-colors hover:border-primary/30 disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{demoUser.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatRole(demoUser.role)}</p>
                  </div>
                  <Badge variant="muted">{formatRole(demoUser.kycStatus)}</Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{demoUser.identifier}</p>
                <p className="mt-1 text-xs text-muted-foreground">{demoUser.phone}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          The queue in this app is the current document review flow copied from the issuance portal and rebased for
          admins.
        </p>
      </section>
    </div>
  );
}
