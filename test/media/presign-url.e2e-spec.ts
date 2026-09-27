import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

const USER_ID = '8f14e45f-ceea-467a-9575-6a9f5b1e1c11';

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

  it('returns a signed PUT URL for a TMP key of the caller', async () => {
    const res = await presign({
      filename: 'rice.PNG',
      extension: 'PNG',
      type: 'IMAGE',
    }).expect(200);

    expect(res.body.key).toMatch(
      new RegExp(`^tmp/${USER_ID}/[0-9a-f-]{36}\\.png$`),
    );
    expect(res.body.headers).toEqual({
      'Content-Type': 'image/png',
      'x-goog-content-length-range': '0,10485760',
    });
    const url = new URL(res.body.presignUrl);
    expect(url.pathname.endsWith(`/${res.body.key}`)).toBe(true);
    expect(url.searchParams.get('X-Goog-Algorithm')).toBe('GOOG4-RSA-SHA256');
    expect(url.searchParams.get('X-Goog-SignedHeaders')).toBe(
      'content-type;host;x-goog-content-length-range',
    );
  });

  it('401 without access token', async () => {
    const res = await presign(
      { filename: 'a.pdf', extension: 'pdf', type: 'FILE' },
      null,
    ).expect(401);
    expect(res.body.code).toBe('AUTH_INVALID_ACCESS_TOKEN');
  });

  it('400 on invalid body', async () => {
    await presign({ filename: '', extension: 'pdf', type: 'DOC' }).expect(400);
    await presign({ extension: 'pdf', type: 'FILE' }).expect(400);
    await presign({
      filename: 'a.pdf',
      extension: 'pdf',
      type: 'FILE',
      extra: 1,
    }).expect(400);
  });

  it('400 MEDIA_INVALID_EXTENSION when extension does not match type', async () => {
    const res = await presign({
      filename: 'clip.png',
      extension: 'png',
      type: 'VIDEO',
    }).expect(400);
    expect(res.body.code).toBe('MEDIA_INVALID_EXTENSION');
  });
});
