import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
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
    useCase = new UpdateReviewUseCase(
      reviews,
      userQuery,
      new InMemoryUnitOfWork(),
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
  });

  it('rejects unknown review', async () => {
    await expect(
      useCase.execute({ userId: 'farmer-1', reviewId: 'missing', star: 1 }),
    ).rejects.toBeInstanceOf(ReviewNotFoundException);
  });

  it('rejects review of another farmer', async () => {
    await expect(
      useCase.execute({ userId: 'farmer-2', reviewId: review.id, star: 1 }),
    ).rejects.toBeInstanceOf(ReviewNotOwnerException);
    expect((await reviews.findById(review.id))?.star).toBe(5);
  });

  it('rejects invalid star', async () => {
    await expect(
      useCase.execute({ userId: 'farmer-1', reviewId: review.id, star: 6 }),
    ).rejects.toBeInstanceOf(InvalidReviewStarException);
  });
});
