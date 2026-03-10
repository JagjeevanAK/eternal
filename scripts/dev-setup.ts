const ROOT_DIR = process.cwd();
const PROGRAM_DIR = `${ROOT_DIR}/programs/asset-tokenization`;
const LOCAL_RPC_URL = "http://127.0.0.1:8899";
const WEB_URL = "http://localhost:3000";
const POLL_INTERVAL_MS = 500;
const RPC_TIMEOUT_MS = 60_000;

type ExitResult = { code: number | null; signalCode: number | null };

const bunBin = process.execPath;

const runCommand = async (
  cmd: string[],
  cwd: string,
  env: Record<string, string | undefined> = {},
): Promise<void> => {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: { ...process.env, ...env },
  });

  await proc.exited;

  const result = {
    code: proc.exitCode,
    signalCode: proc.signalCode,
  } as ExitResult;

  if (result.code !== 0) {
    throw new Error(`Command failed: ${cmd.join(" ")} (${result.code ?? "signal"})`);
  }
};

const spawnLongRunning = (
  cmd: string[],
  cwd: string,
  env: Record<string, string | undefined> = {},
) => {
  return Bun.spawn(cmd, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    env: { ...process.env, ...env },
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const rpcIsReady = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [],
      }),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      error?: { message?: string };
      result?: unknown;
    };

    return Boolean(payload.result);
  } catch {
    return false;
  }
};

const waitForRpc = async (url: string, timeoutMs: number): Promise<void> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await rpcIsReady(url)) {
      return;
    }

    if (validator && validator.exitCode !== null) {
      throw new Error(
        `Local validator exited before RPC became ready (${validator.exitCode ?? validator.signalCode ?? "unknown"}).`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for local validator at ${url}`);
};

const optionalAirdrop = async () => {
  const wallets = process.env.DEMO_AIRDROP_WALLETS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!wallets?.length) {
    return;
  }

  const amount = process.env.DEMO_AIRDROP_SOL ?? "20";

  for (const wallet of wallets) {
    await runCommand(
      ["solana", "airdrop", amount, wallet, "--url", LOCAL_RPC_URL],
      ROOT_DIR,
    );
  }
};

const stopProcess = (proc: ReturnType<typeof Bun.spawn> | null) => {
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) {
    return;
  }

  proc.kill("SIGTERM");
};

let validator: ReturnType<typeof Bun.spawn> | null = null;
let web: ReturnType<typeof Bun.spawn> | null = null;

const cleanup = () => {
  stopProcess(web);
  stopProcess(validator);
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

try {
  console.log("Building Anchor program...");
  await runCommand([bunBin, "run", "build"], PROGRAM_DIR);

  if (await rpcIsReady(LOCAL_RPC_URL)) {
    console.log("Using existing local validator.");
  } else {
    console.log("Starting local validator...");
    validator = spawnLongRunning([bunBin, "run", "localnet"], PROGRAM_DIR);
  }

  console.log(`Waiting for local validator at ${LOCAL_RPC_URL}...`);
  await waitForRpc(LOCAL_RPC_URL, RPC_TIMEOUT_MS);

  console.log("Initializing platform config...");
  await runCommand([bunBin, "run", "init:local"], PROGRAM_DIR);

  await optionalAirdrop();

  console.log(`Starting web app at ${WEB_URL}...`);
  web = spawnLongRunning([bunBin, "run", "dev:web:local"], ROOT_DIR);

  console.log("Local demo is ready.");
  console.log(`UI: ${WEB_URL}`);
  console.log(`RPC: ${LOCAL_RPC_URL}`);
  console.log("Use Phantom on localnet for the easiest browser-wallet flow.");

  const validatorExit =
    validator !== null
      ? validator.exited.then(() => "validator" as const)
      : new Promise<"validator">(() => {});
  const webExit = web.exited.then(() => "web" as const);
  const winner = await Promise.race([validatorExit, webExit]);

  cleanup();

  if (winner === "validator") {
    throw new Error(
      `Local validator exited unexpectedly (${validator.exitCode ?? validator.signalCode ?? "unknown"}).`,
    );
  }

  if (winner === "web") {
    throw new Error(
      `Web app exited unexpectedly (${web.exitCode ?? web.signalCode ?? "unknown"}).`,
    );
  }
} catch (error) {
  cleanup();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
