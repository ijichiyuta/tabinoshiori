-- 旅合わせ D1スキーマ
CREATE TABLE IF NOT EXISTS docs (
  slug TEXT PRIMARY KEY,
  doc TEXT NOT NULL,            -- Shiori JSON(memberトークン含む。公開時にAPIで除去)
  admin_key TEXT NOT NULL,      -- 幹事の書き込みキー(サーバー発行UUID)
  staff_key TEXT,               -- 点呼スタッフ用キー(PIN照合で発行。docと独立=幹事のpushで消えない)
  updated_at INTEGER NOT NULL
);
-- 既存DBへの移行(migrations/0001-staff-key.sql):
--   ALTER TABLE docs ADD COLUMN staff_key TEXT;
--   UPDATE docs SET staff_key = json_extract(doc, '$.security.staffKey') WHERE staff_key IS NULL;
CREATE TABLE IF NOT EXISTS answers (
  slug TEXT NOT NULL,
  member_id TEXT NOT NULL,
  data TEXT NOT NULL,           -- RsvpAnswer JSON
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (slug, member_id)
);
CREATE TABLE IF NOT EXISTS checkin (
  slug TEXT NOT NULL,
  member_id TEXT NOT NULL,
  checked INTEGER NOT NULL,     -- 0/1
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (slug, member_id)
);
CREATE TABLE IF NOT EXISTS surveys (
  slug TEXT NOT NULL,
  member_id TEXT NOT NULL,
  data TEXT NOT NULL,           -- Survey JSON
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (slug, member_id)
);
CREATE TABLE IF NOT EXISTS billing (
  slug TEXT PRIMARY KEY,
  plan TEXT NOT NULL,           -- free | one | year
  paid_at INTEGER NOT NULL,
  session_id TEXT,              -- Stripe Checkout Session ID
  amount INTEGER                -- 支払額(税込・円)
);
