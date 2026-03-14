"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
    return "/";
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

  const handleSignupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSignup();
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

  if (mode === "signup") {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <a href="#" className="flex items-center gap-2 self-center font-medium">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Issuance Portal
          </a>
          <div className={cn("flex flex-col gap-6")}>
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Create your account</CardTitle>
                <CardDescription>
                  Enter your details below to create your portal account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignupSubmit}>
                  <div className="flex flex-col gap-6">
                    <div className="grid gap-2">
                      <Label htmlFor="full-name">Full name</Label>
                      <Input
                        id="full-name"
                        autoComplete="name"
                        value={signupName}
                        onChange={(event) => setSignupName(event.target.value)}
                        placeholder="Rohan Shah"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Work email</Label>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={signupEmail}
                        onChange={(event) => setSignupEmail(event.target.value)}
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Creating account..." : "Create account"}
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                        Sign in
                      </Link>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
            <div className="text-balance text-center text-xs text-muted-foreground">
              Only non-@eternal.local email addresses need signup. You will be moved into OTP sign in after account creation.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Issuance Portal</span>
            </a>
            <h1 className="text-xl font-bold">Issuance Portal</h1>
            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="underline underline-offset-4 hover:text-primary">
                Sign up
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="identifier">Email or phone</Label>
              <Input
                id="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="name@example.com or +91 90000 00001"
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

            <div className="flex flex-col gap-2">
              <Button onClick={handleRequestOtp} disabled={loading} variant="outline" className="w-full">
                {challengeSent ? "Resend OTP" : "Request OTP"}
              </Button>
              <Button onClick={handleVerify} disabled={loading || !challengeSent} className="w-full">
                Verify and continue
              </Button>
            </div>
          </div>

          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or use a seeded account
            </span>
          </div>

          <div className="grid gap-3">
            {demoUsers.map((demoUser) => (
              <button
                key={demoUser.identifier}
                type="button"
                onClick={() => void handleQuickLogin(demoUser.identifier)}
                disabled={loading}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{demoUser.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatRole(demoUser.role)}</p>
                  </div>
                  <Badge variant="muted">{formatRole(demoUser.kycStatus)}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{demoUser.identifier}</p>
              </button>
            ))}
          </div>

          <div className="text-balance text-center text-xs text-muted-foreground">
            Seeded @eternal.local accounts use <code>000000</code> as the OTP code. Real email addresses receive delivery via Resend.
          </div>
        </div>
      </div>
    </div>
  );
}
