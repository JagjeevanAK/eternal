import { Suspense } from "react";
import { AdminAuthScreen } from "@/features/admin/components/AdminAuthScreen";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">
          Loading sign in...
        </div>
      }
    >
      <AdminAuthScreen />
    </Suspense>
  );
}
