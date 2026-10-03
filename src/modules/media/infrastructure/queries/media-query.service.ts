import { Inject, Injectable } from '@nestjs/common';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import { IMediaRepository, MEDIA_REPOSITORY } from '../../application/ports';
import {
  IMediaQueryPort,
  TMediaItem,
  TMediaThumbnail,
  TMediaUrl,
} from '../../contracts';
import { EMediaOwnerType } from '../../domain';

@Injectable()
export class MediaQueryService implements IMediaQueryPort {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: IMediaRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
  ) {}

  async findThumbnails(
    ownerType: 'PRODUCT' | 'USER_AVATAR',
    ownerIds: string[],
  ): Promise<TMediaThumbnail[]> {
    if (ownerIds.length === 0) {
      return [];
    }
    const images = await this.media.findFirstImagesByOwners(
      ownerType as EMediaOwnerType,
      ownerIds,
    );
    return Promise.all(
      images.map(async (image) => ({
        ownerId: image.ownerId,
        url: await this.storage.createDownloadUrl(image.source),
      })),
    );
  }

  async findUrls(
    ownerType: 'USER_LICENSE' | 'USER_AVATAR',
    ownerId: string,
    mediaIds: string[],
  ): Promise<TMediaUrl[]> {
    if (mediaIds.length === 0) {
      return [];
    }
    const items = await this.media.findByOwner(
      ownerType as EMediaOwnerType,
      ownerId,
      mediaIds,
    );
    return Promise.all(
      items.map(async (item) => ({
        mediaId: item.id,
        url: await this.storage.createDownloadUrl(item.source),
      })),
    );
  }

  async listByOwner(
    ownerType: 'PRODUCT',
    ownerId: string,
  ): Promise<TMediaItem[]> {
    const items = await this.media.findAllByOwner(
      ownerType as EMediaOwnerType,
      ownerId,
    );
    return Promise.all(
      items.map(async (item) => ({
        mediaId: item.id,
        type: item.type,
        url: await this.storage.createDownloadUrl(item.source),
      })),
    );
  }
}
