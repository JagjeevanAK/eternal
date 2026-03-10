import { existsSync } from "fs";
import path from "path";

const projectRoot = process.cwd();
const walletPath = process.env.ANCHOR_WALLET ?? path.join(process.env.HOME ?? "", ".config/solana/id.json");
const rpcUrl = process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";

if (!existsSync(walletPath)) {
  throw new Error(`Anchor wallet not found at ${walletPath}`);
}

const run = async (cmd: string[], env: Record<string, string> = {}) => {
  const proc = Bun.spawn(cmd, {
    cwd: projectRoot,
    env: {
      ...process.env,
      ...env,
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Command failed: ${cmd.join(" ")}`);
  }
};

const waitForRpc = async (timeoutMs = 20_000) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getHealth",
        }),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the validator is ready.
    }

    await Bun.sleep(500);
  }

  throw new Error(`Validator did not become ready at ${rpcUrl} within ${timeoutMs}ms`);
};

await run(["bun", "run", "build"]);

const validator = Bun.spawn(["bun", "run", "localnet"], {
  cwd: projectRoot,
  env: {
    ...process.env,
  },
  stdout: "inherit",
  stderr: "inherit",
});

const stopValidator = async () => {
  validator.kill("SIGINT");
  await validator.exited;
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void stopValidator().finally(() => process.exit(1));
  });
}

try {
  await waitForRpc();
  await run(["bun", "test", "./tests/asset_tokenization.test.ts"], {
    ANCHOR_PROVIDER_URL: rpcUrl,
    ANCHOR_WALLET: walletPath,
  });
} finally {
  await stopValidator();
}
