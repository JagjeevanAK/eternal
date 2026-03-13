import { Suspense } from "react";
import { PortalAuthScreen } from "@/features/portal/components/PortalAuthScreen";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">
          Loading sign in...
        </div>
      }
    >
      <PortalAuthScreen defaultMode="login" />
    </Suspense>
  );
}
