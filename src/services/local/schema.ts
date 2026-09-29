export const localSchema = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS drafts (
  account_id TEXT NOT NULL, draft_id TEXT NOT NULL, payload TEXT NOT NULL,
  updated_at TEXT NOT NULL, PRIMARY KEY(account_id, draft_id)
);
CREATE TABLE IF NOT EXISTS outbox (
  account_id TEXT NOT NULL, operation_id TEXT NOT NULL, payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','needs_attention')),
  result TEXT, created_at TEXT NOT NULL, PRIMARY KEY(account_id, operation_id)
);
PRAGMA user_version = 1;
`;
