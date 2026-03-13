'use client';

import { type ComponentProps, type ComponentType, useEffect, useState } from 'react';

type WalletMultiButtonWrapperProps =
  ComponentProps<typeof import('@solana/wallet-adapter-react-ui').WalletMultiButton>;

export default function WalletMultiButtonWrapper(props: WalletMultiButtonWrapperProps) {
  const [WalletMultiButtonComponent, setWalletMultiButtonComponent] =
    useState<ComponentType<WalletMultiButtonWrapperProps> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import('@solana/wallet-adapter-react-ui')
      .then((module) => {
        if (!cancelled) {
          setWalletMultiButtonComponent(() => module.WalletMultiButton);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalletMultiButtonComponent(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!WalletMultiButtonComponent) {
    return (
      <button
        type="button"
        className={props.className}
        disabled
        style={props.style}
        tabIndex={props.tabIndex}
      >
        {props.children ?? 'Wallet unavailable'}
      </button>
    );
  }

  return <WalletMultiButtonComponent {...props} />;
}
