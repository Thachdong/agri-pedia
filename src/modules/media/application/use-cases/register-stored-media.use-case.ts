import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { DomainException } from '@shared/domain';
import { ILogger, LOGGER } from '@shared/logger';
import {
  EMediaOwnerType,
  EMediaType,
  Media,
  MediaExtension,
} from '../../domain';
import { IMediaRepository, MEDIA_REPOSITORY } from '../ports/media.repository';

export type TRegisterStoredMediaFile = {
  /** Id the owner's module chose and used in the key. */
  mediaId: string;
  /** Storage key the file was uploaded to; must be the owner folder key of `mediaId`. */
  key: string;
  type: EMediaType;
  extension: string;
  filename: string;
  sortOrder?: number;
};

export type TRegisterStoredMediaInput = {
  ownerType: EMediaOwnerType;
  ownerId: string;
  files: TRegisterStoredMediaFile[];
};

/**
 * Records as Media files the owner's module already uploaded to their final key (no TMP, no move).
 * Idempotent: media ids already recorded are skipped. A file whose key or extension does not match
 * the owner folder layout is skipped and logged; the others are still recorded.
 */
@Injectable()
export class RegisterStoredMediaUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: IMediaRepository,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(RegisterStoredMediaUseCase.name);
  }

  async execute(input: TRegisterStoredMediaInput): Promise<void> {
    const toSave: Media[] = [];
    input.files.forEach((file, index) => {
      const media = this.toMedia(input, file, index);
      if (media) toSave.push(media);
    });

    await this.unitOfWork.runInTransaction(async () => {
      const existing = new Set(
        (
          await this.media.findByOwner(
            input.ownerType,
            input.ownerId,
            toSave.map((media) => media.id),
          )
        ).map((media) => media.id),
      );
      for (const media of toSave) {
        if (!existing.has(media.id)) await this.media.save(media);
      }
    });
  }

  private toMedia(
    input: TRegisterStoredMediaInput,
    file: TRegisterStoredMediaFile,
    index: number,
  ): Media | null {
    const skip = (reason: string) => {
      this.logger.warn('Stored media file skipped', {
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        index,
        key: file.key,
        reason,
      });
      return null;
    };
    let extension: MediaExtension;
    try {
      extension = MediaExtension.create(file.type, file.extension);
    } catch (error) {
      if (error instanceof DomainException) return skip(error.message);
      throw error;
    }
    const media = Media.create({
      id: file.mediaId,
      type: file.type,
      extension,
      filename: file.filename,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      sortOrder: file.sortOrder,
    });
    if (media.source !== file.key) {
      return skip(`key does not match expected ${media.source}`);
    }
    return media;
  }
}
