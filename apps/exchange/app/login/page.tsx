import { Suspense } from "react";
import { LoginScreen } from "@/features/product/components/LoginScreen";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-16 text-sm text-muted-foreground">
          Loading sign in...
        </div>
      }
    >
      <LoginScreen />
    </Suspense>
  );
}
