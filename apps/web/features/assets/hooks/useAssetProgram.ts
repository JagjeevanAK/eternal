'use client';

import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { ASSET_TOKENIZATION_PROGRAM_ID } from '@/features/assets/types';

// Use the v0.28-compatible IDL (camelCase, isMut/isSigner, publicKey type).
// The auto-generated IDL at programs/asset-tokenization/target/idl/ uses Anchor v0.32 format
// (snake_case, writable/signer booleans, pubkey type) which is incompatible with
// @coral-xyz/anchor ^0.28.0 used by the frontend.
import idl from '@/features/assets/idl/asset_tokenization.json';

export const useAssetProgram = () => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }
    return new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      },
      { commitment: 'confirmed' }
    );
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idl as Idl, ASSET_TOKENIZATION_PROGRAM_ID, provider);
  }, [provider]);

  return {
    program,
    provider,
    programId: ASSET_TOKENIZATION_PROGRAM_ID,
    connection,
    wallet,
  };
};
