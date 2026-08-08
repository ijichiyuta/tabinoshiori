-- staffKeyをdoc JSONからdocs.staff_keyカラムに分離
-- (doc内保存だと幹事が文書をpushした際にstaffKeyが消える競合があった)
-- 適用: npx wrangler d1 execute tabiawase --file migrations/0001-staff-key.sql [--local|--remote]
ALTER TABLE docs ADD COLUMN staff_key TEXT;
UPDATE docs SET staff_key = json_extract(doc, '$.security.staffKey') WHERE staff_key IS NULL;
