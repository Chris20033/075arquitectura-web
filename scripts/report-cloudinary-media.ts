import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import pg from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const columns = await client.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'project_images'
        AND column_name = 'cloudinary_asset_id'
    ) AS exists
  `);
    if (!columns.rows[0]?.exists) {
      console.info(
        "Legacy Cloudinary columns are no longer present; no report was created.",
      );
      process.exitCode = 0;
    } else {
      const projects = await client.query(`
      SELECT p.id AS project_id, p.name AS project_name, p.slug,
             i.cloudinary_asset_id, i.cloudinary_public_id,
             i.position, i.is_cover
      FROM project_images i
      JOIN projects p ON p.id = i.project_id
      WHERE i.cloudinary_public_id NOT LIKE '075arquitectura/demo/%'
      ORDER BY p.name, i.position
    `);
      const hero = await client.query(`
      SELECT cloudinary_asset_id, cloudinary_public_id
      FROM site_hero_images
    `);
      const root = resolve(
        process.env.UPLOADS_ROOT || join(process.cwd(), "uploads"),
      );
      await mkdir(root, { recursive: true });
      const target = join(root, "legacy-cloudinary-report.json");
      await writeFile(
        target,
        JSON.stringify(
          {
            createdAt: new Date().toISOString(),
            projectImages: projects.rows,
            heroImages: hero.rows,
          },
          null,
          2,
        ),
        "utf8",
      );
      console.info(
        `Legacy media report created with ${projects.rowCount ?? 0} project images and ${hero.rowCount ?? 0} hero images.`,
      );
    }
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Could not create the legacy media report.",
  );
  process.exitCode = 1;
});
