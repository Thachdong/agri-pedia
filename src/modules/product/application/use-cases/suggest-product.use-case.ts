import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { ILogger, LOGGER } from '@shared/logger';
import {
  EProductSuggestionStatus,
  normalizeProductName,
  ProductSellerNotAllowedException,
  ProductSuggestionMiss,
  ProductSuggestionUsage,
  SuggestionImageInvalidException,
} from '../../domain';
import {
  CATALOG_REPOSITORY,
  ICatalogRepository,
} from '../ports/catalog.repository';
import {
  IProductNameReader,
  PRODUCT_NAME_READER,
  ProductPhotoUnreadableError,
  TProductPhoto,
} from '../ports/product-name-reader';
import {
  IProductSuggestionMissRepository,
  PRODUCT_SUGGESTION_MISS_REPOSITORY,
} from '../ports/product-suggestion-miss.repository';
import {
  IProductSuggestionSettingsRepository,
  PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
} from '../ports/product-suggestion-settings.repository';
import {
  IProductSuggestionUsageRepository,
  PRODUCT_SUGGESTION_USAGE_REPOSITORY,
} from '../ports/product-suggestion-usage.repository';

export const SUGGESTION_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const SUGGESTION_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type TSuggestProductInput = {
  userId: string;
  photo: TProductPhoto;
};

/** `remaining`: suggestions left in the visible quota after this one. */
export type TSuggestProductOutput =
  | { status: EProductSuggestionStatus.UNREADABLE; remaining: number }
  | {
      status: EProductSuggestionStatus.NOT_FOUND;
      detectedName: string;
      remaining: number;
    }
  | {
      status: EProductSuggestionStatus.FOUND;
      suggestion: { name: string; description: string };
      remaining: number;
    };

/**
 * Reads the product name from a distributor photo and suggests the matching catalog item.
 * Reserves one suggestion before reading; gives it back when reading fails, moves it to the
 * not-found bonus when the name is not in the catalog (and logs the miss).
 */
@Injectable()
export class SuggestProductUseCase {
  private readonly logger: ILogger;

  constructor(
    @Inject(PRODUCT_NAME_READER) private readonly reader: IProductNameReader,
    @Inject(CATALOG_REPOSITORY) private readonly catalog: ICatalogRepository,
    @Inject(PRODUCT_SUGGESTION_SETTINGS_REPOSITORY)
    private readonly settingsRepository: IProductSuggestionSettingsRepository,
    @Inject(PRODUCT_SUGGESTION_USAGE_REPOSITORY)
    private readonly usages: IProductSuggestionUsageRepository,
    @Inject(PRODUCT_SUGGESTION_MISS_REPOSITORY)
    private readonly misses: IProductSuggestionMissRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
    @Inject(LOGGER) logger: ILogger,
  ) {
    this.logger = logger.withContext(SuggestProductUseCase.name);
  }

  async execute(input: TSuggestProductInput): Promise<TSuggestProductOutput> {
    const seller = await this.userQuery.findRoleById(input.userId);
    if (!seller || seller.role !== 'DISTRIBUTOR' || !seller.isActive) {
      throw new ProductSellerNotAllowedException(input.userId);
    }
    this.assertValidPhoto(input.photo);

    const settings = await this.settingsRepository.get();
    let usage = await this.update(input.userId, (current) =>
      current.reserve(settings),
    );

    let name: string | null;
    try {
      name = await this.reader.read(input.photo);
    } catch (error) {
      await this.update(input.userId, (current) => current.refund());
      if (error instanceof ProductPhotoUnreadableError) {
        throw new SuggestionImageInvalidException(error.message);
      }
      this.logger.error('Reading the product name failed', error, {
        userId: input.userId,
      });
      throw error;
    }

    const detectedName = name?.trim() ?? '';
    const normalizedName = normalizeProductName(detectedName);
    if (normalizedName === '') {
      return {
        status: EProductSuggestionStatus.UNREADABLE,
        remaining: usage.remaining(settings),
      };
    }

    const item = await this.catalog.findBestMatch(normalizedName);
    if (item) {
      return {
        status: EProductSuggestionStatus.FOUND,
        suggestion: { name: item.name, description: item.description },
        remaining: usage.remaining(settings),
      };
    }

    usage = await this.update(input.userId, async (current) => {
      current.settleNotFound(settings);
      await this.misses.save(
        ProductSuggestionMiss.create({ userId: input.userId, detectedName }),
      );
    });
    return {
      status: EProductSuggestionStatus.NOT_FOUND,
      detectedName,
      remaining: usage.remaining(settings),
    };
  }

  private assertValidPhoto(photo: TProductPhoto): void {
    if (
      !(SUGGESTION_PHOTO_MIME_TYPES as readonly string[]).includes(
        photo.mimeType,
      )
    ) {
      throw new SuggestionImageInvalidException(
        `type must be one of ${SUGGESTION_PHOTO_MIME_TYPES.join(', ')}`,
      );
    }
    if (
      photo.data.length === 0 ||
      photo.data.length > SUGGESTION_PHOTO_MAX_BYTES
    ) {
      throw new SuggestionImageInvalidException(
        `size must be 1..${SUGGESTION_PHOTO_MAX_BYTES} bytes`,
      );
    }
  }

  /** Locks the distributor's usage, applies `change`, saves; one short transaction (never around the AI call). */
  private update(
    userId: string,
    change: (usage: ProductSuggestionUsage) => void | Promise<void>,
  ): Promise<ProductSuggestionUsage> {
    return this.unitOfWork.runInTransaction(async () => {
      const usage = await this.usages.getForUpdate(userId);
      await change(usage);
      await this.usages.save(usage);
      return usage;
    });
  }
}
