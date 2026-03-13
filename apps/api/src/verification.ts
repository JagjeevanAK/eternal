import type { LocalState, User, VerificationAttachment, VerificationRequest } from "./domain";

export const VERIFICATION_FILE_MAX_COUNT = 5;
export const VERIFICATION_FILE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const VERIFICATION_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

interface VerificationParty {
  id: string;
  fullName: string;
  email: string;
  city: string;
}

interface VerificationReviewer {
  id: string;
  fullName: string;
}

export interface PublicVerificationAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface PublicVerificationRequest {
  id: string;
  ownerUserId: string;
  issuerId: string;
  assetName: string;
  assetCategory: string | null;
  ownerNote: string | null;
  reviewerNote: string | null;
  status: VerificationRequest["status"];
  submittedAt: string;
  reviewedAt: string | null;
  reviewerId: string | null;
  attachments: PublicVerificationAttachment[];
  owner: VerificationParty | null;
  issuer: VerificationParty | null;
  reviewer: VerificationReviewer | null;
}

export class VerificationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "VerificationError";
    this.status = status;
  }
}

const sortBySubmittedAtDesc = (left: VerificationRequest, right: VerificationRequest) =>
  Date.parse(right.submittedAt) - Date.parse(left.submittedAt);

const toParty = (user: User | undefined): VerificationParty | null =>
  user
    ? {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        city: user.city,
      }
    : null;

const toReviewer = (user: User | undefined): VerificationReviewer | null =>
  user
    ? {
        id: user.id,
        fullName: user.fullName,
      }
    : null;

export const normalizeVerificationText = (value: string | null | undefined, maxLength: number) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
};

export const requireVerificationText = (
  value: string | null | undefined,
  fieldLabel: string,
  maxLength: number,
) => {
  const normalized = normalizeVerificationText(value, maxLength);
  if (!normalized) {
    throw new VerificationError(`${fieldLabel} is required.`, 400);
  }

  return normalized;
};

