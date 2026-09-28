import {
  IProductQueryPort,
  TProductOwnerSummary,
} from '@modules/product/contracts';
import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryEventBus } from '@shared/event-bus';
import { REVIEW_UPDATED_EVENT } from '../../contracts';
import {
  EReviewTargetType,
  InvalidReviewStarException,
  Review,
  ReviewNotFoundException,
  ReviewNotOwnerException,
  ReviewReviewerNotAllowedException,
} from '../../domain';
import { InMemoryReviewRepository } from '../ports/fakes';
import { UpdateReviewUseCase } from './update-review.use-case';

describe('UpdateReviewUseCase', () => {
  let reviews: InMemoryReviewRepository;
  let roles: Map<string, TUserRoleSummary>;
  let review: Review;
  let product: TProductOwnerSummary | null;
  let eventBus: InMemoryEventBus;
  let useCase: UpdateReviewUseCase;

  beforeEach(async () => {
    reviews = new InMemoryReviewRepository();
    roles = new Map([
      ['farmer-1', { userId: 'farmer-1', role: 'FARMER', isActive: true }],
      ['farmer-2', { userId: 'farmer-2', role: 'FARMER', isActive: true }],
    ]);
    review = Review.create({
      userId: 'farmer-1',
      targetType: EReviewTargetType.PRODUCT,
      targetId: 'product-1',
      content: 'Phân tốt',
      star: 5,
    });
    await reviews.save(review);
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async (id) => roles.get(id) ?? null,
      findProfileById: async () => null,
      listProfilesByIds: async () => [],
    };
    product = {
      productId: 'product-1',
      userId: 'distributor-1',
      isActive: false,
    };
    const productQuery: IProductQueryPort = {
      findOwnerById: async (id) => (product?.productId === id ? product : null),
      listBySeller: async () => [],
    };
    eventBus = new InMemoryEventBus();
    useCase = new UpdateReviewUseCase(
      reviews,
      userQuery,
      productQuery,
      new InMemoryUnitOfWork(),
      eventBus,
    );
  });

  it('updates content and star of own review', async () => {
    await useCase.execute({
      userId: 'farmer-1',
      reviewId: review.id,
      content: '  Tạm ổn ',
      star: 3,
    });

    const saved = await reviews.findById(review.id);
    expect(saved?.content).toBe('Tạm ổn');
    expect(saved?.star).toBe(3);
  });

  it('keeps omitted fields', async () => {
    await useCase.execute({ userId: 'farmer-1', reviewId: review.id, star: 2 });

    const saved = await reviews.findById(review.id);
    expect(saved?.content).toBe('Phân tốt');
    expect(saved?.star).toBe(2);
  });

  it('does nothing when no field is given', async () => {
    const save = jest.spyOn(reviews, 'save');

    await useCase.execute({ userId: 'farmer-1', reviewId: review.id });

    expect(save).not.toHaveBeenCalled();
    expect(eventBus.published).toEqual([]);
  });

  it('publishes review.review.updated to the product seller (inactive product too)', async () => {
    await useCase.execute({ userId: 'farmer-1', reviewId: review.id, star: 3 });

    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: REVIEW_UPDATED_EVENT,
        payload: {
          reviewId: review.id,
          targetOwnerId: 'distributor-1',
          star: 3,
        },
      }),
    ]);
  });

  it('publishes review.review.updated to the reviewed distributor', async () => {
    const shopReview = Review.create({
      userId: 'farmer-1',
      targetType: EReviewTargetType.USER,
      targetId: 'distributor-2',
      content: 'Shop uy tín',
      star: 4,
    });
    await reviews.save(shopReview);

    await useCase.execute({
      userId: 'farmer-1',
      reviewId: shopReview.id,
      content: 'Shop ổn',
    });

    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: REVIEW_UPDATED_EVENT,
        payload: {
          reviewId: shopReview.id,
          targetOwnerId: 'distributor-2',
          star: 4,
        },
      }),
    ]);
  });

  it('saves but publishes nothing when the reviewed product is gone', async () => {
    product = null;

    await useCase.execute({ userId: 'farmer-1', reviewId: review.id, star: 3 });

    expect((await reviews.findById(review.id))?.star).toBe(3);
    expect(eventBus.published).toEqual([]);
  });

  it.each([
    ['unknown user', 'ghost', undefined],
    [
      'distributor',
      'dist-1',
      { userId: 'dist-1', role: 'DISTRIBUTOR', isActive: true },
    ],
    [
      'inactive farmer',
      'farmer-3',
      { userId: 'farmer-3', role: 'FARMER', isActive: false },
    ],
  ] as const)('rejects %s', async (_, userId, summary) => {
    if (summary) roles.set(userId, summary as TUserRoleSummary);

    await expect(
      useCase.execute({ userId, reviewId: review.id, star: 1 }),
    ).rejects.toBeInstanceOf(ReviewReviewerNotAllowedException);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects unknown review', async () => {
    await expect(
      useCase.execute({ userId: 'farmer-1', reviewId: 'missing', star: 1 }),
    ).rejects.toBeInstanceOf(ReviewNotFoundException);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects review of another farmer', async () => {
    await expect(
      useCase.execute({ userId: 'farmer-2', reviewId: review.id, star: 1 }),
    ).rejects.toBeInstanceOf(ReviewNotOwnerException);
    expect((await reviews.findById(review.id))?.star).toBe(5);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects invalid star', async () => {
    await expect(
      useCase.execute({ userId: 'farmer-1', reviewId: review.id, star: 6 }),
    ).rejects.toBeInstanceOf(InvalidReviewStarException);
    expect(eventBus.published).toEqual([]);
  });
});
