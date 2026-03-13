import { describe, expect, test } from "bun:test";
import type { LocalState, User, VerificationRequest } from "./domain";
import {
  approveVerificationRequest,
  canAccessVerificationAttachment,
  findVerificationAttachment,
  listIssuerVerificationRequests,
  listOwnerVerificationRequests,
  rejectVerificationRequest,
  validateVerificationFiles,
  VerificationError,
} from "./verification";

const makeUser = (id: string, role: User["role"], fullName: string, email: string): User => ({
  id,
  role,
  fullName,
  email,
  phone: "",
  city: "Mumbai",
  managedWalletAddress: `${id}_wallet`,
  externalWalletAddress: null,
  kycStatus: "approved",
  cashBalanceInrMinor: 0,
  createdAt: "2026-03-13T00:00:00.000Z",
});

const makeRequest = (
  overrides: Partial<VerificationRequest> = {},
): VerificationRequest => ({
  id: "verification_1",
  ownerUserId: "user_owner",
  issuerId: "user_issuer",
  assetName: "Whitefield office floor",
  assetCategory: "Commercial real estate",
  ownerNote: "Ownership documents attached.",
  reviewerNote: null,
  status: "pending",
  submittedAt: "2026-03-13T00:00:00.000Z",
  reviewedAt: null,
  reviewerId: null,
  attachments: [
    {
      id: "verification_file_1",
      name: "title-report.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      uploadedAt: "2026-03-13T00:00:00.000Z",
      storagePath: "verification/verification_1/verification_file_1-title-report.pdf",
    },
  ],
  ...overrides,
});

const makeState = (requests: VerificationRequest[] = [makeRequest()]): LocalState => ({
  seededAt: "2026-03-13T00:00:00.000Z",
  platformTreasuryInrMinor: 0,
  config: {
    primaryFeeBps: 100,
    secondaryFeeBps: 50,
  },
  users: [
    makeUser("user_owner", "investor", "Aditi Owner", "owner@eternal.local"),
    makeUser("user_issuer", "issuer", "Meera Issuer", "issuer@eternal.local"),
    makeUser("user_other_issuer", "issuer", "Other Issuer", "other-issuer@eternal.local"),
    makeUser("user_other_investor", "investor", "Other Investor", "other@eternal.local"),
  ],
  sessions: [],
  kycRecords: [],
  properties: [],
  propertyDocuments: [],
  verificationRequests: requests,
  holdings: [],
  orders: [],
  payments: [],
  listings: [],
  trades: [],
  distributions: [],
  notifications: [],
  jobs: [],
});

describe("verification helpers", () => {
  test("accepts supported files and infers pdf mime type from the file name", () => {
    expect(() =>
      validateVerificationFiles([
        {
          name: "title-report.pdf",
          type: "",
          size: 2_048,
        },
      ]),
    ).not.toThrow();
  });

  test("lists owner requests newest first", () => {
    const state = makeState([
      makeRequest({
        id: "verification_old",
        submittedAt: "2026-03-10T00:00:00.000Z",
      }),
      makeRequest({
        id: "verification_new",
        submittedAt: "2026-03-14T00:00:00.000Z",
      }),
    ]);

    const requests = listOwnerVerificationRequests(state, "user_owner");

    expect(requests.map((request) => request.id)).toEqual(["verification_new", "verification_old"]);
    expect(requests[0]?.issuer?.fullName).toBe("Meera Issuer");
  });

  test("scopes issuer queue and aggregates stats", () => {
    const state = makeState([
      makeRequest({ id: "pending_request", status: "pending" }),
      makeRequest({ id: "approved_request", status: "approved" }),
      makeRequest({
        id: "other_issuer_request",
        issuerId: "user_other_issuer",
        status: "rejected",
      }),
    ]);

    const queue = listIssuerVerificationRequests(state, "user_issuer");

    expect(queue.stats).toEqual({
      pending: 1,
      approved: 1,
      rejected: 0,
    });
    expect(queue.requests.map((request) => request.id)).toEqual([
      "pending_request",
      "approved_request",
    ]);
  });

  test("approves a pending request and records reviewer metadata", () => {
    const state = makeState();

    const request = approveVerificationRequest(
      state,
      "verification_1",
      "user_issuer",
      "Ownership pack is complete.",
    );

    expect(request.status).toBe("approved");
    expect(request.reviewerId).toBe("user_issuer");
    expect(request.reviewerNote).toBe("Ownership pack is complete.");
    expect(request.reviewedAt).not.toBeNull();
  });

  test("reject requires a reason", () => {
    const state = makeState();

    expect(() =>
      rejectVerificationRequest(state, "verification_1", "user_issuer", ""),
    ).toThrowError(VerificationError);
  });

  test("finds attachments and restricts access to owner or assigned issuer", () => {
    const state = makeState();
    const match = findVerificationAttachment(state, "verification_file_1");

    expect(match?.attachment.name).toBe("title-report.pdf");
    expect(match ? canAccessVerificationAttachment(match.request, "user_owner") : false).toBe(true);
    expect(match ? canAccessVerificationAttachment(match.request, "user_issuer") : false).toBe(true);
    expect(match ? canAccessVerificationAttachment(match.request, "user_other_investor") : true).toBe(false);
  });
});
