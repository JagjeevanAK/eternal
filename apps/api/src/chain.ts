import { AnchorProvider, BN, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import idl from "../../../programs/asset-tokenization/target/idl/asset_tokenization.json";
import type { AssetTokenization } from "../../../programs/asset-tokenization/target/types/asset_tokenization";
import type { Holding, Listing, LocalState, Order, PropertyProject, Trade, User } from "./domain";
import { meetsMinimumPrimaryInvestment } from "./investment";
import { getAuthorityKeypair, getManagedWallet } from "./wallets";

const COMMITMENT = "confirmed";
const RPC_URL = process.env.ANCHOR_PROVIDER_URL ?? process.env.SOLANA_RPC_URL ?? "http://127.0.0.1:8899";
const PROGRAM_ID = new PublicKey((idl as AssetTokenization).address);
const IS_LOCAL_RPC = /127\.0\.0\.1|localhost/.test(RPC_URL);

const connection = new Connection(RPC_URL, COMMITMENT);

let authorityKeypairCache: Keypair | null = null;

const nowIso = () => new Date().toISOString();

const getAuthority = () => {
  if (!authorityKeypairCache) {
    authorityKeypairCache = getAuthorityKeypair();
  }

  return authorityKeypairCache;
};

const createProgram = (signer: Keypair) =>
  new Program<AssetTokenization>(
    idl as AssetTokenization,
    new AnchorProvider(connection, new Wallet(signer), {
      commitment: COMMITMENT,
      preflightCommitment: COMMITMENT,
    }),
  );

const authorityProgram = () => createProgram(getAuthority());

const enumKey = (value: Record<string, unknown>) => Object.keys(value)[0] ?? "";
const toNumber = (value: BN | bigint | number) =>
  value instanceof BN ? value.toNumber() : typeof value === "bigint" ? Number(value) : value;
const unixToIso = (value: BN | bigint | number | null | undefined) =>
  value == null ? null : new Date(toNumber(value) * 1000).toISOString();
const toLeBuffer = (value: number) => Buffer.from(new BN(value).toArray("le", 8));
const trim = (value: string, max: number) => value.trim().slice(0, max);

const withAirdrop = async (signer: Keypair, minimumLamports = 2 * LAMPORTS_PER_SOL) => {
  if (!IS_LOCAL_RPC) {
    return;
  }

  const balance = await connection.getBalance(signer.publicKey, COMMITMENT);
  if (balance >= minimumLamports) {
    return;
  }

  const signature = await connection.requestAirdrop(
    signer.publicKey,
    Math.max(minimumLamports - balance, LAMPORTS_PER_SOL),
  );
  await connection.confirmTransaction(signature, COMMITMENT);
};

const fetchMaybe = async <T>(
  fetcher: { fetch(address: PublicKey): Promise<T> },
  address: PublicKey,
): Promise<T | null> => {
  try {
    return await fetcher.fetch(address);
  } catch (error) {
    const message = String(error);
    if (
      message.includes("Account does not exist") ||
      message.includes("could not find account") ||
      message.includes("Could not find") ||
      message.includes("does not exist")
    ) {
      return null;
    }

    throw error;
  }
};

const propertyStatusFromChain = (value: Record<string, unknown>): PropertyProject["status"] => {
  const key = enumKey(value);
  if (key === "approved") {
    return "approved";
  }

  if (key === "live") {
    return "live";
  }

  if (key === "closed") {
    return "closed";
  }

  if (key === "rejected") {
    return "rejected";
  }

  return "review";
};

const listingStatusFromChain = (value: Record<string, unknown>): Listing["status"] => {
  const key = enumKey(value);
  if (key === "partiallyFilled") {
    return "partially_filled";
  }

  if (key === "filled") {
    return "filled";
  }

  if (key === "cancelled") {
    return "cancelled";
  }

  return "active";
};

const assetClassToArg = (assetClass: PropertyProject["assetClass"]) =>
  assetClass === "company_share" ? { companyShare: {} } : { realEstate: {} };

const getUser = (state: LocalState, userId: string) => {
  const user = state.users.find((value) => value.id === userId);
  if (!user) {
    throw new Error(`User ${userId} not found in local state.`);
  }

  return user;
};

const getProperty = (state: LocalState, propertyId: string) => {
  const property = state.properties.find((value) => value.id === propertyId);
  if (!property) {
    throw new Error(`Property ${propertyId} not found in local state.`);
  }

  return property;
};

const findUserByManagedWallet = (state: LocalState, address: string) =>
  state.users.find((value) => value.managedWalletAddress === address) ?? null;

const findPropertyByAddress = (state: LocalState, address: string) =>
  state.properties.find((value) => value.onChainPropertyAddress === address) ?? null;

const findListingByAddress = (state: LocalState, address: string) =>
  state.listings.find((value) => value.onChainAddress === address) ?? null;

const findHolding = (state: LocalState, userId: string, propertyId: string) =>
  state.holdings.find((value) => value.userId === userId && value.propertyId === propertyId) ?? null;

const ensureHoldingState = (state: LocalState, userId: string, propertyId: string) => {
  const current = findHolding(state, userId, propertyId);
  if (current) {
    return current;
  }

  const created: Holding = {
    id: `holding_${crypto.randomUUID().slice(0, 8)}`,
    userId,
    propertyId,
    units: 0,
    averagePriceInrMinor: 0,
    investedAmountInrMinor: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    onChainAddress: null,
  };
  state.holdings.push(created);
  return created;
};

const upsertTradeState = (state: LocalState, value: Trade) => {
  const currentIndex = state.trades.findIndex(
    (trade) =>
      (value.onChainAddress && trade.onChainAddress === value.onChainAddress) ||
      trade.id === value.id,
  );

  if (currentIndex === -1) {
    state.trades.unshift(value);
    return value;
  }

  state.trades[currentIndex] = {
    ...state.trades[currentIndex],
    ...value,
  };
  return state.trades[currentIndex];
};

const platformPda = () => PublicKey.findProgramAddressSync([Buffer.from("platform-config")], PROGRAM_ID)[0];

const issuerPda = (issuer: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("issuer"), issuer.toBuffer()], PROGRAM_ID)[0];

