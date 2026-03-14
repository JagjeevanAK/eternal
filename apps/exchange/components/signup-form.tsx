 "use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GalleryVerticalEndIcon } from "lucide-react";
import { cn } from "@/lib/utils";
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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSession } from "@/features/exchange/context/SessionContext";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithOtp, requestOtp, signup, user } = useSession();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = searchParams.get("next") ?? "/";

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace(redirectTarget);
  }, [redirectTarget, router, user]);

  async function handleCreateAccount() {
    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await signup(fullName.trim(), email.trim());
      const otpResponse = await requestOtp(response.user.email);
      setChallengeSent(true);
      setEmail(response.user.email);
      setCode(otpResponse.deliveryMode === "local" ? "000000" : "");
      setCodeHint(otpResponse.codeHint);
      setMessage(
        response.created
          ? "Investor account created. Verify the OTP to continue."
          : "Account already exists. Verify the OTP to continue.",
      );
    } catch (signupError) {
      setError(
        signupError instanceof Error ? signupError.message : "Failed to create your account.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!email.trim() || !code.trim()) {
      setError("Email and OTP code are required.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await loginWithOtp(email.trim(), code.trim());
      router.replace(redirectTarget);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!email.trim()) {
      setError("Email is required before requesting OTP.");
      setMessage(null);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await requestOtp(email.trim());
      setCodeHint(response.codeHint);
      setCode(response.deliveryMode === "local" ? "000000" : "");
      setMessage("A fresh OTP challenge is ready.");
    } catch (otpError) {
      setError(otpError instanceof Error ? otpError.message : "Failed to request a new OTP.");
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

    void handleCreateAccount();
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
          <CardTitle className="text-xl">Create your investor account</CardTitle>
          <CardDescription>
            Sign up with your name and email. OTP verification completes access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  type="text"
                  placeholder="Rohan Shah"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  disabled={loading || challengeSent}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading || challengeSent}
                  required
                />
              </Field>

              {challengeSent ? (
                <Field>
                  <FieldLabel htmlFor="signup-otp">OTP Code</FieldLabel>
                  <Input
                    id="signup-otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    disabled={loading}
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

              <Field>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? challengeSent
                      ? "Verifying..."
                      : "Creating Account..."
                    : challengeSent
                      ? "Verify and Continue"
                      : "Create Account"}
                </Button>
                {challengeSent ? (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => void handleResendOtp()}
                    disabled={loading}
                  >
                    Resend OTP
                  </Button>
                ) : null}
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="underline underline-offset-4">
                    Sign in
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Seeded demo accounts do not need signup. Use the login page with OTP `000000`.
      </FieldDescription>
    </div>
  );
}
