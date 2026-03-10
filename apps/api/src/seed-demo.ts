import { syncStateToChain } from "./chain";
import { listDemoUsers, readState, resetState, writeState } from "./state";

const main = async () => {
  resetState();

  const state = readState();
  await syncStateToChain(state);
  writeState(state);

  const liveAssets = state.properties.filter((value) => value.status === "live").length;
  const reviewAssets = state.properties.filter((value) => value.status === "review").length;
  const activeListings = state.listings.filter(
    (value) => value.status === "active" || value.status === "partially_filled",
  ).length;
  const pendingPayments = state.payments.filter((value) => value.status === "pending").length;

  console.log("Demo seed applied.");
  console.log(`Users: ${state.users.length}`);
  console.log(`Live assets: ${liveAssets}`);
  console.log(`Assets in review: ${reviewAssets}`);
  console.log(`Active listings: ${activeListings}`);
  console.log(`Pending payments: ${pendingPayments}`);
  console.log("");
  console.log("Demo accounts:");

  for (const user of listDemoUsers(state)) {
    console.log(`- ${user.identifier} (${user.role}, KYC: ${user.kycStatus})`);
  }
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
