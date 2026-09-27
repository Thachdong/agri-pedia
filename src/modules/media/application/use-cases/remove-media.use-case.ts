import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ILogger, LOGGER } from '@shared/logger';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import { EMediaOwnerType } from '../../domain';
import { IMediaRepository, MEDIA_REPOSITORY } from '../ports/media.repository';

export type TRemoveMediaInput = {
  ownerType: EMediaOwnerType;
  ownerId: string;
  mediaIds: string[];
};

/**
 * Deletes the owner's Media rows, then their storage objects after commit.
 * Ids of other owners or unknown ids are ignored. A storage delete failure is logged
 * (the object is left orphaned) and does not fail the use case.
 */
@Injectable()
export class RemoveMediaUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: IMediaRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(RemoveMediaUseCase.name);
  }

  async execute(input: TRemoveMediaInput): Promise<void> {
    if (input.mediaIds.length === 0) {
      return;
    }

    const removed = await this.unitOfWork.runInTransaction(async () => {
      const owned = await this.media.findByOwner(
        input.ownerType,
        input.ownerId,
        input.mediaIds,
      );
      if (owned.length > 0) {
        await this.media.delete(owned.map((media) => media.id));
      }
      return owned;
    });

    await Promise.all(
      removed.map(async (media) => {
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
}
