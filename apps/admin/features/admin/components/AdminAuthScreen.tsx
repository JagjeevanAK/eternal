"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Eternal Admin</span>
            </a>
            <h1 className="text-xl font-bold">Eternal Admin Portal</h1>
            <div className="text-center text-sm text-muted-foreground">
              Sign in with OTP to access the review console.
            </div>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Sign in with OTP</CardTitle>
              <CardDescription>
                Use a provisioned admin email or a seeded local admin identifier.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="identifier">Email or phone</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="admin@example.com or +91 90000 00003"
                />
              </div>

              {challengeSent ? (
                <div className="grid gap-2">
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
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                  {codeHint}
                </div>
              ) : null}

              {user && user.role !== "admin" ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
                  Current session: {user.fullName} ({formatRole(user.role)}). Sign out or use an admin account.
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <Button onClick={handleRequestOtp} disabled={loading} variant="outline" className="w-full">
                  {challengeSent ? "Resend OTP" : "Request OTP"}
                </Button>
                <Button onClick={handleVerify} disabled={loading || !challengeSent} className="w-full">
                  Verify and continue
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Admin signup is not self-serve. Admin accounts must already exist in the local seed data.
              </p>
            </CardContent>
          </Card>

          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or use a seeded account
            </span>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Seeded local admin accounts</CardTitle>
              <CardDescription>Jump directly into the local review console.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {adminDemoUsers.map((demoUser) => (
                <button
                  key={demoUser.identifier}
                  type="button"
                  onClick={() => void handleQuickLogin(demoUser.identifier)}
                  disabled={loading}
                  className="rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/30 disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{demoUser.fullName}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{formatRole(demoUser.role)}</p>
                    </div>
                    <Badge variant="muted">{formatRole(demoUser.kycStatus)}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{demoUser.identifier}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{demoUser.phone}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="text-balance text-center text-xs text-muted-foreground">
            The queue in this app is the current document review flow for admins.
          </div>
        </div>
      </div>
    </div>
  );
}
