import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { FILE_STORAGE, InMemoryFileStorage } from '@shared/storage';
import * as sharp from 'sharp';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import {
  IVisionDiagnosisProvider,
  TDescribeInput,
  TDescribeOutput,
  TVerifyInput,
  TVerifyOutput,
  VISION_DIAGNOSIS_PROVIDER,
} from '../../src/modules/diagnosis/application/ports';
import { EConfidenceLevel } from '../../src/modules/diagnosis/domain';

const address = {
  province: 'can_tho',
  ward: 'phuong_ninh_kieu',
  houseNumber: '12',
  lat: 10.03,
  long: 105.78,
  isPrimary: true,
};

const farmerAccount = (identifier: string) => ({
  loginType: 'EMAIL',
  identifier,
  password: 'secret123',
  role: 'FARMER',
  bussinessType: null,
  address,
});

/** Stub AI: a blast-like lesion on every image; the verify step agrees. */
class StubVision implements IVisionDiagnosisProvider {
  info() {
    return { provider: 'GEMINI', model: 'stub+stub', promptVersion: 'd1+v1' };
  }

  async describe(input: TDescribeInput): Promise<TDescribeOutput> {
    return {
      result: {
        isTargetCrop: 'YES',
        quality: 'GOOD',
        detectedPart: input.plantPart ?? 'UNSURE',
        wholeImage: {
          discoloration: 'NONE',
          plantForm: 'NORMAL',
          panicle: 'NOT_VISIBLE',
          pestsVisible: 'NONE',
        },
        regions: [
          {
            box: { x: 0.3, y: 0.4, w: 0.1, h: 0.1 },
            observations: {
              lesionShape: 'SPINDLE_DIAMOND',
              centerColor: 'GRAY_WHITE',
              borderColor: 'DARK_BROWN',
              margin: 'SHARP',
              halo: 'NONE',
              size: 'MEDIUM_2_10MM',
              distribution: 'SCATTERED',
              position: 'LEAF_BLADE',
              sign: 'NONE',
              deformation: 'NONE',
            },
            descriptionEn: 'spindle lesion',
            descriptionVi: 'vết hình thoi, tâm xám',
          },
        ],
      },
      raw: { stub: 'b1' },
    };
  }

  async verify(input: TVerifyInput): Promise<TVerifyOutput> {
    return {
      regions: input.regions.map((region) => ({
        regionIndex: region.regionIndex,
        verdict: region.candidateCodes[0],
        isLesion: true,
        supportingFeatures: ['vết hình thoi'],
        selfConfidence: EConfidenceLevel.HIGH,
      })),
      raw: { stub: 'b3' },
    };
  }
}

