import { MigrationInterface, QueryRunner } from 'typeorm';
import { LOCATION_SEED_ROWS } from './data/location-seed.data';

type TSeed = {
  provinces: { codename: string[]; name: string[]; sortOrder: number[] };
  wards: {
    provinceCodename: string[];
    codename: string[];
    name: string[];
    sortOrder: number[];
  };
};

/**
 * Rows in file order. Some wards share a codename inside one province (names differ
 * only by diacritics, e.g. "Xã Văn Lang" / "Xã Văn Lăng"): every later one gets
 * `_2`, `_3`, ... so (province_codename, codename) stays unique and stable.
 */
const buildSeed = (): TSeed => {
  const seed: TSeed = {
    provinces: { codename: [], name: [], sortOrder: [] },
    wards: { provinceCodename: [], codename: [], name: [], sortOrder: [] },
  };
  const seen = new Map<string, number>();
  LOCATION_SEED_ROWS.forEach((row) => {
    if (row.level === 'PROVINCE') {
      seed.provinces.codename.push(row.codename);
      seed.provinces.name.push(row.name);
      seed.provinces.sortOrder.push(seed.provinces.codename.length);
      return;
    }
    const key = `${row.province}/${row.codename}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    seed.wards.provinceCodename.push(row.province as string);
    seed.wards.codename.push(
      count === 1 ? row.codename : `${row.codename}_${count}`,
    );
    seed.wards.name.push(row.name);
    seed.wards.sortOrder.push(seed.wards.codename.length);
  });
  return seed;
};

/** Vietnam provinces + wards master data (see data/location-seed.data.ts). */
export class LocationSeedProvincesWards1790586011084 implements MigrationInterface {
  name = 'LocationSeedProvincesWards1790586011084';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { provinces, wards } = buildSeed();
    await queryRunner.query(
      `INSERT INTO "provinces" ("codename", "name", "sort_order")
       SELECT * FROM unnest($1::varchar[], $2::varchar[], $3::int[])`,
      [provinces.codename, provinces.name, provinces.sortOrder],
    );
    await queryRunner.query(
      `INSERT INTO "wards" ("province_codename", "codename", "name", "sort_order")
       SELECT * FROM unnest($1::varchar[], $2::varchar[], $3::varchar[], $4::int[])`,
      [wards.provinceCodename, wards.codename, wards.name, wards.sortOrder],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "wards"`);
    await queryRunner.query(`DELETE FROM "provinces"`);
  }
}
