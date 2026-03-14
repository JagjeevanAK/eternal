import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

const RPC_URL =
  process.env.ANCHOR_PROVIDER_URL ?? process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const COMMITMENT = "confirmed";
const DEFAULT_SOL_PRICE_INR_MINOR = 8_190;

const connection = new Connection(RPC_URL, COMMITMENT);

export const SOLANA_QUOTE_SOURCE = "static_demo_quote" as const;
export const SOL_PRICE_INR_MINOR = (() => {
  const parsed = Number(process.env.SOL_PRICE_INR_MINOR ?? process.env.NEXT_PUBLIC_SOL_PRICE_INR_MINOR ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : DEFAULT_SOL_PRICE_INR_MINOR;
})();

export const inrMinorToLamports = (amountInrMinor: number) => {
  const normalizedAmount = BigInt(Math.max(0, Math.round(amountInrMinor)));
  const numerator = normalizedAmount * BigInt(LAMPORTS_PER_SOL);
  const denominator = BigInt(SOL_PRICE_INR_MINOR);

  return Number((numerator + denominator / 2n) / denominator);
};

export const buildSolQuote = (amountInrMinor: number) => {
  const lamports = inrMinorToLamports(amountInrMinor);

  return {
    amountInrMinor,
    amountLamports: lamports,
    amountSol: lamports / LAMPORTS_PER_SOL,
    inrPerSolMinor: SOL_PRICE_INR_MINOR,
    source: SOLANA_QUOTE_SOURCE,
  };
};

export interface SolanaTransferExpectation {
  label: string;
  destination: string;
  minimumLamports: number;
}

const collectMatchingTransfers = (
  instructions: readonly unknown[] | undefined,
  {
    expectedSource,
    expectedDestination,
  }: {
    expectedSource: string;
    expectedDestination: string;
  },
) => {
  if (!instructions?.length) {
    return 0;
  }

  let matchedLamports = 0;

  for (const instruction of instructions) {
    const candidate = instruction as {
      program?: string;
      parsed?: {
        type?: string;
        info?: Record<string, unknown>;
      };
    };

    if (candidate.program !== "system" || candidate.parsed?.type !== "transfer") {
      continue;
    }

    const info = candidate.parsed.info ?? {};
    const source = String(info.source ?? info.from ?? "");
    const destination = String(info.destination ?? info.to ?? "");
    const lamports = Number(info.lamports ?? 0);

    if (source === expectedSource && destination === expectedDestination && Number.isFinite(lamports)) {
      matchedLamports += lamports;
    }
  }

  return matchedLamports;
};

export const verifyLocalnetSolPayment = async ({
  signature,
  expectedSource,
  expectedDestination,
  minimumLamports,
}: {
  signature: string;
  expectedSource: string;
  expectedDestination: string;
  minimumLamports: number;
}) =>
  verifyLocalnetSolTransfers({
    signature,
    expectedSource,
    expectedTransfers: [
      {
        label: "payment",
        destination: expectedDestination,
        minimumLamports,
      },
    ],
  });

export const verifyLocalnetSolTransfers = async ({
  signature,
  expectedSource,
  expectedTransfers,
}: {
  signature: string;
  expectedSource: string;
  expectedTransfers: readonly SolanaTransferExpectation[];
}) => {
  const transaction = await connection.getParsedTransaction(signature, {
    commitment: COMMITMENT,
    maxSupportedTransactionVersion: 0,
  });

  if (!transaction) {
    throw new Error("Localnet transaction was not found. Confirm the signature and try again.");
  }

  if (transaction.meta?.err) {
    throw new Error("Localnet transaction failed and cannot be used for payment settlement.");
  }

  const matchedTransfers = expectedTransfers.map((transfer) => {
    const messageLamports = collectMatchingTransfers(transaction.transaction.message.instructions, {
      expectedSource,
      expectedDestination: transfer.destination,
    });
    const innerLamports =
      transaction.meta?.innerInstructions?.reduce(
        (total, current) =>
          total +
          collectMatchingTransfers(current.instructions as readonly unknown[] | undefined, {
            expectedSource,
            expectedDestination: transfer.destination,
          }),
        0,
      ) ?? 0;

    const matchedLamports = messageLamports + innerLamports;
    if (matchedLamports < transfer.minimumLamports) {
      throw new Error(
        `Localnet SOL transfer for ${transfer.label} is too small. Expected at least ${transfer.minimumLamports} lamports, found ${matchedLamports}.`,
      );
    }

    return {
      ...transfer,
      matchedLamports,
    };
  });

  return {
    matchedLamports: matchedTransfers.reduce((total, current) => total + current.matchedLamports, 0),
    matchedTransfers,
    slot: transaction.slot,
  };
};
