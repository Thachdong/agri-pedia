import { generateKeyPairSync } from 'node:crypto';
import { IConfigService } from '@shared/config';
import { FirebaseFileStorage } from './firebase.storage';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const config = {
  get: () => ({
    firebaseProjectId: 'test-project',
    firebaseClientEmail: 'svc@test-project.iam.gserviceaccount.com',
    firebasePrivateKey: privateKey,
    firebaseStorageBucket: 'test-bucket',
    presignUrlTtlSeconds: 600,
  }),
} as unknown as IConfigService;

describe('FirebaseFileStorage', () => {
  it('signs a V4 PUT URL bound to content type and size range (offline)', async () => {
    const storage = new FirebaseFileStorage(config);

    const result = await storage.createPresignedUploadUrl({
      key: 'tmp/u1/abc.png',
      contentType: 'image/png',
      maxSizeBytes: 10485760,
    });

    const url = new URL(result.url);
    expect(url.pathname).toBe('/test-bucket/tmp/u1/abc.png');
    expect(url.searchParams.get('X-Goog-Algorithm')).toBe('GOOG4-RSA-SHA256');
    expect(url.searchParams.get('X-Goog-Expires')).toBe('600');
    expect(url.searchParams.get('X-Goog-SignedHeaders')).toBe(
      'content-type;host;x-goog-content-length-range',
    );
    expect(result.headers).toEqual({
      'Content-Type': 'image/png',
      'x-goog-content-length-range': '0,10485760',
    });
  });

  it('reuses the named Firebase app across instances', () => {
    expect(() => new FirebaseFileStorage(config)).not.toThrow();
  });
});
