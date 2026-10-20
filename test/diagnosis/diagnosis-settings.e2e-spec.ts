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
import { CreateAdminUseCase } from '../../src/modules/user/application/use-cases';
import { ELoginType } from '../../src/modules/user/domain';

const USERNAMES = `('e2e-settings-admin', 'e2e-settings-farmer')`;

const settings = {
  dailyFreeLimit: 5,
  defaultCropType: 'RICE',
  maxImages: 2,
  maxImageBytes: 1048576,
  maxImageWidth: 800,
  maxImageHeight: 600,
};

describe('diagnosis settings (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let farmerToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(FILE_STORAGE)
      .useValue(new InMemoryFileStorage())
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    await deleteUsers();
    const { userId: adminId } = await app.get(CreateAdminUseCase).execute({
      loginType: ELoginType.EMAIL,
      identifier: 'e2e-settings-admin@agripedia.test',
      password: 'secret123',
      username: 'e2e-settings-admin',
    });
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: 'e2e-settings-farmer@agripedia.test',
        password: 'secret123',
        username: 'e2e-settings-farmer',
        role: 'FARMER',
        bussinessType: null,
        address: {
          province: 'can_tho',
          ward: 'phuong_ninh_kieu',
          houseNumber: '12',
          lat: 10.03,
          long: 105.78,
        },
      })
      .expect(201);
    const [{ id: farmerId }] = await dataSource.query(
      `SELECT id FROM users WHERE username = 'e2e-settings-farmer'`,
    );
    const tokens = app.get<IAccessTokenService>(ACCESS_TOKEN_SERVICE);
    adminToken = await tokens.sign({ userId: adminId });
    farmerToken = await tokens.sign({ userId: farmerId });
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM diagnosis_settings');
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM diagnosis_settings');
    await deleteUsers();
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const as = (token: string, req: request.Test) =>
    req.set('Authorization', `Bearer ${token}`);

  async function deleteUsers() {
    const users = `SELECT id FROM users WHERE username IN ${USERNAMES}`;
    await dataSource.query(`DELETE FROM diagnoses WHERE user_id IN (${users})`);
    await dataSource.query(`DELETE FROM addresses WHERE user_id IN (${users})`);
    await dataSource.query(`DELETE FROM users WHERE username IN ${USERNAMES}`);
  }

  it('returns the defaults, then the saved settings', async () => {
    const defaults = await as(
      adminToken,
      http().get('/admin/diagnosis/settings'),
    ).expect(200);
    expect(defaults.body).toEqual({
      dailyFreeLimit: 3,
      defaultCropType: null,
      maxImages: 5,
      maxImageBytes: 5242880,
      maxImageWidth: 4096,
      maxImageHeight: 4096,
    });

    const saved = await as(
      adminToken,
      http().put('/admin/diagnosis/settings').send(settings),
    ).expect(200);
    expect(saved.body).toEqual(settings);
    await as(adminToken, http().get('/admin/diagnosis/settings'))
      .expect(200)
      .expect(settings);
  });

  it('gives the form settings to anyone, with the diagnoses left today for a signed-in user', async () => {
    await as(
      adminToken,
      http().put('/admin/diagnosis/settings').send(settings),
    ).expect(200);
    const form = {
      defaultCropType: 'RICE',
      minImages: 1,
      maxImages: 2,
      maxImageBytes: 1048576,
      maxImageWidth: 800,
      maxImageHeight: 600,
    };

    const guest = await http().get('/diagnoses/settings').expect(200);
    expect(guest.body).toEqual({ ...form, remainingToday: null });

    await dataSource.query(
      `INSERT INTO diagnoses (id, user_id, crop_type, status, provider, model, prompt_version, kb_version, created_at)
       SELECT gen_random_uuid(), users.id, 'RICE', 'COMPLETED', 'GEMINI', 'm', 'p', 'k', t.at
       FROM users, (VALUES (now()), (now() - interval '2 days')) AS t(at)
       WHERE username = 'e2e-settings-farmer'`,
    );
    const farmer = await as(
      farmerToken,
      http().get('/diagnoses/settings'),
    ).expect(200);
    expect(farmer.body).toEqual({ ...form, remainingToday: 4 });
  });

  it('rejects images over the pixel limit by index', async () => {
    await as(
      adminToken,
      http().put('/admin/diagnosis/settings').send(settings),
    ).expect(200);
    const photo = (width: number, height: number) =>
      sharp({
        create: { width, height, channels: 3, background: '#3a5' },
      })
        .png()
        .toBuffer();

    const res = await as(farmerToken, http().post('/diagnoses'))
      .field(
        'meta',
        JSON.stringify({
          cropType: 'RICE',
          images: [{ plantPart: 'LEAF' }, { plantPart: 'LEAF' }],
        }),
      )
      .attach('images', await photo(800, 600), 'a.png')
      .attach('images', await photo(900, 600), 'b.png')
      .expect(400);
    expect(res.body.code).toBe('DIAGNOSIS_INVALID_IMAGE');
    expect(res.body.details.images).toEqual([
      { index: 1, reason: '900x600 px is larger than 800x600 px' },
    ]);
  });

  it('returns 403 DIAGNOSIS_ADMIN_REQUIRED for a non-admin', async () => {
    const res = await as(
      farmerToken,
      http().put('/admin/diagnosis/settings').send(settings),
    ).expect(403);
    expect(res.body.code).toBe('DIAGNOSIS_ADMIN_REQUIRED');
    await as(farmerToken, http().get('/admin/diagnosis/settings')).expect(403);
  });

  it('returns 400 for a missing field, a setting out of range or an unknown crop', async () => {
    const missing: Partial<typeof settings> = { ...settings };
    delete missing.maxImages;
    await as(
      adminToken,
      http().put('/admin/diagnosis/settings').send(missing),
    ).expect(400);

    const range = await as(
      adminToken,
      http()
        .put('/admin/diagnosis/settings')
        .send({ ...settings, maxImages: 11 }),
    ).expect(400);
    expect(range.body.code).toBe('DIAGNOSIS_INVALID_SETTINGS');
    expect(range.body.details.field).toBe('maxImages');

    const crop = await as(
      adminToken,
      http()
        .put('/admin/diagnosis/settings')
        .send({ ...settings, defaultCropType: 'NO_SUCH_CROP' }),
    ).expect(400);
    expect(crop.body.code).toBe('DIAGNOSIS_CROP_NOT_SUPPORTED');
  });

  it('returns 401 without a token', async () => {
    await http().get('/admin/diagnosis/settings').expect(401);
  });
});
