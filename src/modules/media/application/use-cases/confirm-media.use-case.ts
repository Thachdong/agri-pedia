import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { DomainException } from '@shared/domain';
import { ILogger, LOGGER } from '@shared/logger';
import {
  FILE_STORAGE,
  IFileStorage,
  StorageFileNotFoundError,
} from '@shared/storage';
import {
  EMediaOwnerType,
  EMediaType,
  Media,
  MediaExtension,
  TmpMediaKey,
} from '../../domain';
import { IMediaRepository, MEDIA_REPOSITORY } from '../ports/media.repository';

export type TConfirmMediaFile = {
  /** TMP key returned by presign, e.g. `tmp/<uploaderId>/<uuid>.png`. */
  key: string;
  type: EMediaType;
  extension: string;
  filename: string;
  sortOrder?: number;
};

export type TConfirmMediaInput = {
  /** User who uploaded the files to TMP; only their keys are accepted. */
  uploaderId: string;
  ownerType: EMediaOwnerType;
  ownerId: string;
  files: TConfirmMediaFile[];
};

/**
 * Moves uploaded files from TMP to the owner's folder and records them as Media.
 * A file that is invalid (extension, key of another user) or missing in TMP is skipped and logged;
 * the others are still confirmed. Any other storage error is rethrown after the good files are saved.
 */
@Injectable()
export class ConfirmMediaUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: IMediaRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(ConfirmMediaUseCase.name);
  }

  async execute(input: TConfirmMediaInput): Promise<void> {
    const results = await Promise.allSettled(
      input.files.map((file) => this.moveToOwner(input, file)),
    );

    const moved: Media[] = [];
    const failures: unknown[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        moved.push(result.value);
      } else if (
        result.reason instanceof DomainException ||
        result.reason instanceof StorageFileNotFoundError
      ) {
        this.logger.warn('Media file skipped', {
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          index,
          key: input.files[index].key,
          reason: result.reason.message,
        });
      } else {
        failures.push(result.reason);
      }
    });

    await this.unitOfWork.runInTransaction(async () => {
      for (const media of moved) {
        await this.media.save(media);
      }
    });

    if (failures.length > 0) {
      throw failures[0];
    }
  }

  private async moveToOwner(
    input: TConfirmMediaInput,
    file: TConfirmMediaFile,
  ): Promise<Media> {
    const extension = MediaExtension.create(file.type, file.extension);
    const key = TmpMediaKey.create(file.key, input.uploaderId, extension);
    const media = Media.create({
      type: file.type,
      extension,
      filename: file.filename,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      sortOrder: file.sortOrder,
    });
    await this.storage.moveFile(key.value, media.source);
    return media;
  }
}
