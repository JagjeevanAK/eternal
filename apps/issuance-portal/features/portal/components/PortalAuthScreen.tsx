"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/features/portal/context/SessionContext";
import { formatRole } from "@/features/portal/lib/format";

type AuthMode = "login" | "signup";

interface PortalAuthScreenProps {
  defaultMode: AuthMode;
}

const nextRouteForRole = (role: "admin" | "issuer" | "investor") => {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "issuer") {
    return "/issuer";
  }

  return "/verification";
};

export function PortalAuthScreen({ defaultMode }: PortalAuthScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { demoUsers, loginWithOtp, requestOtp, signup, user } = useSession();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [identifier, setIdentifier] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "signup" || modeParam === "login") {
      setMode(modeParam);
      return;
    }

    setMode(defaultMode);
  }, [defaultMode, searchParams]);

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace(searchParams.get("next") ?? nextRouteForRole(user.role));
  }, [router, searchParams, user]);

  const startOtp = async (value: string, successTitle?: string) => {
    const response = await requestOtp(value.trim());
    setIdentifier(value.trim());
    setChallengeSent(true);
    setCodeHint(response.codeHint);
    setCode(response.deliveryMode === "local" ? "000000" : "");
    setMode("login");

    toast.success(
      successTitle ?? (response.deliveryMode === "local" ? "Local OTP ready." : "OTP sent."),
      { description: response.codeHint },
    );

    return response;
  };

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      toast.error("Enter your email or seeded local phone number.");
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

  const handleSignup = async () => {
    if (!signupName.trim() || !signupEmail.trim()) {
      toast.error("Full name and email are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await signup(signupName, signupEmail);
      await startOtp(
        response.user.email,
        response.created ? "Account created. OTP sent." : "Account already exists. OTP sent.",
      );
      setSignupName("");
      setSignupEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create your account.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!identifier.trim() || !code.trim()) {
      toast.error("Identifier and OTP are required.");
      return;
    }

    setLoading(true);

    try {
      const loggedInUser = await loginWithOtp(identifier, code);
      toast.success("Signed in successfully.");
      router.replace(searchParams.get("next") ?? nextRouteForRole(loggedInUser.role));
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
    setCodeHint("Use 000000 for seeded @eternal.local accounts.");
    setLoading(true);

    try {
      const loggedInUser = await loginWithOtp(value, "000000");
      toast.success("Signed in with seeded local account.");
      router.replace(searchParams.get("next") ?? nextRouteForRole(loggedInUser.role));
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
          Issuance Portal
        </Badge>
        <div className="space-y-4">
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight">
            Sign in for issuer, verification, and admin review workflows.
          </h1>
          <p className="max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
            Real email addresses receive an OTP. Seeded local accounts can keep using <code>000000</code>. This portal
            is where new asset submissions, owner proof checks, and compliance reviews now live.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-card/90">
            <CardContent className="p-5">
              <Mail className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-medium">OTP auth</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Email delivery for real users, local OTP for seeded demos.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/90">
            <CardContent className="p-5">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-medium">Separated from exchange</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Issuance work stays here so the exchange app stays focused on trading.</p>
            </CardContent>
          </Card>
          <Card className="bg-card/90">
            <CardContent className="p-5">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm font-medium">Role-based routing</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Investors go to verification, issuers to the desk, and admins to review.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <Card className="border-border bg-card/95 backdrop-blur">
          <CardHeader className="pb-4">
            <div className="inline-flex rounded-full border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>
            <CardTitle>{mode === "login" ? "Continue with OTP" : "Create a portal account"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Use a registered email or a seeded demo identifier."
                : "Only non-@eternal.local email addresses need signup. You will be moved into OTP sign in after account creation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {mode === "login" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or phone</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="name@example.com or +91 90000 00001"
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

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleRequestOtp} disabled={loading} variant="outline">
                    {challengeSent ? "Resend OTP" : "Request OTP"}
                  </Button>
                  <Button onClick={handleVerify} disabled={loading || !challengeSent}>
                    Verify and continue
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input
                    id="full-name"
                    value={signupName}
                    onChange={(event) => setSignupName(event.target.value)}
                    placeholder="Rohan Shah"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={signupEmail}
                    onChange={(event) => setSignupEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                <Button onClick={handleSignup} disabled={loading} className="w-full">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle className="text-xl">Seeded local accounts</CardTitle>
            <CardDescription>Jump straight into the local demo flow without email delivery.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {demoUsers.map((demoUser) => (
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
          Looking for the trading surface instead? The exchange app now keeps browsing, orders, and portfolio workflows
          separate from this portal.
        </p>
        <p className="text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              Need an account?{" "}
              <Link href="/signup" className="font-medium text-foreground transition-colors hover:text-primary">
                Open sign up
              </Link>
              .
            </>
          ) : (
            <>
              Already have access?{" "}
              <Link href="/login" className="font-medium text-foreground transition-colors hover:text-primary">
                Go to sign in
              </Link>
              .
            </>
          )}
        </p>
      </section>
    </div>
  );
}
