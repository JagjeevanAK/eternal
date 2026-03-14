import { mkdirSync } from "fs";
import path from "path";
import { Database } from "bun:sqlite";
import type { Session, User } from "./domain";

const ROOT_DIR = path.resolve(import.meta.dir, "../../..");
const STORAGE_DIR = path.join(ROOT_DIR, ".eternal-local");
const AUTH_DB_PATH = path.join(STORAGE_DIR, "auth.sqlite");

let authDb: Database | null = null;

interface AuthUserRow {
  id: string;
  role: User["role"];
  full_name: string;
  email: string;
  phone: string;
  city: string;
  managed_wallet_address: string;
  external_wallet_address: string | null;
  kyc_status: User["kycStatus"];
  cash_balance_inr_minor: number;
  otp_code: string | null;
  created_at: string;
}

interface AuthSessionRow {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
}

const ensureStorageDir = () => {
  mkdirSync(STORAGE_DIR, { recursive: true });
};

const getAuthDb = () => {
  if (authDb) {
    return authDb;
  }

  ensureStorageDir();
  authDb = new Database(AUTH_DB_PATH, { create: true });
  authDb.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      managed_wallet_address TEXT NOT NULL,
      external_wallet_address TEXT,
      kyc_status TEXT NOT NULL,
      cash_balance_inr_minor INTEGER NOT NULL,
      otp_code TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
  `);

  return authDb;
};

const toUser = (row: AuthUserRow): User => ({
  id: row.id,
  role: row.role,
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  city: row.city,
  managedWalletAddress: row.managed_wallet_address,
  externalWalletAddress: row.external_wallet_address,
  kycStatus: row.kyc_status,
  cashBalanceInrMinor: Number(row.cash_balance_inr_minor),
  otpCode: row.otp_code ?? undefined,
  createdAt: row.created_at,
});

const toSession = (row: AuthSessionRow): Session => ({
  token: row.token,
  userId: row.user_id,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
});

export const ensureAuthStore = () => {
  getAuthDb();
};

export const loadAuthSnapshot = (): { users: User[]; sessions: Session[] } => {
  const db = getAuthDb();
  const users = db
    .query<AuthUserRow, []>("SELECT * FROM auth_users ORDER BY created_at ASC")
    .all()
    .map(toUser);
  const sessions = db
    .query<AuthSessionRow, []>("SELECT * FROM auth_sessions ORDER BY created_at ASC")
    .all()
    .map(toSession);

  return { users, sessions };
};

export const replaceAuthSnapshot = (users: User[], sessions: Session[]) => {
  const db = getAuthDb();
  const replaceSnapshot = db.transaction((nextUsers: User[], nextSessions: Session[]) => {
    db.exec("DELETE FROM auth_users");
    db.exec("DELETE FROM auth_sessions");

    const insertUser = db.prepare(`
      INSERT INTO auth_users (
        id,
        role,
        full_name,
        email,
        phone,
        city,
        managed_wallet_address,
        external_wallet_address,
        kyc_status,
        cash_balance_inr_minor,
        otp_code,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertSession = db.prepare(`
      INSERT INTO auth_sessions (
        token,
        user_id,
        created_at,
        expires_at
      ) VALUES (?, ?, ?, ?)
    `);

    for (const user of nextUsers) {
      insertUser.run(
        user.id,
        user.role,
        user.fullName,
        user.email,
        user.phone,
        user.city,
        user.managedWalletAddress,
        user.externalWalletAddress,
        user.kycStatus,
        user.cashBalanceInrMinor,
        user.otpCode ?? null,
        user.createdAt,
      );
    }

    for (const session of nextSessions) {
      insertSession.run(session.token, session.userId, session.createdAt, session.expiresAt);
    }
  });

  replaceSnapshot(users, sessions);
};
