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

export type TReplaceMediaInput = {
  /** User who uploaded the file to TMP; only their keys are accepted. */
  uploaderId: string;
  ownerType: EMediaOwnerType;
  ownerId: string;
  file: {
    /** Id the owner's module already references. */
    mediaId: string;
    /** TMP key returned by presign, e.g. `tmp/<uploaderId>/<uuid>.png`. */
    key: string;
    type: EMediaType;
    extension: string;
    filename: string;
  };
};

/**
 * Makes the given file the owner's only Media: moves it from TMP and records it with the given id,
 * then deletes the owner's other Media rows and, after commit, their storage objects.
 * An invalid file (extension, key of another user) or one missing in TMP is skipped and logged;
 * the old Media is then kept. A storage delete failure is logged (orphaned object).
 */
@Injectable()
export class ReplaceMediaUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: IMediaRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(ReplaceMediaUseCase.name);
  }

  async execute(input: TReplaceMediaInput): Promise<void> {
    let replacement: Media;
    try {
      replacement = await this.moveToOwner(input);
    } catch (error) {
      if (
        error instanceof DomainException ||
        error instanceof StorageFileNotFoundError
      ) {
        this.logger.warn('Media file skipped', {
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          key: input.file.key,
          reason: error.message,
        });
        return;
      }
      throw error;
    }

    const replaced = await this.unitOfWork.runInTransaction(async () => {
      const others = (
        await this.media.findAllByOwner(input.ownerType, input.ownerId)
      ).filter((media) => media.id !== replacement.id);
      if (others.length > 0) {
        await this.media.delete(others.map((media) => media.id));
      }
      await this.media.save(replacement);
      return others;
    });

    await Promise.all(
      replaced.map(async (media) => {
        try {
          await this.storage.deleteFile(media.source);
        } catch (error) {
          this.logger.error('Media file delete failed', error, {
            mediaId: media.id,
            source: media.source,
          });
        }
      }),
    );
  }

  private async moveToOwner(input: TReplaceMediaInput): Promise<Media> {
    const { file } = input;
    const extension = MediaExtension.create(file.type, file.extension);
    const key = TmpMediaKey.create(file.key, input.uploaderId, extension);
    const media = Media.create({
      id: file.mediaId,
      type: file.type,
      extension,
      filename: file.filename,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
    });
    await this.storage.moveFile(key.value, media.source);
    return media;
  }
}
