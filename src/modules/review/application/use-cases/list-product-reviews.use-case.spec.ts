import { IMediaQueryPort, TMediaThumbnail } from '@modules/media/contracts';
import {
  IProductQueryPort,
  TProductOwnerSummary,
} from '@modules/product/contracts';
import { IUserQueryPort, TUserProfileSummary } from '@modules/user/contracts';
import {
  EReviewTargetType,
  InvalidReviewCursorException,
  Review,
  ReviewTargetNotFoundException,
} from '../../domain';
import { InMemoryReviewRepository } from '../ports/fakes';
import { ListProductReviewsUseCase } from './list-product-reviews.use-case';

const SHOP = '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10';
const FARMER_A = '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69';
const FARMER_B = '9d1f3a52-6b2e-4c7d-8e9f-0a1b2c3d4e5f';
const PRODUCT = '00000000-0000-4000-8000-0000000000a1';
const OTHER_PRODUCT = '00000000-0000-4000-8000-0000000000a2';

/** Review by `userId` created `minutesAgo` minutes ago. */
const reviewOf = (
  userId: string,
  targetType: EReviewTargetType,
  targetId: string,
  star: number,
  minutesAgo: number,
): Review =>
  Review.restore(crypto.randomUUID(), {
    userId,
    targetType,
    targetId,
    content: `r-${minutesAgo}`,
    star,
    createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0) - minutesAgo * 60_000),
  });

describe('ListProductReviewsUseCase', () => {
  let reviews: InMemoryReviewRepository;
  let product: TProductOwnerSummary | null;
  let profiles: TUserProfileSummary[];
  let avatars: TMediaThumbnail[];
  let useCase: ListProductReviewsUseCase;

  const save = async (...items: Review[]) => {
    for (const item of items) {
      await reviews.save(item);
    }
  };

  beforeEach(() => {
    reviews = new InMemoryReviewRepository();
    product = { productId: PRODUCT, userId: SHOP, isActive: true };
    profiles = [{ userId: FARMER_A, username: 'Farmer A', role: 'FARMER' }];
    avatars = [{ ownerId: FARMER_A, url: 'https://avatar/a' }];
    const productQuery: IProductQueryPort = {
      findOwnerById: async (id) => (product?.productId === id ? product : null),
      listBySeller: async () => [],
    };
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => null,
      findProfileById: async () => null,
      listProfilesByIds: async (ids) =>
        profiles.filter((profile) => ids.includes(profile.userId)),
    };
    const mediaQuery: IMediaQueryPort = {
      listByOwner: async () => [],
      findUrls: async () => [],
      findThumbnails: async (ownerType, ownerIds) =>
        ownerType === 'USER_AVATAR'
          ? avatars.filter((avatar) => ownerIds.includes(avatar.ownerId))
          : [],
    };
    useCase = new ListProductReviewsUseCase(
      reviews,
      productQuery,
      userQuery,
      mediaQuery,
    );
  });

  it('lists only the reviews of the product, newest first, with reviewer profile', async () => {
    const older = reviewOf(FARMER_A, EReviewTargetType.PRODUCT, PRODUCT, 5, 2);
    const newer = reviewOf(FARMER_B, EReviewTargetType.PRODUCT, PRODUCT, 3, 1);
    await save(
      older,
      newer,
      reviewOf(FARMER_A, EReviewTargetType.PRODUCT, OTHER_PRODUCT, 4, 0),
      reviewOf(FARMER_A, EReviewTargetType.USER, SHOP, 1, 0),
    );

    const output = await useCase.execute({ productId: PRODUCT, limit: 10 });

    expect(output).toEqual({
      reviews: [
        {
          id: newer.id,
          star: 3,
          content: 'r-1',
          createdAt: newer.createdAt,
          user: { id: FARMER_B, username: null, avatar: null },
        },
        {
          id: older.id,
          star: 5,
          content: 'r-2',
          createdAt: older.createdAt,
          user: {
            id: FARMER_A,
            username: 'Farmer A',
            avatar: 'https://avatar/a',
          },
        },
      ],
      nextCursor: null,
    });
  });

  it('filters by star', async () => {
    const five = reviewOf(FARMER_A, EReviewTargetType.PRODUCT, PRODUCT, 5, 2);
    await save(
      five,
      reviewOf(FARMER_B, EReviewTargetType.PRODUCT, PRODUCT, 3, 1),
    );

    const output = await useCase.execute({
      productId: PRODUCT,
      star: 5,
      limit: 10,
    });

    expect(output.reviews.map((review) => review.id)).toEqual([five.id]);
  });

  it('pages with the cursor', async () => {
    const items = [1, 2, 3].map((minutesAgo) =>
      reviewOf(FARMER_A, EReviewTargetType.PRODUCT, PRODUCT, 4, minutesAgo),
    );
    await save(...items);

    const first = await useCase.execute({ productId: PRODUCT, limit: 2 });
    const second = await useCase.execute({
      productId: PRODUCT,
      limit: 2,
      cursor: first.nextCursor!,
    });

    expect(first.reviews.map((review) => review.id)).toEqual([
      items[0].id,
      items[1].id,
    ]);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(second.reviews.map((review) => review.id)).toEqual([items[2].id]);
    expect(second.nextCursor).toBeNull();
  });

  it('rejects an unknown or deleted product', async () => {
    product = null;

    await expect(
      useCase.execute({ productId: PRODUCT, limit: 10 }),
    ).rejects.toThrow(ReviewTargetNotFoundException);
  });

  it('rejects a malformed cursor', async () => {
    await expect(
      useCase.execute({ productId: PRODUCT, limit: 10, cursor: 'nope' }),
    ).rejects.toThrow(InvalidReviewCursorException);
  });
});
