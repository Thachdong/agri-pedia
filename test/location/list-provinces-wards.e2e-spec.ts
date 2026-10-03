import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

// Reads the master data seeded by migration (34 provinces, 3321 wards); never modifies it.
describe('GET /provinces, GET /provinces/:provinceCode/wards (e2e)', () => {
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

  it('lists every province in master data order, without login', async () => {
    const res = await http().get('/provinces').expect(200);

    expect(res.body.provinces).toHaveLength(34);
    expect(res.body.provinces.slice(0, 2)).toEqual([
      { codename: 'ha_noi', name: 'Thành phố Hà Nội' },
      { codename: 'cao_bang', name: 'Tỉnh Cao Bằng' },
    ]);
  });

  it('lists the wards of a province in master data order, without login', async () => {
    const res = await http().get('/provinces/ha_noi/wards').expect(200);

    expect(res.body.wards.slice(0, 2)).toEqual([
      { codename: 'phuong_ba_dinh', name: 'Phường Ba Đình' },
      { codename: 'phuong_ngoc_ha', name: 'Phường Ngọc Hà' },
    ]);
    const codenames = res.body.wards.map(
      (ward: { codename: string }) => ward.codename,
    );
    expect(new Set(codenames).size).toBe(codenames.length);
  });

  it('tells apart wards whose names differ only by diacritics', async () => {
    const res = await http().get('/provinces/thai_nguyen/wards').expect(200);

    expect(res.body.wards).toEqual(
      expect.arrayContaining([
        { codename: 'xa_van_lang', name: 'Xã Văn Lang' },
        { codename: 'xa_van_lang_2', name: 'Xã Văn Lăng' },
      ]),
    );
  });

  it('returns 404 LOCATION_PROVINCE_NOT_FOUND for an unknown province', async () => {
    const res = await http().get('/provinces/khong_ton_tai/wards').expect(404);

    expect(res.body.code).toBe('LOCATION_PROVINCE_NOT_FOUND');
  });

  it.each(['Ha-Noi', 'HA_NOI', 'a'.repeat(65)])(
    'rejects malformed province code %s with 400',
    async (code) => {
      await http().get(`/provinces/${code}/wards`).expect(400);
    },
  );
});
