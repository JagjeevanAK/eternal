export { };

const ROOT_DIR = process.cwd();
const PROGRAM_DIR = `${ROOT_DIR}/programs/asset-tokenization`;
const LOCAL_RPC_URL = "http://127.0.0.1:8899";
const API_URL = "http://127.0.0.1:4000";
const EXCHANGE_URL = "http://localhost:3000";
const ISSUANCE_URL = "http://localhost:3001";
const ADMIN_URL = "http://localhost:3002";
const POLL_INTERVAL_MS = 500;
const RPC_TIMEOUT_MS = 60_000;
const API_TIMEOUT_MS = 20_000;
const APP_TIMEOUT_MS = 60_000;

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

const httpIsReady = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url);
    return response.ok;
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

const waitForHttp = async (
  url: string,
  timeoutMs: number,
  dependency: ReturnType<typeof Bun.spawn>,
  label: string,
): Promise<void> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await httpIsReady(url)) {
      return;
    }

    if (dependency.exitCode !== null) {
      throw new Error(
        `${label} exited before becoming ready (${dependency.exitCode ?? dependency.signalCode ?? "unknown"}).`,
      );
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}`);
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
let api: ReturnType<typeof Bun.spawn> | null = null;
let worker: ReturnType<typeof Bun.spawn> | null = null;
let exchange: ReturnType<typeof Bun.spawn> | null = null;
let issuance: ReturnType<typeof Bun.spawn> | null = null;
let admin: ReturnType<typeof Bun.spawn> | null = null;

const cleanup = () => {
  stopProcess(admin);
  stopProcess(issuance);
  stopProcess(exchange);
  stopProcess(worker);
  stopProcess(api);
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
  console.log(`Starting local API at ${API_URL}...`);
  api = spawnLongRunning([bunBin, "run", "dev:api"], ROOT_DIR);
  await waitForHttp(`${API_URL}/health`, API_TIMEOUT_MS, api, "Local API");

  console.log("Starting local worker...");
  worker = spawnLongRunning([bunBin, "run", "dev:worker"], ROOT_DIR);

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
  await sleep(3000);
  await runCommand([bunBin, "run", "init:local"], PROGRAM_DIR);

  console.log("Seeding local demo data...");
  await runCommand([bunBin, "run", "seed:demo"], ROOT_DIR);

  await optionalAirdrop();

  console.log(`Starting exchange app at ${EXCHANGE_URL}...`);
  exchange = spawnLongRunning([bunBin, "run", "dev:web:local"], ROOT_DIR);
  await waitForHttp(EXCHANGE_URL, APP_TIMEOUT_MS, exchange, "Exchange app");

  console.log(`Starting issuance portal at ${ISSUANCE_URL}...`);
  issuance = spawnLongRunning([bunBin, "run", "dev:issuance"], ROOT_DIR);
  await waitForHttp(ISSUANCE_URL, APP_TIMEOUT_MS, issuance, "Issuance portal");

  console.log(`Starting admin portal at ${ADMIN_URL}...`);
  admin = spawnLongRunning([bunBin, "run", "dev:admin"], ROOT_DIR);
  await waitForHttp(ADMIN_URL, APP_TIMEOUT_MS, admin, "Admin portal");

  console.log("Local demo is ready.");
  console.log(`Exchange UI: ${EXCHANGE_URL}`);
  console.log(`Issuance Portal: ${ISSUANCE_URL}`);
  console.log(`Admin Portal: ${ADMIN_URL}`);
  console.log(`API: ${API_URL}`);
  console.log(`RPC: ${LOCAL_RPC_URL}`);
  console.log("Use Phantom on localnet for the easiest browser-wallet flow.");

  const validatorExit =
    validator !== null
      ? validator.exited.then(() => "validator" as const)
      : new Promise<"validator">(() => { });
  const apiExit = api.exited.then(() => "api" as const);
  const workerExit = worker.exited.then(() => "worker" as const);
  const exchangeExit = exchange.exited.then(() => "exchange" as const);
  const issuanceExit = issuance.exited.then(() => "issuance" as const);
  const adminExit = admin.exited.then(() => "admin" as const);
  const winner = await Promise.race([validatorExit, apiExit, workerExit, exchangeExit, issuanceExit, adminExit]);

  cleanup();

  if (winner === "validator") {
    throw new Error(
      `Local validator exited unexpectedly (${validator?.exitCode ?? validator?.signalCode ?? "unknown"}).`,
    );
  }

  if (winner === "api") {
    throw new Error(
      `Local API exited unexpectedly (${api.exitCode ?? api.signalCode ?? "unknown"}).`,
    );
  }

  if (winner === "worker") {
    throw new Error(
      `Local worker exited unexpectedly (${worker.exitCode ?? worker.signalCode ?? "unknown"}).`,
    );
  }

  if (winner === "exchange") {
    throw new Error(
      `Exchange app exited unexpectedly (${exchange.exitCode ?? exchange.signalCode ?? "unknown"}).`,
    );
  }

  if (winner === "issuance") {
    throw new Error(
      `Issuance portal exited unexpectedly (${issuance.exitCode ?? issuance.signalCode ?? "unknown"}).`,
    );
  }

  if (winner === "admin") {
    throw new Error(
      `Admin portal exited unexpectedly (${admin.exitCode ?? admin.signalCode ?? "unknown"}).`,
    );
  }
} catch (error) {
  cleanup();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
