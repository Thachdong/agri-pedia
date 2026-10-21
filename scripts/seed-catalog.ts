// Product-suggestion knowledge base: inserts scripts/data/product-catalog/catalog-items.json into product_catalog_items.
// `category` is a category name (ids differ per database), stored as its id; `unit` is an EProductUnit value.
// Items whose normalized name already exists keep their content; only a missing category / unit is filled in.
// Usage: npm run seed:catalog
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CatalogItem, EProductUnit } from '../src/modules/product/domain';
import dataSource from '../src/shared/database/data-source';

const CATALOG_FILE = join(
  __dirname,
  'data',
  'product-catalog',
  'catalog-items.json',
);

type TRawCatalogItem = {
  name: string;
  description: string;
  category?: string;
  unit?: string;
  source: string;
};

const UNITS = Object.values(EProductUnit) as string[];

const main = async (): Promise<void> => {
  const raw: TRawCatalogItem[] = JSON.parse(
    readFileSync(CATALOG_FILE, 'utf-8'),
  );

  await dataSource.initialize();
  const categoryRows: { id: string; name: string }[] = await dataSource.query(
    `SELECT id, name FROM categories`,
  );
  const categoryIds = new Map(categoryRows.map((row) => [row.name, row.id]));

  // Validates every entry (content, category, unit) before writing anything.
  const items = raw.map((entry) => {
    const categoryId =
      entry.category === undefined ? null : categoryIds.get(entry.category);
    if (categoryId === undefined) {
      throw new Error(`${entry.name}: unknown category "${entry.category}"`);
    }
    if (entry.unit !== undefined && !UNITS.includes(entry.unit)) {
      throw new Error(`${entry.name}: unit must be one of ${UNITS.join(', ')}`);
    }
    return CatalogItem.create({
      name: entry.name,
      description: entry.description,
      categoryId,
      unit: (entry.unit as EProductUnit | undefined) ?? null,
    });
  });

  let inserted = 0;
  let filled = 0;
  await dataSource.transaction(async (manager) => {
    for (const item of items) {
      const rows: { inserted: boolean }[] = await manager.query(
        `INSERT INTO product_catalog_items AS item (id, name, normalized_name, description, category_id, unit, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
         ON CONFLICT (normalized_name) DO UPDATE SET
           category_id = COALESCE(item.category_id, EXCLUDED.category_id),
           unit = COALESCE(item.unit, EXCLUDED.unit),
           updated_at = EXCLUDED.updated_at
         WHERE (item.category_id IS NULL AND EXCLUDED.category_id IS NOT NULL)
            OR (item.unit IS NULL AND EXCLUDED.unit IS NOT NULL)
         RETURNING (xmax = 0) AS inserted`,
        [
          item.id,
          item.name,
          item.normalizedName,
          item.description,
          item.categoryId,
          item.unit,
          item.createdAt,
        ],
      );
      if (rows[0]?.inserted) inserted += 1;
      else if (rows[0]) filled += 1;
    }
  });
  console.log(
    `Catalog: ${inserted} inserted, ${filled} filled in, ${items.length - inserted - filled} unchanged`,
  );
  await dataSource.destroy();
};

main().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
