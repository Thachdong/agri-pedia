import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

// Reads the KB seeded on app start (51 rice entries); never modifies it.
describe('GET /knowledge/crops, /knowledge/diseases, /knowledge/diseases/:code (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  it('lists enabled crops without login', async () => {
    const res = await http().get('/knowledge/crops').expect(200);

    expect(res.body).toEqual({ crops: [{ code: 'RICE', nameVi: 'Lúa' }] });
  });

  it('lists the diseases of a crop, filtered by category and query', async () => {
    const all = await http().get('/knowledge/diseases?crop=RICE').expect(200);
    expect(all.body.diseases).toHaveLength(51);
    expect(all.body.diseases[0]).toEqual(
      expect.objectContaining({
        code: expect.any(String),
        nameVi: expect.any(String),
        aliases: expect.any(Array),
        affectedParts: expect.any(Array),
      }),
    );

    const pests = await http()
      .get('/knowledge/diseases?crop=RICE&category=PEST')
      .expect(200);
    expect(
      pests.body.diseases.every(
        (d: { category: string }) => d.category === 'PEST',
      ),
    ).toBe(true);

    const search = await http()
      .get('/knowledge/diseases')
      .query({ crop: 'RICE', q: 'dao on' })
      .expect(200);
    expect(search.body.diseases.map((d: { code: string }) => d.code)).toContain(
      'RICE_BLAST',
    );
  });

  it('returns 400 for an invalid category', async () => {
    await http()
      .get('/knowledge/diseases?crop=RICE&category=VIRUS')
      .expect(400);
  });

  it('returns 404 KNOWLEDGE_CROP_NOT_FOUND for an unknown crop', async () => {
    const res = await http().get('/knowledge/diseases?crop=WHEAT').expect(404);

    expect(res.body.code).toBe('KNOWLEDGE_CROP_NOT_FOUND');
  });

  it('returns the Vietnamese detail of a disease', async () => {
    const res = await http().get('/knowledge/diseases/RICE_BLAST').expect(200);

    expect(res.body).toMatchObject({
      code: 'RICE_BLAST',
      nameVi: 'Bệnh đạo ôn',
      category: 'DISEASE',
      kbVersion: '2026-10-12',
    });
    expect(res.body.variants.map((v: { code: string }) => v.code)).toEqual([
      'RICE_BLAST__V1',
      'RICE_BLAST__V2',
      'RICE_BLAST__V3',
    ]);
    expect(res.body.similarDiseases[0]).toEqual(
      expect.objectContaining({
        code: 'RICE_BROWN_SPOT',
        name: expect.any(String),
      }),
    );
    expect(res.body.treatments).toEqual({
      cultural: expect.any(Array),
      biological: expect.any(Array),
      nutrition: expect.any(Array),
    });
  });

  it('returns 404 KNOWLEDGE_DISEASE_NOT_FOUND for an unknown code', async () => {
    const res = await http().get('/knowledge/diseases/NOPE').expect(404);

    expect(res.body.code).toBe('KNOWLEDGE_DISEASE_NOT_FOUND');
  });
});
