"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, GalleryVerticalEndIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/exchange/context/SessionContext";
import { formatRole } from "@/features/exchange/lib/format";
import { cn } from "@/lib/utils";

const statusTone = (value: string) => {
  if (value === "approved") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
  }

  if (value === "pending") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-700";
  }

  if (value === "rejected") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700";
  }

  return "border-border bg-muted text-muted-foreground";
};

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { demoUsers, loading: sessionLoading, loginWithOtp, requestOtp, user } =
    useSession();

  const [identifier, setIdentifier] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = searchParams.get("next") ?? "/";
  const investorDemoUsers = demoUsers.filter((demoUser) => demoUser.role === "investor");

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace(redirectTarget);
  }, [redirectTarget, router, user]);

  async function beginOtp(nextIdentifier: string, successMessage: string) {
    const response = await requestOtp(nextIdentifier.trim());
    setIdentifier(nextIdentifier.trim());
    setChallengeSent(true);
    setCodeHint(response.codeHint);
    setCode(response.deliveryMode === "local" ? "000000" : "");
    setMessage(successMessage);
    setError(null);
  }

  async function handleRequestOtp() {
    if (!identifier.trim()) {
      setError("Enter your email or seeded investor identifier.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await beginOtp(
        identifier,
        challengeSent ? "A fresh OTP challenge is ready." : "OTP challenge created.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Failed to start the OTP flow.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!identifier.trim() || !code.trim()) {
      setError("Identifier and OTP code are required.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await loginWithOtp(identifier, code);
      router.replace(redirectTarget);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(nextIdentifier: string) {
    setLoading(true);
    setError(null);
    setMessage(null);
    setIdentifier(nextIdentifier);
    setChallengeSent(true);
    setCodeHint("Seeded investor accounts use OTP code 000000.");
    setCode("000000");

    try {
      await loginWithOtp(nextIdentifier, "000000");
      router.replace(redirectTarget);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (challengeSent) {
      void handleVerify();
      return;
    }

    void handleRequestOtp();
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GalleryVerticalEndIcon className="size-5" />
            </div>
          </div>
          <CardTitle className="text-xl">Sign in to Eternal Exchange</CardTitle>
          <CardDescription>
            Use OTP for an investor account, or jump in with a seeded demo user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="identifier">Email or seeded identifier</FieldLabel>
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="email"
                  placeholder="alpha@eternal.local"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  disabled={loading || sessionLoading}
                  required
                />
              </Field>

              {challengeSent ? (
                <Field>
                  <FieldLabel htmlFor="otp-code">OTP Code</FieldLabel>
                  <Input
                    id="otp-code"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    disabled={loading || sessionLoading}
                    required
                  />
                </Field>
              ) : null}

              {codeHint ? <FieldDescription>{codeHint}</FieldDescription> : null}
              {message ? (
                <FieldDescription className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-700">
                  {message}
                </FieldDescription>
              ) : null}
              {error ? <FieldError>{error}</FieldError> : null}

              <Field className="grid gap-3">
                <Button type="submit" disabled={loading || sessionLoading}>
                  {loading
                    ? challengeSent
                      ? "Verifying..."
                      : "Requesting OTP..."
                    : challengeSent
                      ? "Verify and Continue"
                      : "Request OTP"}
                </Button>
                {challengeSent ? (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => void handleRequestOtp()}
                    disabled={loading || sessionLoading}
                  >
                    Resend OTP
                  </Button>
                ) : null}
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="underline underline-offset-4">
                    Sign up
                  </Link>
                </FieldDescription>
              </Field>

              <FieldSeparator>Seeded Investors</FieldSeparator>

              <Field className="grid gap-3">
                {investorDemoUsers.map((demoUser) => (
                  <Button
                    key={demoUser.identifier}
                    variant="outline"
                    type="button"
                    onClick={() => void handleQuickLogin(demoUser.identifier)}
                    disabled={loading || sessionLoading}
                    className="h-auto justify-between px-4 py-3"
                  >
                    <span className="text-left">
                      <span className="block font-medium">{demoUser.fullName}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {demoUser.identifier}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge className={statusTone(demoUser.kycStatus)}>
                        {formatRole(demoUser.kycStatus)}
                      </Badge>
                      <ArrowRight className="size-4" />
                    </span>
                  </Button>
                ))}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Seeded `@eternal.local` investor accounts sign in with OTP code `000000`.
      </FieldDescription>
    </div>
  );
}
