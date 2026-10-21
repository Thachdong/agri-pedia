// Product-suggestion knowledge base: inserts scripts/data/product-catalog/catalog-items.json into product_catalog_items.
// Items whose normalized name already exists are skipped, so admin edits are kept.
// Usage: npm run seed:catalog
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CatalogItem } from '../src/modules/product/domain';
import dataSource from '../src/shared/database/data-source';

const CATALOG_FILE = join(
  __dirname,
  'data',
  'product-catalog',
  'catalog-items.json',
);

type TRawCatalogItem = { name: string; description: string; source: string };

const main = async (): Promise<void> => {
  const raw: TRawCatalogItem[] = JSON.parse(
    readFileSync(CATALOG_FILE, 'utf-8'),
  );
  // Validates name/description and computes the normalized name before touching the DB.
  const items = raw.map((entry) =>
    CatalogItem.create({ name: entry.name, description: entry.description }),
  );

  await dataSource.initialize();
  let inserted = 0;
  await dataSource.transaction(async (manager) => {
    for (const item of items) {
      const rows: unknown[] = await manager.query(
        `INSERT INTO product_catalog_items (id, name, normalized_name, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (normalized_name) DO NOTHING
         RETURNING id`,
        [
          item.id,
          item.name,
          item.normalizedName,
          item.description,
          item.createdAt,
        ],
      );
      inserted += rows.length;
    }
  });
  console.log(
    `Catalog: ${inserted} inserted, ${items.length - inserted} already present`,
  );
  await dataSource.destroy();
};

main().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
