'use client';

import type { ComponentProps } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

type WalletMultiButtonWrapperProps = ComponentProps<typeof WalletMultiButton>;

export default function WalletMultiButtonWrapper(props: WalletMultiButtonWrapperProps) {
  return <WalletMultiButton {...props} />;
}
