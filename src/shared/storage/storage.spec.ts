import { generateKeyPairSync } from 'node:crypto';
import { IConfigService } from '@shared/config';
import { FirebaseFileStorage } from './firebase.storage';
import { InMemoryFileStorage } from './in-memory.storage';
import { StorageFileNotFoundError } from './storage.interface';

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
    downloadUrlTtlSeconds: 3600,
    publicBaseUrl: undefined as string | undefined,
  }),
} as unknown as IConfigService;

const configWith = (publicBaseUrl: string): IConfigService =>
  ({
    get: () => ({ ...config.get('storage'), publicBaseUrl }),
  }) as unknown as IConfigService;

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

  it('signs a V4 GET URL for an object with the download TTL (offline)', async () => {
    const storage = new FirebaseFileStorage(config);

    const url = new URL(await storage.createDownloadUrl('products/p1/abc.png'));

    expect(url.pathname).toBe('/test-bucket/products/p1/abc.png');
    expect(url.searchParams.get('X-Goog-Algorithm')).toBe('GOOG4-RSA-SHA256');
    expect(url.searchParams.get('X-Goog-Expires')).toBe('3600');
    expect(url.searchParams.get('X-Goog-SignedHeaders')).toBe('host');
  });

  it('builds an unsigned Firebase media URL for a public object', () => {
    const storage = new FirebaseFileStorage(config);

    expect(
      storage.publicUrl('public/articles/RICE/RICE_BLAST/a.1234abcd.webp'),
    ).toBe(
      'https://firebasestorage.googleapis.com/v0/b/test-bucket/o/public%2Farticles%2FRICE%2FRICE_BLAST%2Fa.1234abcd.webp?alt=media',
    );
  });

  it('uses STORAGE_PUBLIC_BASE_URL for public objects when set', () => {
    const storage = new FirebaseFileStorage(configWith('https://cdn.test/'));

    expect(storage.publicUrl('public/articles/RICE/a.webp')).toBe(
      'https://cdn.test/public/articles/RICE/a.webp',
    );
  });

  it('reuses the named Firebase app across instances', () => {
    expect(() => new FirebaseFileStorage(config)).not.toThrow();
  });
});

describe('InMemoryFileStorage.moveFile', () => {
  it('moves an existing object to the new key', async () => {
    const storage = new InMemoryFileStorage();
    storage.files.add('tmp/u1/a.png');

    await storage.moveFile('tmp/u1/a.png', 'products/p1/a.png');

    expect([...storage.files]).toEqual(['products/p1/a.png']);
  });

  it('throws StorageFileNotFoundError when the source is missing', async () => {
    const storage = new InMemoryFileStorage();

    await expect(
      storage.moveFile('tmp/u1/missing.png', 'products/p1/a.png'),
    ).rejects.toBeInstanceOf(StorageFileNotFoundError);
  });
});

describe('InMemoryFileStorage.deleteFile', () => {
  it('removes an existing object', async () => {
    const storage = new InMemoryFileStorage();
    storage.files.add('products/p1/a.png');

    await storage.deleteFile('products/p1/a.png');

    expect(storage.files.size).toBe(0);
  });

  it('is a no-op when the object is missing', async () => {
    const storage = new InMemoryFileStorage();

    await expect(
      storage.deleteFile('products/p1/missing.png'),
    ).resolves.toBeUndefined();
  });
});

describe('InMemoryFileStorage.uploadFile', () => {
  it('stores the object under the key', async () => {
    const storage = new InMemoryFileStorage();

    await storage.uploadFile(
      'diagnoses/d1/m1.jpg',
      Buffer.from('jpeg'),
      'image/jpeg',
    );

    expect([...storage.files]).toEqual(['diagnoses/d1/m1.jpg']);
    expect(storage.uploaded.get('diagnoses/d1/m1.jpg')?.contentType).toBe(
      'image/jpeg',
    );
  });
});

describe('InMemoryFileStorage.uploadPublicFile', () => {
  it('stores the object as public and serves a fake public URL', async () => {
    const storage = new InMemoryFileStorage();

    await storage.uploadPublicFile(
      'public/articles/RICE/a.webp',
      Buffer.from('webp'),
      'image/webp',
    );

    expect(storage.uploaded.get('public/articles/RICE/a.webp')).toMatchObject({
      contentType: 'image/webp',
      isPublic: true,
    });
    expect(storage.publicUrl('public/articles/RICE/a.webp')).toBe(
      'https://storage.test/public/articles/RICE/a.webp',
    );
  });
});