export const inferVerificationMimeType = (fileName: string, mimeType: string) => {
  if (VERIFICATION_ALLOWED_MIME_TYPES.has(mimeType)) {
    return mimeType;
  }

  const normalizedFileName = fileName.toLowerCase();
  if (normalizedFileName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (normalizedFileName.endsWith(".jpg") || normalizedFileName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (normalizedFileName.endsWith(".png")) {
    return "image/png";
  }

  return mimeType;
};

export const validateVerificationFiles = (
  files: Array<{
    name: string;
    type: string;
    size: number;
  }>,
) => {
  if (files.length === 0) {
    throw new VerificationError("Upload at least one document.", 400);
  }

  if (files.length > VERIFICATION_FILE_MAX_COUNT) {
    throw new VerificationError(
      `Upload no more than ${VERIFICATION_FILE_MAX_COUNT} documents per request.`,
      400,
    );
  }

  files.forEach((file) => {
    const mimeType = inferVerificationMimeType(file.name, file.type);
    if (!VERIFICATION_ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new VerificationError("Only PDF, JPG, and PNG documents are supported.", 400);
    }

    if (file.size <= 0) {
      throw new VerificationError("Uploaded files cannot be empty.", 400);
    }

    if (file.size > VERIFICATION_FILE_MAX_SIZE_BYTES) {
      throw new VerificationError("Each document must be 10 MB or smaller.", 400);
    }
  });
};

export const formatVerificationAttachment = (
  attachment: VerificationAttachment,
): PublicVerificationAttachment => ({
  id: attachment.id,
  name: attachment.name,
  mimeType: attachment.mimeType,
  sizeBytes: attachment.sizeBytes,
  uploadedAt: attachment.uploadedAt,
});

export const formatVerificationRequest = (
  state: LocalState,
  request: VerificationRequest,
): PublicVerificationRequest => {
  const owner = state.users.find((value) => value.id === request.ownerUserId);
  const issuer = state.users.find((value) => value.id === request.issuerId);
  const reviewer = request.reviewerId
    ? state.users.find((value) => value.id === request.reviewerId)
    : undefined;

  return {
    ...request,
    attachments: request.attachments.map(formatVerificationAttachment),
    owner: toParty(owner),
    issuer: toParty(issuer),
    reviewer: toReviewer(reviewer),
  };
};

export const listOwnerVerificationRequests = (state: LocalState, ownerUserId: string) =>
  state.verificationRequests
    .filter((value) => value.ownerUserId === ownerUserId)
    .sort(sortBySubmittedAtDesc)
    .map((value) => formatVerificationRequest(state, value));

export const listIssuerVerificationRequests = (state: LocalState, issuerId: string) => {
  const requests = state.verificationRequests
    .filter((value) => value.issuerId === issuerId)
    .sort(sortBySubmittedAtDesc);

  return {
    stats: {
      pending: requests.filter((value) => value.status === "pending").length,
      approved: requests.filter((value) => value.status === "approved").length,
      rejected: requests.filter((value) => value.status === "rejected").length,
    },
    requests: requests.map((value) => formatVerificationRequest(state, value)),
  };
};

export const listAdminVerificationRequests = (state: LocalState) => {
  const requests = [...state.verificationRequests].sort(sortBySubmittedAtDesc);

  return {
    stats: {
      pending: requests.filter((value) => value.status === "pending").length,
      approved: requests.filter((value) => value.status === "approved").length,
      rejected: requests.filter((value) => value.status === "rejected").length,
    },
    requests: requests.map((value) => formatVerificationRequest(state, value)),
  };
};

const requirePendingVerificationRequest = (state: LocalState, requestId: string) => {
  const request = state.verificationRequests.find((value) => value.id === requestId);
  if (!request) {
    throw new VerificationError("Verification request not found.", 404);
  }

  if (request.status !== "pending") {
    throw new VerificationError("Only pending requests can be reviewed.", 400);
  }

  return request;
};

const requireIssuerOwnedRequest = (
  state: LocalState,
  requestId: string,
  issuerId: string,
) => {
  const request = requirePendingVerificationRequest(state, requestId);

  if (request.issuerId !== issuerId) {
    throw new VerificationError("Issuer access required.", 403);
  }

  return request;
};

export const approveVerificationRequest = (
  state: LocalState,
  requestId: string,
  issuerId: string,
  reviewerNote: string | null | undefined,
) => {
  const request = requireIssuerOwnedRequest(state, requestId, issuerId);

  request.status = "approved";
  request.reviewedAt = new Date().toISOString();
  request.reviewerId = issuerId;
  request.reviewerNote = normalizeVerificationText(reviewerNote, 600);

  return request;
};

export const rejectVerificationRequest = (
  state: LocalState,
  requestId: string,
  issuerId: string,
  reviewerNote: string | null | undefined,
) => {
  const request = requireIssuerOwnedRequest(state, requestId, issuerId);

  request.status = "rejected";
  request.reviewedAt = new Date().toISOString();
  request.reviewerId = issuerId;
  request.reviewerNote = requireVerificationText(reviewerNote, "Rejection reason", 600);

  return request;
};

export const approveVerificationRequestAsAdmin = (
  state: LocalState,
  requestId: string,
  reviewerId: string,
  reviewerNote: string | null | undefined,
) => {
  const request = requirePendingVerificationRequest(state, requestId);

  request.status = "approved";
  request.reviewedAt = new Date().toISOString();
  request.reviewerId = reviewerId;
  request.reviewerNote = normalizeVerificationText(reviewerNote, 600);

  return request;
};

export const rejectVerificationRequestAsAdmin = (
  state: LocalState,
  requestId: string,
  reviewerId: string,
  reviewerNote: string | null | undefined,
) => {
  const request = requirePendingVerificationRequest(state, requestId);

  request.status = "rejected";
  request.reviewedAt = new Date().toISOString();
  request.reviewerId = reviewerId;
  request.reviewerNote = requireVerificationText(reviewerNote, "Rejection reason", 600);

  return request;
};

export const findVerificationAttachment = (state: LocalState, attachmentId: string) => {
  for (const request of state.verificationRequests) {
    const attachment = request.attachments.find((value) => value.id === attachmentId);
    if (attachment) {
      return {
        request,
        attachment,
      };
    }
  }

  return null;
};

export const canAccessVerificationAttachment = (
  request: VerificationRequest,
  userId: string,
  role?: User["role"],
) => role === "admin" || request.ownerUserId === userId || request.issuerId === userId;
