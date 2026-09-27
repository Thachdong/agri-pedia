import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

const USER_ID = '8f14e45f-ceea-467a-9575-6a9f5b1e1c11';

const file = (
  extension: string,
  type: string,
  filename = `f.${extension}`,
) => ({
  filename,
  extension,
  type,
});

describe('POST /media/presign-url (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    moduleRef.useLogger(false);
    app = moduleRef.createNestApplication();
    await app.init();
    accessToken = await app
      .get<IAccessTokenService>(ACCESS_TOKEN_SERVICE)
      .sign({ userId: USER_ID });
  });

  afterAll(async () => {
    await app.close();
  });

  const presign = (body: object, token: string | null = accessToken) => {
    const req = request(app.getHttpServer()).post('/media/presign-url');
    if (token !== null) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(body);
  };

  it('returns one signed PUT URL per file, in request order', async () => {
    const res = await presign({
      files: [
        file('PNG', 'IMAGE', 'rice.PNG'),
        file('mov', 'VIDEO'),
        file('pdf', 'FILE'),
      ],
    }).expect(200);

    const items = res.body.items;
    expect(items).toHaveLength(3);
    const exts = ['png', 'mov', 'pdf'];
    const types = ['image/png', 'video/quicktime', 'application/pdf'];
    items.forEach(
      (
        item: { key: string; presignUrl: string; headers: object },
        i: number,
      ) => {
        expect(item.key).toMatch(
          new RegExp(`^tmp/${USER_ID}/[0-9a-f-]{36}\\.${exts[i]}$`),
        );
        expect(item.headers).toEqual({
          'Content-Type': types[i],
          'x-goog-content-length-range': '0,10485760',
        });
        const url = new URL(item.presignUrl);
        expect(url.pathname.endsWith(`/${item.key}`)).toBe(true);
        expect(url.searchParams.get('X-Goog-SignedHeaders')).toBe(
          'content-type;host;x-goog-content-length-range',
        );
      },
    );
  });

  it('401 without access token', async () => {
    const res = await presign({ files: [file('pdf', 'FILE')] }, null).expect(
      401,
    );
    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('400 on invalid body', async () => {
    await presign({ files: [] }).expect(400);
    await presign({
      files: Array.from({ length: 11 }, () => file('png', 'IMAGE')),
    }).expect(400);
    await presign({ files: [file('pdf', 'DOC')] }).expect(400);
    await presign({ files: [{ extension: 'pdf', type: 'FILE' }] }).expect(400);
    await presign(file('pdf', 'FILE')).expect(400);
    await presign({ files: [{ ...file('pdf', 'FILE'), extra: 1 }] }).expect(
      400,
    );
  });

  it('accepts exactly 10 files', async () => {
    const res = await presign({
      files: Array.from({ length: 10 }, () => file('jpg', 'IMAGE')),
    }).expect(200);
    expect(res.body.items).toHaveLength(10);
  });

  it('400 MEDIA_INVALID_EXTENSION listing every invalid file', async () => {
    const res = await presign({
      files: [file('png', 'IMAGE'), file('png', 'VIDEO'), file('gif', 'IMAGE')],
    }).expect(400);
    expect(res.body.code).toBe('MEDIA_INVALID_EXTENSION');
    expect(res.body.details).toEqual({
      files: [
        { index: 1, type: 'VIDEO', extension: 'png', allowed: ['mp4', 'mov'] },
        {
          index: 2,
          type: 'IMAGE',
          extension: 'gif',
          allowed: ['jpg', 'jpeg', 'png', 'webp'],
        },
      ],
    });
    expect(res.body).not.toHaveProperty('items');
  });
});