describe('/diagnoses (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let storage: InMemoryFileStorage;
  let png: Buffer;

  beforeAll(async () => {
    storage = new InMemoryFileStorage();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_STORAGE)
      .useValue(storage)
      .overrideProvider(VISION_DIAGNOSIS_PROVIDER)
      .useValue(new StubVision())
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    png = await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 60, g: 150, b: 60 },
      },
    })
      .png()
      .toBuffer();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM diagnosis_images');
    await dataSource.query('DELETE FROM diagnoses');
    await dataSource.query('DELETE FROM media');
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  /** Registers a farmer (ACTIVE on registration); `status` overrides it. */
  const signUp = async (
    identifier: string,
    status = 'ACTIVE',
  ): Promise<string> => {
    await http()
      .post('/auth/register')
      .send(farmerAccount(identifier))
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    await dataSource.query('UPDATE users SET status = $1 WHERE id = $2', [
      status,
      id,
    ]);
    return app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: id });
  };

  const create = (token: string, meta: object | string, files: Buffer[]) => {
    const req = http()
      .post('/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .field('meta', typeof meta === 'string' ? meta : JSON.stringify(meta));
    files.forEach((file, i) => req.attach('images', file, `photo-${i}.png`));
    return req;
  };

  const get = (token: string, id: string) =>
    http().get(`/diagnoses/${id}`).set('Authorization', `Bearer ${token}`);

  const waitDone = async (token: string, id: string) => {
    for (let i = 0; i < 50; i += 1) {
      const res = await get(token, id).expect(200);
      if (res.body.status !== 'PROCESSING') return res;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('diagnosis still processing');
  };

  const meta = (count = 1) => ({
    cropType: 'RICE',
    images: Array.from({ length: count }, () => ({ plantPart: 'LEAF' })),
    note: 'lá có đốm',
  });

  it('accepts images, processes them in the background and returns the result', async () => {
    const token = await signUp('farmer@mail.com');

    const created = await create(token, meta(2), [png, png]).expect(202);
    expect(created.body).toEqual({
      id: expect.any(String),
      status: 'PROCESSING',
    });

    const res = await waitDone(token, created.body.id);
    expect(res.body).toMatchObject({
      id: created.body.id,
      status: 'COMPLETED',
      cropType: 'RICE',
      note: 'lá có đốm',
      summary: {
        hasDisease: true,
        conflict: false,
        diseases: [
          expect.objectContaining({
            diseaseCode: 'RICE_BLAST',
            diseaseName: 'Bệnh đạo ôn',
            imageCount: 2,
          }),
        ],
      },
      userFeedback: null,
      disclaimer: expect.any(String),
    });
    const [first] = res.body.images;
    expect(first).toMatchObject({
      index: 0,
      plantPart: 'LEAF',
      detectedPart: 'LEAF',
      status: 'DISEASED',
      message: null,
      url: expect.stringContaining(`diagnoses/${created.body.id}/`),
    });
    expect(first.regions[0]).toMatchObject({
      box: { x: 0.3, y: 0.4, w: 0.1, h: 0.1 },
      symptom: 'vết hình thoi, tâm xám',
      features: ['vết hình thoi'],
      diagnosis: expect.objectContaining({
        diseaseCode: 'RICE_BLAST',
        variantCode: 'RICE_BLAST__V1',
        variantName: expect.any(String),
      }),
    });
    expect(
      storage.uploaded.get(`diagnoses/${created.body.id}/${first.mediaId}.jpg`)
        ?.contentType,
    ).toBe('image/jpeg');

    const list = await http()
      .get('/diagnoses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body).toEqual({
      diagnoses: [
        expect.objectContaining({
          id: created.body.id,
          status: 'COMPLETED',
          thumbnail: expect.stringContaining('diagnoses/'),
          diseases: [
            expect.objectContaining({
              diseaseCode: 'RICE_BLAST',
              confidenceLevel: expect.any(String),
            }),
          ],
        }),
      ],
      nextCursor: null,
    });

    await http()
      .post(`/diagnoses/${created.body.id}/feedback`)
      .set('Authorization', `Bearer ${token}`)
      .send({ feedback: 'CORRECT', comment: 'đúng' })
      .expect(200);
    expect((await get(token, created.body.id)).body.userFeedback).toBe(
      'CORRECT',
    );
  });

  it('returns 401 without a token', async () => {
    await http().post('/diagnoses').expect(401);
    await http().get('/diagnoses').expect(401);
  });

  it('returns 400 for invalid meta', async () => {
    const token = await signUp('farmer@mail.com');
    await create(token, 'not json', [png]).expect(400);
    await create(token, { cropType: 'RICE', images: [{ plantPart: 'TAIL' }] }, [
      png,
    ]).expect(400);
  });

  it('returns DIAGNOSIS_INVALID_IMAGE for unreadable files and count mismatches', async () => {
    const token = await signUp('farmer@mail.com');

    const unreadable = await create(token, meta(1), [
      Buffer.from('plain text'),
    ]).expect(400);
    expect(unreadable.body.code).toBe('DIAGNOSIS_INVALID_IMAGE');
    expect(unreadable.body.details.images[0].index).toBe(0);

    const mismatch = await create(token, meta(2), [png]).expect(400);
    expect(mismatch.body.code).toBe('DIAGNOSIS_INVALID_IMAGE');
  });

  it('returns DIAGNOSIS_CROP_NOT_SUPPORTED for an unknown crop', async () => {
    const token = await signUp('farmer@mail.com');
    const res = await create(token, { ...meta(1), cropType: 'WHEAT' }, [
      png,
    ]).expect(400);
    expect(res.body.code).toBe('DIAGNOSIS_CROP_NOT_SUPPORTED');
  });

  it('returns DIAGNOSIS_USER_NOT_ALLOWED for an inactive user', async () => {
    const token = await signUp('farmer@mail.com', 'PENDING');
    const res = await create(token, meta(1), [png]).expect(403);
    expect(res.body.code).toBe('DIAGNOSIS_USER_NOT_ALLOWED');
  });

  it("hides other users' diagnoses and rejects feedback before completion", async () => {
    const owner = await signUp('owner@mail.com');
    const other = await signUp('other@mail.com');
    const created = await create(owner, meta(1), [png]).expect(202);

    const hidden = await get(other, created.body.id).expect(404);
    expect(hidden.body.code).toBe('DIAGNOSIS_NOT_FOUND');
    await get(owner, 'not-a-uuid').expect(400);

    await dataSource.query(
      `UPDATE diagnoses SET status = 'FAILED' WHERE id = $1`,
      [created.body.id],
    );
    const res = await http()
      .post(`/diagnoses/${created.body.id}/feedback`)
      .set('Authorization', `Bearer ${owner}`)
      .send({ feedback: 'WRONG' })
      .expect(409);
    expect(res.body.code).toBe('DIAGNOSIS_NOT_COMPLETED');
  });

  it('returns DIAGNOSIS_INVALID_CURSOR for a bad cursor', async () => {
    const token = await signUp('farmer@mail.com');
    const res = await http()
      .get('/diagnoses?cursor=bad')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(res.body.code).toBe('DIAGNOSIS_INVALID_CURSOR');
  });
});
