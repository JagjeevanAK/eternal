"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/features/product/context/SessionContext";
import { formatRole } from "@/features/product/lib/format";

const nextRouteForRole = (role: "admin" | "issuer" | "investor") => {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "issuer") {
    return "/issuer";
  }

  return "/dashboard";
};

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { demoUsers, loginWithOtp, requestOtp, user } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [challengeSent, setChallengeSent] = useState(false);
  const [code, setCode] = useState("000000");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace(searchParams.get("next") ?? nextRouteForRole(user.role));
  }, [router, searchParams, user]);

  const handleRequestOtp = async () => {
    if (!identifier) {
      toast.error("Enter a demo email or phone number.");
      return;
    }

    setLoading(true);

    try {
      const response = await requestOtp(identifier);
      setChallengeSent(true);
      toast.success("OTP sent in local mode.", {
        description: `${response.destination} is ready. Use 000000 to continue.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start OTP flow.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!identifier || !code) {
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
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr,1.1fr]">
      <section className="rounded-[2rem] border border-border bg-card p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Local OTP access
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          Sign in with seeded demo accounts.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          This local product stack uses mock OTP delivery. Request an OTP, then enter `000000`
          to open the investor, issuer, or admin workspace.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-muted-foreground">
            Email or phone
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="admin@eternal.local"
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
            />
          </label>

          {challengeSent && (
            <label className="block text-sm font-medium text-muted-foreground">
              OTP code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="000000"
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
              />
            </label>
          )}

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

      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Seeded users
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">Jump straight into the local flow</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {demoUsers.map((demoUser) => (
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
      </section>
    </div>
  );
}
