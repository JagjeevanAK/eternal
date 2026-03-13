"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/features/product/context/SessionContext";
import { formatRole } from "@/features/product/lib/format";
import { apiFetch } from "@/lib/product-api";
import type { SessionUser, UserRole } from "@/features/product/types";

const ISSUANCE_PORTAL_URL =
  process.env.NEXT_PUBLIC_ISSUANCE_PORTAL_URL ?? "http://localhost:3001";
const ADMIN_PORTAL_URL =
  process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL ?? "http://localhost:3002";

const nextRouteForRole = (role: UserRole) => {
  if (role === "admin") {
    return `${ADMIN_PORTAL_URL}/review`;
  }

  if (role === "issuer") {
    return `${ISSUANCE_PORTAL_URL}/issuer`;
  }

  return "/dashboard";
};

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { demoUsers, loginWithOtp, requestOtp, user } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState<string | null>(null);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const navigateToRoleHome = useCallback(
    (role: UserRole) => {
      const nextTarget =
        role === "investor" ? searchParams.get("next") ?? nextRouteForRole(role) : nextRouteForRole(role);

      if (nextTarget.startsWith("http://") || nextTarget.startsWith("https://")) {
        window.location.assign(nextTarget);
        return;
      }

      router.replace(nextTarget);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    navigateToRoleHome(user.role);
  }, [navigateToRoleHome, user]);

  const startOtp = async (value: string, successTitle?: string) => {
    const response = await requestOtp(value.trim());
    setIdentifier(value.trim());
    setChallengeSent(true);
    setCodeHint(response.codeHint);
    setCode(response.deliveryMode === "local" ? "000000" : "");

    toast.success(
      successTitle ?? (response.deliveryMode === "local" ? "Local OTP ready." : "OTP sent."),
      { description: response.codeHint },
    );

    return response;
  };

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      toast.error("Enter your email or a seeded demo phone number.");
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
      const response = await apiFetch<{ created: boolean; user: SessionUser }>("/auth/signup", {
        method: "POST",
        body: {
          fullName: signupName,
          email: signupEmail,
        },
      });
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
      toast.success(
        loggedInUser.role === "investor"
          ? "Signed in successfully."
          : `Exchange is investor-only. Continue in the ${formatRole(loggedInUser.role)} portal.`,
      );
      navigateToRoleHome(loggedInUser.role);
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
      toast.success(
        loggedInUser.role === "investor"
          ? "Signed in with seeded local account."
          : `Exchange is investor-only. Continue in the ${formatRole(loggedInUser.role)} portal.`,
      );
      navigateToRoleHome(loggedInUser.role);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr,1.1fr]">
      <section className="rounded-[2rem] border border-border bg-card p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Sign in
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          Investor sign in for the exchange, `000000` for seeded local investor accounts.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Use a registered investor email to receive a 6-digit OTP over Resend. Seeded
          `@eternal.local` investor accounts do not need signup and can continue with `000000`.
          Issuer and admin users should use their dedicated portals below.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-muted-foreground">
            Email or phone
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="name@example.com or +91 90000 00001"
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
          </label>

          {challengeSent ? (
            <label className="block text-sm font-medium text-muted-foreground">
              OTP code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="000000"
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </label>
          ) : null}

          {codeHint ? (
            <p className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              {codeHint}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRequestOtp}
              disabled={loading}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
            >
              {challengeSent ? "Resend OTP" : "Request OTP"}
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || !challengeSent}
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Verify and continue
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div id="signup" className="rounded-[1.75rem] border border-border bg-card p-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Sign up
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Create a real-email investor account</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Signup is only for non-`@eternal.local` email addresses. After signup, the app sends an
            OTP and drops you back into the sign-in flow.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-muted-foreground">
              Full name
              <input
                value={signupName}
                onChange={(event) => setSignupName(event.target.value)}
                placeholder="Rohan Shah"
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </label>

            <label className="block text-sm font-medium text-muted-foreground">
              Email
              <input
                value={signupEmail}
                onChange={(event) => setSignupEmail(event.target.value)}
                placeholder="name@example.com"
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </label>

            <button
              onClick={handleSignup}
              disabled={loading}
              className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              Create account
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Seeded users
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Jump straight into the local flow</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Exchange quick login is for investor accounts. Issuer and admin users should use their dedicated portals.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {demoUsers
            .filter((demoUser) => demoUser.role === "investor")
            .map((demoUser) => (
            <button
              key={demoUser.identifier}
              onClick={() => handleQuickLogin(demoUser.identifier)}
              disabled={loading}
              className="rounded-[1.5rem] border border-border bg-card p-5 text-left transition-colors hover:border-ring/40 disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{demoUser.fullName}</p>
                  <p className="text-sm text-muted-foreground">{formatRole(demoUser.role)}</p>
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                  {formatRole(demoUser.kycStatus)}
                </span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{demoUser.identifier}</p>
              <p className="mt-1 text-sm text-muted-foreground">{demoUser.phone}</p>
            </button>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-border bg-card p-5">
          <p className="text-sm font-medium text-foreground">Need issuer or admin access?</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Those workflows no longer live in the exchange UI.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`${ISSUANCE_PORTAL_URL}/issuer`}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Open issuer portal
            </Link>
            <Link
              href={`${ADMIN_PORTAL_URL}/review`}
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Open admin portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
