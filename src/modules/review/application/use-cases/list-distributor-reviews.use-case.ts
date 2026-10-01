import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import {
  IProductQueryPort,
  PRODUCT_QUERY_PORT,
} from '@modules/product/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  EReviewTargetType,
  ReviewDistributorNotFoundException,
} from '../../domain';
import { decodeReviewCursor, encodeReviewCursor } from '../review-cursor';
import { summarizeReviews, TReviewSummary } from '../review-summary';
import {
  IReviewRepository,
  REVIEW_REPOSITORY,
  TReviewTargets,
} from '../ports/review.repository';

export type TListDistributorReviewsInput = {
  distributorId: string;
  /** Only reviews of the shop (USER) or of its products (PRODUCT); both when omitted. */
  targetType?: EReviewTargetType;
  star?: number;
  /** `nextCursor` of the previous page (same filters); omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TDistributorReviewItem = {
  id: string;
  targetType: EReviewTargetType;
  targetId: string;
  /** Name of the reviewed product; null for a review of the shop (USER). */
  productName: string | null;
  star: number;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    /** Null when the reviewer account no longer exists. */
    username: string | null;
    /** Signed read URL of the reviewer's avatar; null when none. */
    avatar: string | null;
  };
};

export type TListDistributorReviewsOutput = {
  /** Over every review of the shop, ignoring filters and cursor. */
  summary: TReviewSummary;
  reviews: TDistributorReviewItem[];
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
};

/** Public reviews of a distributor's shop: of the distributor itself and of any product it ever listed. */
@Injectable()
export class ListDistributorReviewsUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: IReviewRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(PRODUCT_QUERY_PORT)
    private readonly productQuery: IProductQueryPort,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
  ) {}

  async execute(
    input: TListDistributorReviewsInput,
  ): Promise<TListDistributorReviewsOutput> {
    const after =
      input.cursor !== undefined ? decodeReviewCursor(input.cursor) : undefined;

    const distributor = await this.userQuery.findProfileById(
      input.distributorId,
    );
    if (!distributor || distributor.role !== 'DISTRIBUTOR') {
      throw new ReviewDistributorNotFoundException(input.distributorId);
    }

    const products = await this.productQuery.listBySeller(input.distributorId);
    const productNames = new Map(
      products.map((product) => [product.productId, product.name]),
    );
    const targets: TReviewTargets = {
      userId: input.distributorId,
      productIds: [...productNames.keys()],
    };

    // One extra row tells whether a next page exists.
    const [starCounts, rows] = await Promise.all([
      this.reviews.summarizeByTargets(targets),
      this.reviews.findByTargets(targets, {
        targetType: input.targetType,
        star: input.star,
        after,
        limit: input.limit + 1,
      }),
    ]);
    const page = rows.slice(0, input.limit);
    const last = page[page.length - 1];
    const nextCursor =
      rows.length > input.limit && last
        ? encodeReviewCursor({ createdAt: last.createdAt, id: last.id })
        : null;

    const reviewerIds = [...new Set(page.map((review) => review.userId))];
    const [profiles, avatars] = await Promise.all([
      this.userQuery.listProfilesByIds(reviewerIds),
      this.mediaQuery.findThumbnails('USER_AVATAR', reviewerIds),
    ]);
    const usernames = new Map(
      profiles.map((profile) => [profile.userId, profile.username]),
    );
    const avatarUrls = new Map(
      avatars.map((avatar) => [avatar.ownerId, avatar.url]),
    );

    return {
      summary: summarizeReviews(starCounts),
      reviews: page.map((review) => ({
        id: review.id,
        targetType: review.targetType,
        targetId: review.targetId,
        productName:
          review.targetType === EReviewTargetType.PRODUCT
            ? (productNames.get(review.targetId) ?? null)
            : null,
        star: review.star,
        content: review.content,
        createdAt: review.createdAt,
        user: {
          id: review.userId,
          username: usernames.get(review.userId) ?? null,
          avatar: avatarUrls.get(review.userId) ?? null,
        },
      })),
      nextCursor,
    };
  }
}
