'use client';

import { useRouter } from 'next/navigation';
import { IconPlus } from '@tabler/icons-react';
import { RegisterAssetForm } from '@/features/assets/components/RegisterAssetForm';

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <IconPlus className="h-7 w-7 text-primary" />
          Register New Asset
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register a real-world asset on-chain and prepare it for verification.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <RegisterAssetForm onSuccess={() => router.push('/marketplace')} />
      </div>
    </div>
  );
}
