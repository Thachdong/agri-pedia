import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { FILE_STORAGE, InMemoryFileStorage } from '@shared/storage';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';

const address = {
  province: 'Can Tho',
  ward: 'Ninh Kieu',
  houseNumber: '12',
  lat: 10.03,
  long: 105.78,
  isPrimary: true,
};

const farmer = {
  loginType: 'EMAIL',
  identifier: 'farmer@mail.com',
  password: 'secret123',
  username: 'Farmer',
  role: 'FARMER',
  bussinessType: null,
  address,
};

const distributor = {
  loginType: 'PHONE',
  identifier: '0912345678',
  password: 'secret123',
  username: 'Seed Shop',
  role: 'DISTRIBUTOR',
  bussinessType: 'SEEDS_SEEDLINGS',
  address,
};

const tmpKey = (userId: string, n: number, ext: string) =>
  `tmp/${userId}/00000000-0000-4000-8000-00000000000${n}.${ext}`;

const avatarFile = (userId: string, n = 1) => ({
  key: tmpKey(userId, n, 'png'),
  type: 'IMAGE',
  extension: 'png',
  filename: 'me.png',
});

describe('PATCH /users/me (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let storage: InMemoryFileStorage;

  beforeAll(async () => {
    storage = new InMemoryFileStorage();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FILE_STORAGE)
      .useValue(storage)
      .compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    storage.files.clear();
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

  /** Registers the user; returns its id and an access token for it. */
  const signUp = async (body: object) => {
    await http().post('/auth/register').send(body).expect(201);
    const [{ id }] = await dataSource.query(
      'SELECT id FROM users ORDER BY created_at DESC LIMIT 1',
    );
    const token = await app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: id });
    return { id: id as string, token };
  };

  const updateMe = (token: string | null, body: object) => {
    const req = http().patch('/users/me');
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(body);
  };

  const mediaOf = (ownerId: string) =>
    dataSource.query(
      'SELECT id, owner_type AS "ownerType", source FROM media WHERE owner_id = $1 ORDER BY owner_type',
      [ownerId],
    );

  it('updates the profile and moves the new avatar to the user folder', async () => {
    const user = await signUp(farmer);
    storage.files.add(tmpKey(user.id, 1, 'png'));

    const res = await updateMe(user.token, {
      username: 'Farmer Two',
      bio: 'rice',
      avatar: avatarFile(user.id),
    }).expect(200);

    expect(res.body).toEqual({
      username: 'Farmer Two',
      avatar: expect.any(String),
      bio: 'rice',
      bussinessLicense: null,
      bussinessType: null,
      updatedAt: expect.any(String),
    });
    const avatarId = res.body.avatar;
    const source = `users/${user.id}/${avatarId}.png`;
    expect(await mediaOf(user.id)).toEqual([
      { id: avatarId, ownerType: 'USER_AVATAR', source },
    ]);
    expect([...storage.files]).toEqual([source]);
    const [row] = await dataSource.query(
      'SELECT username, bio, avatar FROM users WHERE id = $1',
      [user.id],
    );
    expect(row).toEqual({
      username: 'Farmer Two',
      bio: 'rice',
      avatar: avatarId,
    });
  });

  it('replaces the previous avatar (row + storage object)', async () => {
    const user = await signUp(farmer);
    storage.files.add(tmpKey(user.id, 1, 'png'));
    const first = await updateMe(user.token, {
      avatar: avatarFile(user.id, 1),
    }).expect(200);
    storage.files.add(tmpKey(user.id, 2, 'png'));

    const second = await updateMe(user.token, {
      avatar: avatarFile(user.id, 2),
    }).expect(200);

    expect(second.body.avatar).not.toBe(first.body.avatar);
    const source = `users/${user.id}/${second.body.avatar}.png`;
    expect(await mediaOf(user.id)).toEqual([
      { id: second.body.avatar, ownerType: 'USER_AVATAR', source },
    ]);
    expect([...storage.files]).toEqual([source]);
  });

  it('lets a distributor change business type and business license', async () => {
    const user = await signUp(distributor);
    storage.files.add(tmpKey(user.id, 1, 'pdf'));

    const res = await updateMe(user.token, {
      bussinessType: 'AQUACULTURE_SEEDLINGS',
      bussinessLicense: {
        key: tmpKey(user.id, 1, 'pdf'),
        type: 'FILE',
        extension: 'pdf',
        filename: 'license.pdf',
      },
    }).expect(200);

    expect(res.body).toMatchObject({
      username: 'Seed Shop',
      avatar: null,
      bussinessType: 'AQUACULTURE_SEEDLINGS',
      bussinessLicense: expect.any(String),
    });
    expect(await mediaOf(user.id)).toEqual([
      {
        id: res.body.bussinessLicense,
        ownerType: 'USER_LICENSE',
        source: `users/${user.id}/${res.body.bussinessLicense}.pdf`,
      },
    ]);
  });

  it('keeps the avatar when avatar is null or absent', async () => {
    const user = await signUp(farmer);
    storage.files.add(tmpKey(user.id, 1, 'png'));
    const first = await updateMe(user.token, {
      avatar: avatarFile(user.id),
    }).expect(200);

    const res = await updateMe(user.token, {
      avatar: null,
      bio: 'rice',
    }).expect(200);

    expect(res.body.avatar).toBe(first.body.avatar);
    expect(await mediaOf(user.id)).toHaveLength(1);
  });

  it('answers 200 but records no media for a TMP key of another user (skipped + logged)', async () => {
    const user = await signUp(farmer);
    storage.files.add(tmpKey('someone-else', 1, 'png'));

    const res = await updateMe(user.token, {
      avatar: { ...avatarFile(user.id), key: tmpKey('someone-else', 1, 'png') },
    }).expect(200);

    expect(res.body.avatar).toEqual(expect.any(String));
    expect(await mediaOf(user.id)).toEqual([]);
    expect(storage.files.has(tmpKey('someone-else', 1, 'png'))).toBe(true);
  });

  it('returns 400 for a business type sent by a farmer', async () => {
    const user = await signUp(farmer);

    const res = await updateMe(user.token, {
      bussinessType: 'SEEDS_SEEDLINGS',
    }).expect(400);

    expect(res.body.code).toBe('USER_BUSINESS_TYPE_NOT_ALLOWED');
  });

  it('returns 400 for a null business type sent by a distributor', async () => {
    const user = await signUp(distributor);

    const res = await updateMe(user.token, { bussinessType: null }).expect(400);

    expect(res.body.code).toBe('USER_BUSINESS_TYPE_REQUIRED');
  });

  it('returns 404 when the user no longer exists', async () => {
    const user = await signUp(farmer);
    await dataSource.query('DELETE FROM addresses');
    await dataSource.query('DELETE FROM users');

    const res = await updateMe(user.token, { bio: 'x' }).expect(404);

    expect(res.body.code).toBe('USER_NOT_FOUND');
  });

  it('returns 401 without a valid access token', async () => {
    const missing = await updateMe(null, { bio: 'x' }).expect(401);
    expect(missing.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
    await updateMe('garbage', { bio: 'x' }).expect(401);
  });

  it('returns 400 for an invalid body', async () => {
    const user = await signUp(farmer);

    await updateMe(user.token, { username: '' }).expect(400);
    await updateMe(user.token, {
      avatar: { ...avatarFile(user.id), type: 'FILE' },
    }).expect(400);
    await updateMe(user.token, {
      bussinessLicense: { ...avatarFile(user.id), type: 'VIDEO' },
    }).expect(400);
    await updateMe(user.token, { avatar: { key: 'x' } }).expect(400);
    await updateMe(user.token, { role: 'DISTRIBUTOR' }).expect(400);
  });
});
