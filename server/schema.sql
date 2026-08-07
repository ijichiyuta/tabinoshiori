-- 旅合わせ D1スキーマ
CREATE TABLE IF NOT EXISTS docs (
  slug TEXT PRIMARY KEY,
  doc TEXT NOT NULL,            -- Shiori JSON(memberトークン含む。公開時にAPIで除去)
  admin_key TEXT NOT NULL,      -- 幹事の書き込みキー(サーバー発行UUID)
  updated_at INTEGER NOT NULL
);
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
