import { Suspense } from "react";
import { PortalAuthScreen } from "@/features/portal/components/PortalAuthScreen";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">
          Loading sign up...
        </div>
      }
    >
      <PortalAuthScreen defaultMode="signup" />
    </Suspense>
  );
}
