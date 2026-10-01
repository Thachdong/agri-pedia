import { Inject, Injectable } from '@nestjs/common';
import { IMediaQueryPort, MEDIA_QUERY_PORT } from '@modules/media/contracts';
import {
  IProductQueryPort,
  PRODUCT_QUERY_PORT,
} from '@modules/product/contracts';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { EReviewTargetType, ReviewTargetNotFoundException } from '../../domain';
import {
  IReviewRepository,
  REVIEW_REPOSITORY,
} from '../ports/review.repository';
import { decodeReviewCursor, encodeReviewCursor } from '../review-cursor';

export type TListProductReviewsInput = {
  productId: string;
  star?: number;
  /** `nextCursor` of the previous page (same filters); omitted for the first page. */
  cursor?: string;
  limit: number;
};

export type TProductReviewItem = {
  id: string;
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

export type TListProductReviewsOutput = {
  reviews: TProductReviewItem[];
  /** Pass back as `cursor` to get the next page; null on the last page. */
  nextCursor: string | null;
};

/** Public reviews of one product (not deleted), newest first, with each reviewer's profile; keyset-paginated. */
@Injectable()
export class ListProductReviewsUseCase {
  constructor(
    @Inject(REVIEW_REPOSITORY) private readonly reviews: IReviewRepository,
    @Inject(PRODUCT_QUERY_PORT)
    private readonly productQuery: IProductQueryPort,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(MEDIA_QUERY_PORT) private readonly mediaQuery: IMediaQueryPort,
  ) {}

  async execute(
    input: TListProductReviewsInput,
  ): Promise<TListProductReviewsOutput> {
    const after =
      input.cursor !== undefined ? decodeReviewCursor(input.cursor) : undefined;

    const product = await this.productQuery.findOwnerById(input.productId);
    if (!product) {
      throw new ReviewTargetNotFoundException(
        EReviewTargetType.PRODUCT,
        input.productId,
      );
    }

    // One extra row tells whether a next page exists.
    const rows = await this.reviews.findByTargets(
      { userId: product.userId, productIds: [product.productId] },
      {
        targetType: EReviewTargetType.PRODUCT,
        star: input.star,
        after,
        limit: input.limit + 1,
      },
    );
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
      reviews: page.map((review) => ({
        id: review.id,
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
