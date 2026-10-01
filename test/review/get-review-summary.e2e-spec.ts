import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const product = '00000000-0000-4000-8000-0000000000a1';
const otherProduct = '00000000-0000-4000-8000-0000000000a2';

describe('GET /reviews/summary (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM reviews');
  });

  afterAll(async () => {
    await app.close();
  });

  // Seeded directly: summary only reads the reviews table (create flow is covered in create-review e2e).
  const insertReview = (targetType: string, targetId: string, star: number) =>
    dataSource.query(
      `INSERT INTO reviews (id, user_id, target_type, target_id, content, star, created_at)
       VALUES (gen_random_uuid(), gen_random_uuid(), $1, $2, 'ok', $3, now())`,
      [targetType, targetId, star],
    );

  const summary = (query: Record<string, string>) =>
    request(app.getHttpServer()).get('/reviews/summary').query(query);

  it('summarizes the reviews of one target, without login', async () => {
    for (const star of [5, 5, 4, 1]) {
      await insertReview('PRODUCT', product, star);
    }
    await insertReview('PRODUCT', otherProduct, 3);
    await insertReview('USER', product, 2); // same id, other target type

    const res = await summary({ targetType: 'PRODUCT', targetId: product });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      avgRating: 3.8,
      reviewCount: 4,
      oneStarCount: 1,
      twoStarCount: 0,
      threeStarCount: 0,
      fourStarCount: 1,
      fiveStarCount: 2,
    });
  });

  it('returns all zero for a target without reviews', async () => {
    const res = await summary({ targetType: 'USER', targetId: product });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      avgRating: 0,
      reviewCount: 0,
      oneStarCount: 0,
      twoStarCount: 0,
      threeStarCount: 0,
      fourStarCount: 0,
      fiveStarCount: 0,
    });
  });

  it.each([
    {},
    { targetType: 'PRODUCT' },
    { targetType: 'SHOP', targetId: product },
    { targetType: 'PRODUCT', targetId: 'not-a-uuid' },
  ])('400 for invalid query %j', async (query) => {
    const res = await summary(query as Record<string, string>);
    expect(res.status).toBe(400);
  });
});
