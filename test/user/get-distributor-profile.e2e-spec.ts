import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const address = {
  province: 'can_tho',
  ward: 'phuong_ninh_kieu',
  houseNumber: '12',
  lat: 10.03,
  long: 105.78,
};

describe('GET /distributors/:distributorId (e2e)', () => {
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
    await dataSource.query('DELETE FROM refresh_tokens');
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('DELETE FROM otps');
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  let seq = 0;
  /** Registers the user (DISTRIBUTOR activated unless `pending`); returns its id. */
  const signUp = async (
    role: 'FARMER' | 'DISTRIBUTOR',
    pending = false,
  ): Promise<string> => {
    seq += 1;
    const username = `user${seq}`;
    await http()
      .post('/auth/register')
      .send({
        loginType: 'EMAIL',
        identifier: `${username}@mail.com`,
        password: 'secret123',
        username,
        role,
        bussinessType: role === 'DISTRIBUTOR' ? 'SEEDS_SEEDLINGS' : null,
        bio: 'seed shop',
        address,
      })
      .expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users WHERE username = $1',
      [username],
    );
    if (role === 'DISTRIBUTOR' && !pending) {
      await dataSource.query(
        `UPDATE users SET status = 'ACTIVE' WHERE id = $1`,
        [id],
      );
    }
    return id;
  };

  const getProfile = (distributorId: string) =>
    http().get(`/distributors/${distributorId}`);

  it('200: returns the profile with every address, primary first, without a token', async () => {
    const id = await signUp('DISTRIBUTOR');
    // No endpoint adds a second address yet: insert it directly.
    await dataSource.query(
      `INSERT INTO addresses (id, user_id, province, ward, house_number, lat, long, is_primary)
       VALUES ($1, $2, 'ha_noi', 'phuong_ba_dinh', '5', 21.03, 105.85, false)`,
      [randomUUID(), id],
    );

    const res = await getProfile(id).expect(200);

    expect(res.body).toEqual({
      id,
      username: expect.any(String),
      avatar: null,
      bio: 'seed shop',
      bussinessType: 'SEEDS_SEEDLINGS',
      createdAt: expect.any(String),
      addresses: [
        {
          id: expect.any(String),
          province: 'can_tho',
          ward: 'phuong_ninh_kieu',
          houseNumber: '12',
          lat: 10.03,
          long: 105.78,
          isPrimary: true,
        },
        {
          id: expect.any(String),
          province: 'ha_noi',
          ward: 'phuong_ba_dinh',
          houseNumber: '5',
          lat: 21.03,
          long: 105.85,
          isPrimary: false,
        },
      ],
    });
  });

  it('404: unknown id', async () => {
    const res = await getProfile(randomUUID()).expect(404);

    expect(res.body.code).toBe('USER_DISTRIBUTOR_NOT_FOUND');
  });

  it('404: the user is a farmer', async () => {
    const id = await signUp('FARMER');

    const res = await getProfile(id).expect(404);

    expect(res.body.code).toBe('USER_DISTRIBUTOR_NOT_FOUND');
  });

  it('404: the distributor is not active', async () => {
    const id = await signUp('DISTRIBUTOR', true);

    const res = await getProfile(id).expect(404);

    expect(res.body.code).toBe('USER_DISTRIBUTOR_NOT_FOUND');
  });

  it('400: the id is not a uuid', async () => {
    await getProfile('not-a-uuid').expect(400);
  });
});
