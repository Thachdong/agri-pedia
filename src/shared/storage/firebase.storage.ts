import { Inject, Injectable } from '@nestjs/common';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import {
  IFileStorage,
  StorageFileNotFoundError,
  TPresignedUpload,
  TPresignedUploadInput,
} from './storage.interface';

const FIREBASE_APP_NAME = 'storage';

/** Firebase Storage (GCS) adapter. Signed URLs are V4 and signed locally with the service account key. */
@Injectable()
export class FirebaseFileStorage implements IFileStorage {
  private readonly app: App;
  private readonly presignUrlTtlSeconds: number;

  constructor(@Inject(CONFIG_SERVICE) config: IConfigService) {
    const storage = config.get('storage');
    this.presignUrlTtlSeconds = storage.presignUrlTtlSeconds;
    // Reuse the named app: several Nest apps in one process (e2e) would otherwise fail on duplicate init.
    this.app =
      getApps().find((app) => app.name === FIREBASE_APP_NAME) ??
      initializeApp(
        {
          credential: cert({
            projectId: storage.firebaseProjectId,
            clientEmail: storage.firebaseClientEmail,
            privateKey: storage.firebasePrivateKey,
          }),
          storageBucket: storage.firebaseStorageBucket,
        },
        FIREBASE_APP_NAME,
      );
  }

  async createPresignedUploadUrl(
    input: TPresignedUploadInput,
  ): Promise<TPresignedUpload> {
    const headers = {
      'Content-Type': input.contentType,
      'x-goog-content-length-range': `0,${input.maxSizeBytes}`,
    };
    const [url] = await getStorage(this.app)
      .bucket()
      .file(input.key)
      .getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + this.presignUrlTtlSeconds * 1000,
        contentType: input.contentType,
        extensionHeaders: {
          'x-goog-content-length-range': headers['x-goog-content-length-range'],
        },
      });
    return { url, headers };
  }

  async moveFile(fromKey: string, toKey: string): Promise<void> {
    try {
      await getStorage(this.app).bucket().file(fromKey).move(toKey);
    } catch (error) {
      if ((error as { code?: unknown }).code === 404) {
        throw new StorageFileNotFoundError(fromKey);
      }
      throw error;
    }
  }
}
