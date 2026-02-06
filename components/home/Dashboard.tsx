import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

const DeadManSwitch = dynamic(
  () => import('@/components/DeadManSwitch'),
  { ssr: false }
);

export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-50 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-medium text-white">
              Eternal Key
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-400 border border-zinc-700">
              Dashboard
            </span>
            <NetworkSwitcher />
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/marketplace" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
              Marketplace
            </Link>
            <Link href="/register" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
              Register Asset
            </Link>
            <Link href="/portfolio" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
              Portfolio
            </Link>
            <Link href="/admin" className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors">
              Admin
            </Link>
            <WalletMultiButton className="!bg-white !text-black hover:!bg-zinc-200 !rounded-lg !text-sm transition-colors" />
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-6">
          <DeadManSwitch />
        </div>
      </main>
    </div>
  );
}; 