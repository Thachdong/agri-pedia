import { IMediaQueryPort, TMediaThumbnail } from '@modules/media/contracts';
import {
  IProductQueryPort,
  TProductNameSummary,
} from '@modules/product/contracts';
import { IUserQueryPort, TUserProfileSummary } from '@modules/user/contracts';
import {
  EReviewTargetType,
  InvalidReviewCursorException,
  Review,
  ReviewDistributorNotFoundException,
} from '../../domain';
import { InMemoryReviewRepository } from '../ports/fakes';
import { ListDistributorReviewsUseCase } from './list-distributor-reviews.use-case';

const SHOP = '11111111-1111-4111-8111-111111111111';
const OTHER_SHOP = '22222222-2222-4222-8222-222222222222';
const FARMER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FARMER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

describe('ListDistributorReviewsUseCase', () => {
  let reviews: InMemoryReviewRepository;
  let distributor: TUserProfileSummary | null;
  let profiles: TUserProfileSummary[];
  let products: TProductNameSummary[];
  let avatars: TMediaThumbnail[];
  let useCase: ListDistributorReviewsUseCase;

  const save = async (...items: Review[]) => {
    for (const item of items) {
      await reviews.save(item);
    }
  };

  beforeEach(() => {
    reviews = new InMemoryReviewRepository();
    distributor = { userId: SHOP, username: 'Seed Shop', role: 'DISTRIBUTOR' };
    profiles = [
      { userId: FARMER_A, username: 'Farmer A', role: 'FARMER' },
      { userId: FARMER_B, username: 'Farmer B', role: 'FARMER' },
    ];
    products = [
      { productId: 'p1', name: 'Lúa OM18' },
      { productId: 'p2', name: 'Phân NPK (đã xoá)' },
    ];
    avatars = [{ ownerId: FARMER_A, url: 'https://avatar/a' }];
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => null,
      findProfileById: async (id) =>
        distributor?.userId === id ? distributor : null,
      listProfilesByIds: async (ids) =>
        profiles.filter((profile) => ids.includes(profile.userId)),
    };
    const productQuery: IProductQueryPort = {
      findOwnerById: async () => null,
      listBySeller: async (sellerId) => (sellerId === SHOP ? products : []),
    };
    const mediaQuery: IMediaQueryPort = {
      findUrls: async () => [],
      findThumbnails: async (ownerType, ownerIds) =>
        ownerType === 'USER_AVATAR'
          ? avatars.filter((avatar) => ownerIds.includes(avatar.ownerId))
          : [],
    };
    useCase = new ListDistributorReviewsUseCase(
      reviews,
      userQuery,
      productQuery,
      mediaQuery,
    );
  });

  it('lists reviews of the shop and of its products, newest first, with reviewer and product name', async () => {
    const shopReview = reviewOf(FARMER_A, EReviewTargetType.USER, SHOP, 5, 1);
    const productReview = reviewOf(
      FARMER_B,
      EReviewTargetType.PRODUCT,
      'p2',
      3,
      2,
    );
    const otherShop = reviewOf(
      FARMER_A,
      EReviewTargetType.USER,
      OTHER_SHOP,
      1,
      0,
    );
    const otherProduct = reviewOf(
      FARMER_A,
      EReviewTargetType.PRODUCT,
      'p9',
      1,
      0,
    );
    await save(shopReview, productReview, otherShop, otherProduct);

    const result = await useCase.execute({ distributorId: SHOP, limit: 10 });

    expect(result.reviews).toEqual([
      {
        id: shopReview.id,
        targetType: EReviewTargetType.USER,
        targetId: SHOP,
        productName: null,
        star: 5,
        content: 'r-1',
        createdAt: shopReview.createdAt,
        user: {
          id: FARMER_A,
          username: 'Farmer A',
          avatar: 'https://avatar/a',
        },
      },
      {
        id: productReview.id,
        targetType: EReviewTargetType.PRODUCT,
        targetId: 'p2',
        productName: 'Phân NPK (đã xoá)',
        star: 3,
        content: 'r-2',
        createdAt: productReview.createdAt,
        user: { id: FARMER_B, username: 'Farmer B', avatar: null },
      },
    ]);
    expect(result.nextCursor).toBeNull();
  });

  it('summarizes every review of the shop, ignoring filters and cursor', async () => {
    await save(
      reviewOf(FARMER_A, EReviewTargetType.USER, SHOP, 5, 1),
      reviewOf(FARMER_B, EReviewTargetType.USER, SHOP, 4, 2),
      reviewOf(FARMER_A, EReviewTargetType.PRODUCT, 'p1', 4, 3),
      reviewOf(FARMER_B, EReviewTargetType.PRODUCT, 'p1', 2, 4),
      reviewOf(FARMER_A, EReviewTargetType.USER, OTHER_SHOP, 1, 5),
    );

    const result = await useCase.execute({
      distributorId: SHOP,
      targetType: EReviewTargetType.PRODUCT,
      star: 2,
      limit: 1,
    });

    expect(result.summary).toEqual({
      avgRating: 3.8,
      reviewCount: 4,
      starCounts: { 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 },
    });
    expect(result.reviews.map((review) => review.star)).toEqual([2]);
  });

  it('returns an empty summary for a shop without reviews', async () => {
    await expect(
      useCase.execute({ distributorId: SHOP, limit: 10 }),
    ).resolves.toEqual({
      summary: {
        avgRating: 0,
        reviewCount: 0,
        starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      reviews: [],
      nextCursor: null,
    });
  });

  it.each([
    [EReviewTargetType.USER, [5]],
    [EReviewTargetType.PRODUCT, [4]],
  ])('filters by targetType %s', async (targetType, stars) => {
    await save(
      reviewOf(FARMER_A, EReviewTargetType.USER, SHOP, 5, 1),
      reviewOf(FARMER_A, EReviewTargetType.PRODUCT, 'p1', 4, 2),
    );

    const result = await useCase.execute({
      distributorId: SHOP,
      targetType,
      limit: 10,
    });

    expect(result.reviews.map((review) => review.star)).toEqual(stars);
  });

  it('pages with nextCursor under the same filters', async () => {
    await save(
      reviewOf(FARMER_A, EReviewTargetType.USER, SHOP, 5, 1),
      reviewOf(FARMER_B, EReviewTargetType.PRODUCT, 'p1', 5, 2),
      reviewOf(FARMER_A, EReviewTargetType.PRODUCT, 'p1', 3, 3),
      reviewOf(FARMER_B, EReviewTargetType.PRODUCT, 'p2', 5, 4),
    );

    const first = await useCase.execute({
      distributorId: SHOP,
      star: 5,
      limit: 2,
    });
    expect(first.reviews.map((review) => review.content)).toEqual([
      'r-1',
      'r-2',
    ]);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await useCase.execute({
      distributorId: SHOP,
      star: 5,
      limit: 2,
      cursor: first.nextCursor!,
    });
    expect(second.reviews.map((review) => review.content)).toEqual(['r-4']);
    expect(second.nextCursor).toBeNull();
  });

  it('shows null username for a reviewer that no longer exists', async () => {
    profiles = [];
    await save(reviewOf(FARMER_A, EReviewTargetType.USER, SHOP, 5, 1));

    const result = await useCase.execute({ distributorId: SHOP, limit: 10 });

    expect(result.reviews[0].user).toEqual({
      id: FARMER_A,
      username: null,
      avatar: 'https://avatar/a',
    });
  });

  it.each<[string, TUserProfileSummary | null]>([
    ['unknown', null],
    ['a FARMER', { userId: SHOP, username: 'x', role: 'FARMER' }],
  ])('rejects a distributorId that is %s', async (_, profile) => {
    distributor = profile;

    await expect(
      useCase.execute({ distributorId: SHOP, limit: 10 }),
    ).rejects.toThrow(ReviewDistributorNotFoundException);
  });

  it.each([
    'not-base64-json',
    Buffer.from('{"c":"nope","i":"x"}').toString('base64url'),
    Buffer.from(
      JSON.stringify({ c: '2026-01-01T00:00:00.000Z', i: 'not-a-uuid' }),
    ).toString('base64url'),
  ])('rejects cursor %p', async (cursor) => {
    await expect(
      useCase.execute({ distributorId: SHOP, limit: 10, cursor }),
    ).rejects.toThrow(InvalidReviewCursorException);
  });
});