const investorPda = (investor: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("investor"), investor.toBuffer()], PROGRAM_ID)[0];

const propertyPda = (issuer: PublicKey, code: string) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("property"), issuer.toBuffer(), Buffer.from(code)],
    PROGRAM_ID,
  )[0];

const offeringPda = (property: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("offering"), property.toBuffer()], PROGRAM_ID)[0];

const holdingPda = (property: PublicKey, investor: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("holding"), property.toBuffer(), investor.toBuffer()],
    PROGRAM_ID,
  )[0];

const listingPda = (property: PublicKey, seller: PublicKey, listingId: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), property.toBuffer(), seller.toBuffer(), toLeBuffer(listingId)],
    PROGRAM_ID,
  )[0];

const tradePda = (listing: PublicKey, tradeId: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("trade"), listing.toBuffer(), toLeBuffer(tradeId)],
    PROGRAM_ID,
  )[0];

const ensurePlatform = async (state: LocalState) => {
  const authority = getAuthority();
  await withAirdrop(authority, 4 * LAMPORTS_PER_SOL);

  const program = authorityProgram();
  const address = platformPda();
  const current = await fetchMaybe(program.account.platformConfig, address);

  if (current) {
    return { address, account: current };
  }

  await program.methods
    .initializePlatform(state.config.primaryFeeBps, state.config.secondaryFeeBps)
    .accountsStrict({
      authority: authority.publicKey,
      platformConfig: address,
      treasury: authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const account = await program.account.platformConfig.fetch(address);
  return { address, account };
};

export const getPlatformTreasuryAddress = async (state: LocalState) => {
  const { account } = await ensurePlatform(state);
  return account.treasury.toBase58();
};

const ensureIssuer = async (state: LocalState, userId: string) => {
  const user = getUser(state, userId);
  const signer = getManagedWallet(user.id);
  await withAirdrop(signer);

  const program = createProgram(signer);
  const platform = platformPda();
  const address = issuerPda(signer.publicKey);

  let account = await fetchMaybe(program.account.issuerProfile, address);
  if (!account) {
    await program.methods
      .registerIssuer(trim(user.fullName, 64), trim(user.city, 32))
      .accountsStrict({
        authority: signer.publicKey,
        platformConfig: platform,
        issuerProfile: address,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
    account = await program.account.issuerProfile.fetch(address);
  }

  if (!account.approved) {
    await authorityProgram()
      .methods.approveIssuer()
      .accountsStrict({
        authority: getAuthority().publicKey,
        platformConfig: platform,
        issuerProfile: address,
      })
      .rpc();
    account = await authorityProgram().account.issuerProfile.fetch(address);
  }

  return { signer, address, account };
};

const investorWalletPreference = (user: User) =>
  new PublicKey(user.externalWalletAddress ?? user.managedWalletAddress);

const investorPanLast4 = (state: LocalState, userId: string) => {
  const record = state.kycRecords.find((value) => value.userId === userId);
  const suffix = record?.panMasked?.slice(-4);
  return suffix && suffix.length === 4 ? suffix : "0000";
};

const ensureInvestor = async (state: LocalState, userId: string) => {
  const user = getUser(state, userId);
  const signer = getManagedWallet(user.id);
  await withAirdrop(signer);

  const program = createProgram(signer);
  const platform = platformPda();
  const address = investorPda(signer.publicKey);
  const preferredWallet = investorWalletPreference(user);

  let account = await fetchMaybe(program.account.investorRegistry, address);
  if (!account) {
    await program.methods
      .registerInvestor(trim(user.fullName, 64), investorPanLast4(state, user.id), preferredWallet)
      .accountsStrict({
        authority: signer.publicKey,
        platformConfig: platform,
        investorRegistry: address,
        systemProgram: SystemProgram.programId,
      })
      .signers([signer])
      .rpc();
    account = await program.account.investorRegistry.fetch(address);
  }

  if (account.wallet.toBase58() !== preferredWallet.toBase58()) {
    await program.methods
      .bindInvestorWallet(preferredWallet)
      .accountsStrict({
        authority: signer.publicKey,
        platformConfig: platform,
        investorRegistry: address,
      })
      .signers([signer])
      .rpc();
    account = await program.account.investorRegistry.fetch(address);
  }

  if (user.kycStatus === "approved" && (!account.allowlisted || enumKey(account.kycStatus) !== "approved")) {
    await authorityProgram()
      .methods.approveInvestor()
      .accountsStrict({
        authority: getAuthority().publicKey,
        platformConfig: platform,
        investorRegistry: address,
      })
      .rpc();
    account = await authorityProgram().account.investorRegistry.fetch(address);
  }

  return { signer, address, account };
};

const syncPropertyFromAccounts = (
  property: PropertyProject,
  propertyAddress: PublicKey,
  offeringAddress: PublicKey,
  propertyAccount: any,
  offeringAccount: any,
) => {
  property.status = propertyStatusFromChain(propertyAccount.status as Record<string, unknown>);
  property.fundedUnits = toNumber(propertyAccount.issuedUnits);
  property.availableUnits = toNumber(offeringAccount.remainingUnits);
  property.totalUnits = toNumber(offeringAccount.totalUnits);
  property.minimumInvestmentInrMinor = toNumber(offeringAccount.minimumInvestmentInrMinor);
  property.unitPriceInrMinor = toNumber(offeringAccount.unitPriceInrMinor);
  property.approvedAt = unixToIso(propertyAccount.approvedAt);
  property.liveAt = unixToIso(propertyAccount.liveAt);
  property.onChainPropertyAddress = propertyAddress.toBase58();
  property.onChainOfferingAddress = offeringAddress.toBase58();
  property.lastChainSyncAt = nowIso();
};

const ensureProperty = async (state: LocalState, property: PropertyProject) => {
  const issuer = await ensureIssuer(state, property.issuerId);
  const platform = platformPda();
  const propertyAddress = propertyPda(issuer.signer.publicKey, property.code);
  const offeringAddress = offeringPda(propertyAddress);

  let propertyAccount = await fetchMaybe(authorityProgram().account.propertyProject, propertyAddress);
  if (!propertyAccount) {
    const signature = await createProgram(issuer.signer)
      .methods.submitAsset(
        property.code,
        assetClassToArg(property.assetClass),
        trim(property.assetType, 32),
        trim(property.symbol, 16),
        trim(property.name, 64),
        trim(property.city, 32),
        trim(property.state, 32),
        trim(property.structureName, 64),
        property.targetYieldBps,
        property.targetIrrBps,
        property.expectedExitMonths,
      )
      .accountsStrict({
        authority: issuer.signer.publicKey,
        platformConfig: platform,
        issuerProfile: issuer.address,
        property: propertyAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([issuer.signer])
      .rpc();

    property.submissionSignature = signature;
    propertyAccount = await authorityProgram().account.propertyProject.fetch(propertyAddress);
  }

  let offeringAccount = await fetchMaybe(authorityProgram().account.offering, offeringAddress);
  if (!offeringAccount) {
    await createProgram(issuer.signer)
      .methods.createOffering(
        new BN(property.minimumInvestmentInrMinor),
        new BN(property.unitPriceInrMinor),
        new BN(property.totalUnits),
      )
      .accountsStrict({
        authority: issuer.signer.publicKey,
        platformConfig: platform,
        issuerProfile: issuer.address,
        property: propertyAddress,
        offering: offeringAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([issuer.signer])
      .rpc();
    offeringAccount = await authorityProgram().account.offering.fetch(offeringAddress);
  }

  const propertyStatus = enumKey(propertyAccount.status as Record<string, unknown>);
  if (
    (property.status === "approved" || property.status === "live" || property.status === "closed") &&
    propertyStatus === "review"
  ) {
    const signature = await authorityProgram()
      .methods.approveAsset()
      .accountsStrict({
        authority: getAuthority().publicKey,
        platformConfig: platform,
        property: propertyAddress,
      })
      .rpc();
    property.approvalSignature = signature;
    propertyAccount = await authorityProgram().account.propertyProject.fetch(propertyAddress);
  }

  const offeringStatus = enumKey(offeringAccount.status as Record<string, unknown>);
  if ((property.status === "live" || property.status === "closed") && offeringStatus === "review") {
    const signature = await authorityProgram()
      .methods.publishOffering()
      .accountsStrict({
        authority: getAuthority().publicKey,
        platformConfig: platform,
        property: propertyAddress,
        offering: offeringAddress,
      })
      .rpc();
    property.publicationSignature = signature;
    propertyAccount = await authorityProgram().account.propertyProject.fetch(propertyAddress);
    offeringAccount = await authorityProgram().account.offering.fetch(offeringAddress);
  }

  if (property.status === "closed" && enumKey(offeringAccount.status as Record<string, unknown>) !== "closed") {
    await authorityProgram()
      .methods.closeOffering()
      .accountsStrict({
        authority: getAuthority().publicKey,
        platformConfig: platform,
        property: propertyAddress,
        offering: offeringAddress,
      })
      .rpc();
    propertyAccount = await authorityProgram().account.propertyProject.fetch(propertyAddress);
    offeringAccount = await authorityProgram().account.offering.fetch(offeringAddress);
  }

  syncPropertyFromAccounts(property, propertyAddress, offeringAddress, propertyAccount, offeringAccount);

  return {
    issuer,
    propertyAddress,
    offeringAddress,
    propertyAccount,
    offeringAccount,
  };
};

const syncHoldingRecord = async (state: LocalState, holding: Holding) => {
  const property = getProperty(state, holding.propertyId);
  const propertyContext = await ensureProperty(state, property);
  const investor = await ensureInvestor(state, holding.userId);
  const address = holdingPda(propertyContext.propertyAddress, investor.signer.publicKey);

  let account = await fetchMaybe(authorityProgram().account.holdingPosition, address);
  const currentUnits = account ? toNumber(account.units) : 0;
  const unitsToAllocate = holding.units - currentUnits;

  if (unitsToAllocate > 0) {
    const unitPriceInrMinor = toNumber(propertyContext.offeringAccount.unitPriceInrMinor);
    const minimumInvestmentInrMinor = toNumber(
      propertyContext.offeringAccount.minimumInvestmentInrMinor,
    );

    if (!meetsMinimumPrimaryInvestment(unitsToAllocate, unitPriceInrMinor, minimumInvestmentInrMinor)) {
      console.warn(
        `[chain] Skipping holding sync for ${holding.id}: ${unitsToAllocate} units is below the minimum primary investment for ${property.slug}.`,
      );
    } else {
      await authorityProgram()
        .methods.allocatePrimary(new BN(unitsToAllocate))
        .accountsStrict({
          authority: getAuthority().publicKey,
          platformConfig: platformPda(),
          investor: investor.signer.publicKey,
          investorRegistry: investor.address,
          property: propertyContext.propertyAddress,
          offering: propertyContext.offeringAddress,
          holding: address,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      account = await authorityProgram().account.holdingPosition.fetch(address);
    }
  }

  if (!account) {
    return;
  }

  holding.units = toNumber(account.units);
  holding.averagePriceInrMinor = toNumber(account.averagePriceInrMinor);
  holding.investedAmountInrMinor = toNumber(account.investedAmountInrMinor);
  holding.updatedAt = nowIso();
  holding.onChainAddress = address.toBase58();

  const propertyAccount = await authorityProgram().account.propertyProject.fetch(propertyContext.propertyAddress);
  const offeringAccount = await authorityProgram().account.offering.fetch(propertyContext.offeringAddress);
  syncPropertyFromAccounts(property, propertyContext.propertyAddress, propertyContext.offeringAddress, propertyAccount, offeringAccount);
};

const nextListingSequence = async () => {
  const platform = await authorityProgram().account.platformConfig.fetch(platformPda());
  return toNumber(platform.listingCount) + 1;
};

const nextTradeSequence = async () => {
  const platform = await authorityProgram().account.platformConfig.fetch(platformPda());
  return toNumber(platform.tradeCount) + 1;
};

const syncListingFromAccount = (
  listing: Listing,
  address: PublicKey,
  account: any,
) => {
  listing.sequenceId = toNumber(account.listingId);
  listing.unitsListed = toNumber(account.unitsListed);
  listing.unitsRemaining = toNumber(account.unitsRemaining);
  listing.pricePerUnitInrMinor = toNumber(account.pricePerUnitInrMinor);
  listing.status = listingStatusFromChain(account.status as Record<string, unknown>);
  listing.updatedAt = nowIso();
  listing.onChainAddress = address.toBase58();
};

const findExistingListingRecord = async (
  propertyAddress: PublicKey,
  sellerAddress: PublicKey,
  listing: Listing,
) => {
  const platform = await authorityProgram().account.platformConfig.fetch(platformPda());
  const listingCount = toNumber(platform.listingCount);

  for (let sequence = 1; sequence <= listingCount; sequence += 1) {
    const address = listingPda(propertyAddress, sellerAddress, sequence);
    const account = await fetchMaybe(authorityProgram().account.secondaryListing, address);
    if (!account) {
      continue;
    }

    const accountStatus = listingStatusFromChain(account.status as Record<string, unknown>);
    const accountUnitsListed = toNumber(account.unitsListed);
    const accountUnitsRemaining = toNumber(account.unitsRemaining);
    const accountPricePerUnit = toNumber(account.pricePerUnitInrMinor);

    if (
      accountStatus === listing.status &&
      accountUnitsListed === listing.unitsListed &&
      accountUnitsRemaining === listing.unitsRemaining &&
      accountPricePerUnit === listing.pricePerUnitInrMinor
    ) {
      return { address, account };
    }
  }

  return null;
};

const syncListingRecord = async (state: LocalState, listing: Listing) => {
  if (listing.status !== "active" && listing.status !== "partially_filled") {
    return;
  }

  const property = getProperty(state, listing.propertyId);
  const seller = await ensureInvestor(state, listing.sellerId);
  const sellerHolding = ensureHoldingState(state, listing.sellerId, listing.propertyId);
  await syncHoldingRecord(state, sellerHolding);
  const propertyContext = await ensureProperty(state, property);

  if (listing.onChainAddress) {
    const currentAddress = new PublicKey(listing.onChainAddress);
    const account = await fetchMaybe(authorityProgram().account.secondaryListing, currentAddress);
    if (account) {
      syncListingFromAccount(listing, currentAddress, account);
      return;
    }
  }

  if (listing.sequenceId != null) {
    const address = listingPda(propertyContext.propertyAddress, seller.signer.publicKey, listing.sequenceId);
    const account = await fetchMaybe(authorityProgram().account.secondaryListing, address);
    if (account) {
      syncListingFromAccount(listing, address, account);
      return;
    }
  }

  const existingListing = await findExistingListingRecord(
    propertyContext.propertyAddress,
    seller.signer.publicKey,
    listing,
  );
  if (existingListing) {
    syncListingFromAccount(listing, existingListing.address, existingListing.account);
    return;
  }

  const sequence = await nextListingSequence();
  const unitsToList = listing.status === "partially_filled" ? listing.unitsRemaining : listing.unitsListed;
  const address = listingPda(propertyContext.propertyAddress, seller.signer.publicKey, sequence);
  const signature = await createProgram(seller.signer)
    .methods.createListing(new BN(sequence), new BN(unitsToList), new BN(listing.pricePerUnitInrMinor))
    .accountsStrict({
      seller: seller.signer.publicKey,
      platformConfig: platformPda(),
      sellerRegistry: seller.address,
      property: propertyContext.propertyAddress,
      offering: propertyContext.offeringAddress,
      sellerHolding: holdingPda(propertyContext.propertyAddress, seller.signer.publicKey),
      listing: address,
      systemProgram: SystemProgram.programId,
    })
    .signers([seller.signer])
    .rpc();

  const account = await authorityProgram().account.secondaryListing.fetch(address);
  listing.creationSignature = signature;
  syncListingFromAccount(listing, address, account);
};

const reconcileHoldings = async (state: LocalState) => {
  for (const property of state.properties) {
    if (!property.onChainPropertyAddress) {
      continue;
    }

    const propertyAddress = new PublicKey(property.onChainPropertyAddress);
    for (const user of state.users.filter((value) => value.role === "investor")) {
      const investor = getManagedWallet(user.id);
      const address = holdingPda(propertyAddress, investor.publicKey);
      const account = await fetchMaybe(authorityProgram().account.holdingPosition, address);
      if (!account || toNumber(account.units) === 0) {
        continue;
      }

      const localHolding = ensureHoldingState(state, user.id, property.id);
      localHolding.units = toNumber(account.units);
      localHolding.averagePriceInrMinor = toNumber(account.averagePriceInrMinor);
      localHolding.investedAmountInrMinor = toNumber(account.investedAmountInrMinor);
      localHolding.updatedAt = nowIso();
      localHolding.onChainAddress = address.toBase58();
    }
  }
};

const reconcileListings = async (state: LocalState) => {
  const listings = await authorityProgram().account.secondaryListing.all();

  for (const record of listings) {
    const property = findPropertyByAddress(state, record.account.property.toBase58());
    const seller = findUserByManagedWallet(state, record.account.seller.toBase58());
    if (!property || !seller) {
      continue;
    }

    const current =
      findListingByAddress(state, record.publicKey.toBase58()) ??
      state.listings.find(
        (value) =>
          value.propertyId === property.id &&
          value.sellerId === seller.id &&
          value.sequenceId === toNumber(record.account.listingId),
      );

    const nextListing =
      current ??
      ({
        id: `listing_${property.slug}_${toNumber(record.account.listingId)}`,
        propertyId: property.id,
        sellerId: seller.id,
        sequenceId: toNumber(record.account.listingId),
        unitsListed: toNumber(record.account.unitsListed),
        unitsRemaining: toNumber(record.account.unitsRemaining),
        pricePerUnitInrMinor: toNumber(record.account.pricePerUnitInrMinor),
        status: listingStatusFromChain(record.account.status as Record<string, unknown>),
        createdAt: unixToIso(record.account.createdAt) ?? nowIso(),
        updatedAt: unixToIso(record.account.updatedAt) ?? nowIso(),
        onChainAddress: record.publicKey.toBase58(),
        creationSignature: null,
        cancelSignature: null,
      } satisfies Listing);

    syncListingFromAccount(nextListing, record.publicKey, record.account);
    nextListing.createdAt = unixToIso(record.account.createdAt) ?? nextListing.createdAt;

    if (!current) {
      state.listings.unshift(nextListing);
    }
  }
};

const reconcileTrades = async (state: LocalState) => {
  const trades = await authorityProgram().account.tradeRecord.all();

  for (const record of trades) {
    const property = findPropertyByAddress(state, record.account.property.toBase58());
    const buyer = findUserByManagedWallet(state, record.account.buyer.toBase58());
    const seller = findUserByManagedWallet(state, record.account.seller.toBase58());
    if (!property || !buyer || !seller) {
      continue;
    }

    const current =
      state.trades.find((value) => value.onChainAddress === record.publicKey.toBase58()) ??
      state.trades.find(
        (value) =>
          value.propertyId === property.id &&
          value.buyerId === buyer.id &&
          value.sellerId === seller.id &&
          value.units === toNumber(record.account.units) &&
          value.totalAmountInrMinor === toNumber(record.account.grossAmountInrMinor),
      );

    const listing = findListingByAddress(state, record.account.listing.toBase58());
    upsertTradeState(state, {
      id: current?.id ?? `trade_${record.publicKey.toBase58().slice(0, 8)}`,
      listingId: listing?.id ?? current?.listingId ?? `listing_${record.account.listing.toBase58().slice(0, 8)}`,
      propertyId: property.id,
      sequenceId: current?.sequenceId ?? null,
      buyerId: buyer.id,
      sellerId: seller.id,
      units: toNumber(record.account.units),
      pricePerUnitInrMinor: toNumber(record.account.pricePerUnitInrMinor),
      totalAmountInrMinor: toNumber(record.account.grossAmountInrMinor),
      status: "settled",
      createdAt: unixToIso(record.account.executedAt) ?? nowIso(),
      settledAt: unixToIso(record.account.executedAt) ?? nowIso(),
      buyerWalletAddress: record.account.buyer.toBase58(),
      sellerWalletAddress: record.account.seller.toBase58(),
      onChainAddress: record.publicKey.toBase58(),
      settlementSignature: current?.settlementSignature ?? null,
    });
  }
};

const reconcileProperties = async (state: LocalState) => {
  for (const property of state.properties) {
    if (!property.onChainPropertyAddress || !property.onChainOfferingAddress) {
      continue;
    }

    const propertyAddress = new PublicKey(property.onChainPropertyAddress);
    const offeringAddress = new PublicKey(property.onChainOfferingAddress);
    const propertyAccount = await fetchMaybe(authorityProgram().account.propertyProject, propertyAddress);
    const offeringAccount = await fetchMaybe(authorityProgram().account.offering, offeringAddress);
    if (!propertyAccount || !offeringAccount) {
      continue;
    }

    syncPropertyFromAccounts(property, propertyAddress, offeringAddress, propertyAccount, offeringAccount);
  }
};

export const syncStateToChain = async (state: LocalState) => {
  await ensurePlatform(state);

  for (const property of [...state.properties].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))) {
    await ensureProperty(state, property);
  }

  for (const holding of [...state.holdings].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))) {
    if (holding.units > 0) {
      await syncHoldingRecord(state, holding);
    }
  }

  for (const listing of [...state.listings].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))) {
    if (listing.status === "active" || listing.status === "partially_filled") {
      await syncListingRecord(state, listing);
    }
  }

  await reconcileProperties(state);
  await reconcileHoldings(state);
  await reconcileListings(state);
  await reconcileTrades(state);
};

export const settlePrimaryOrderOnChain = async (state: LocalState, order: Order) => {
  const property = getProperty(state, order.propertyId);
  await syncStateToChain(state);

  const investor = await ensureInvestor(state, order.buyerId);
  const propertyAddress = new PublicKey(property.onChainPropertyAddress!);
  const offeringAddress = new PublicKey(property.onChainOfferingAddress!);
  const holdingAddress = holdingPda(propertyAddress, investor.signer.publicKey);

  const signature = await authorityProgram()
    .methods.allocatePrimary(new BN(order.units))
    .accountsStrict({
      authority: getAuthority().publicKey,
      platformConfig: platformPda(),
      investor: investor.signer.publicKey,
      investorRegistry: investor.address,
      property: propertyAddress,
      offering: offeringAddress,
      holding: holdingAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const propertyAccount = await authorityProgram().account.propertyProject.fetch(propertyAddress);
  const offeringAccount = await authorityProgram().account.offering.fetch(offeringAddress);
  syncPropertyFromAccounts(property, propertyAddress, offeringAddress, propertyAccount, offeringAccount);

  const localHolding = ensureHoldingState(state, order.buyerId, order.propertyId);
  const holdingAccount = await authorityProgram().account.holdingPosition.fetch(holdingAddress);
  localHolding.units = toNumber(holdingAccount.units);
  localHolding.averagePriceInrMinor = toNumber(holdingAccount.averagePriceInrMinor);
  localHolding.investedAmountInrMinor = toNumber(holdingAccount.investedAmountInrMinor);
  localHolding.updatedAt = nowIso();
  localHolding.onChainAddress = holdingAddress.toBase58();

  order.settlementSignature = signature;
  order.onChainTradeAddress = null;

  return { signature };
};

export const settleSecondaryOrderOnChain = async (state: LocalState, order: Order) => {
  if (!order.listingId || !order.sellerId) {
    throw new Error("Secondary order is missing listing context.");
  }

  await syncStateToChain(state);

  const listing = state.listings.find((value) => value.id === order.listingId);
  if (!listing || listing.sequenceId == null || !listing.onChainAddress) {
    throw new Error("Listing is not synchronized to chain.");
  }

  const property = getProperty(state, order.propertyId);
  const buyer = await ensureInvestor(state, order.buyerId);
  const seller = await ensureInvestor(state, order.sellerId);
  const propertyAddress = new PublicKey(property.onChainPropertyAddress!);
  const offeringAddress = new PublicKey(property.onChainOfferingAddress!);
  const listingAddress = new PublicKey(listing.onChainAddress);
  const buyerHoldingAddress = holdingPda(propertyAddress, buyer.signer.publicKey);
  const sellerHoldingAddress = holdingPda(propertyAddress, seller.signer.publicKey);
  const tradeId = await nextTradeSequence();
  const tradeAddress = tradePda(listingAddress, tradeId);

  const signature = await authorityProgram()
    .methods.fillListing(new BN(tradeId), new BN(order.units))
    .accountsStrict({
      authority: getAuthority().publicKey,
      platformConfig: platformPda(),
      buyer: buyer.signer.publicKey,
      buyerRegistry: buyer.address,
      seller: seller.signer.publicKey,
      sellerRegistry: seller.address,
      property: propertyAddress,
      offering: offeringAddress,
      sellerHolding: sellerHoldingAddress,
      buyerHolding: buyerHoldingAddress,
      listing: listingAddress,
      tradeRecord: tradeAddress,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const listingAccount = await authorityProgram().account.secondaryListing.fetch(listingAddress);
  syncListingFromAccount(listing, listingAddress, listingAccount);

  const buyerHolding = ensureHoldingState(state, order.buyerId, order.propertyId);
  const buyerHoldingAccount = await authorityProgram().account.holdingPosition.fetch(buyerHoldingAddress);
  buyerHolding.units = toNumber(buyerHoldingAccount.units);
  buyerHolding.averagePriceInrMinor = toNumber(buyerHoldingAccount.averagePriceInrMinor);
  buyerHolding.investedAmountInrMinor = toNumber(buyerHoldingAccount.investedAmountInrMinor);
  buyerHolding.updatedAt = nowIso();
  buyerHolding.onChainAddress = buyerHoldingAddress.toBase58();

  const sellerHolding = ensureHoldingState(state, order.sellerId, order.propertyId);
  const sellerHoldingAccount = await authorityProgram().account.holdingPosition.fetch(sellerHoldingAddress);
  sellerHolding.units = toNumber(sellerHoldingAccount.units);
  sellerHolding.averagePriceInrMinor = toNumber(sellerHoldingAccount.averagePriceInrMinor);
  sellerHolding.investedAmountInrMinor = toNumber(sellerHoldingAccount.investedAmountInrMinor);
  sellerHolding.updatedAt = nowIso();
  sellerHolding.onChainAddress = sellerHoldingAddress.toBase58();

  const tradeAccount = await authorityProgram().account.tradeRecord.fetch(tradeAddress);
  const trade: Trade = {
    id: `trade_${tradeAddress.toBase58().slice(0, 8)}`,
    listingId: listing.id,
    propertyId: property.id,
    sequenceId: tradeId,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    units: toNumber(tradeAccount.units),
    pricePerUnitInrMinor: toNumber(tradeAccount.pricePerUnitInrMinor),
    totalAmountInrMinor: toNumber(tradeAccount.grossAmountInrMinor),
    status: "settled",
    createdAt: unixToIso(tradeAccount.executedAt) ?? nowIso(),
    settledAt: unixToIso(tradeAccount.executedAt) ?? nowIso(),
    buyerWalletAddress: buyer.signer.publicKey.toBase58(),
    sellerWalletAddress: seller.signer.publicKey.toBase58(),
    onChainAddress: tradeAddress.toBase58(),
    settlementSignature: signature,
  };
  upsertTradeState(state, trade);

  order.settlementSignature = signature;
  order.onChainTradeAddress = tradeAddress.toBase58();

  return { signature, trade };
};

export const createListingOnChain = async (state: LocalState, listing: Listing) => {
  await syncStateToChain(state);
  await syncListingRecord(state, listing);
  return {
    sequenceId: listing.sequenceId,
    onChainAddress: listing.onChainAddress,
    signature: listing.creationSignature,
  };
};
