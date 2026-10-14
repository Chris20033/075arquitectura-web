INSERT INTO "site_profiles" ("singleton_key", "professional_name")
VALUES ('default', '')
ON CONFLICT ("singleton_key") DO NOTHING;