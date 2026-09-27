import {
  IProductQueryPort,
  TProductOwnerSummary,
} from '@modules/product/contracts';
import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  EReviewTargetType,
  InvalidReviewStarException,
  InvalidReviewTargetException,
  Review,
  ReviewAlreadyExistsException,
  ReviewReviewerNotAllowedException,
  ReviewTargetNotFoundException,
} from '../../domain';
import { InMemoryReviewRepository } from '../ports/fakes';
import {
  CreateReviewUseCase,
  TCreateReviewInput,
} from './create-review.use-case';

const productInput: TCreateReviewInput = {
  userId: 'farmer-1',
  targetType: EReviewTargetType.PRODUCT,
  targetId: 'product-1',
  content: 'Phân tốt',
  star: 5,
};

const userInput: TCreateReviewInput = {
  ...productInput,
  targetType: EReviewTargetType.USER,
  targetId: 'distributor-1',
};

describe('CreateReviewUseCase', () => {
  let reviews: InMemoryReviewRepository;
  let roles: Map<string, TUserRoleSummary>;
  let product: TProductOwnerSummary | null;
  let useCase: CreateReviewUseCase;

  beforeEach(() => {
    reviews = new InMemoryReviewRepository();
    roles = new Map([
      ['farmer-1', { userId: 'farmer-1', role: 'FARMER', isActive: true }],
      [
        'distributor-1',
        { userId: 'distributor-1', role: 'DISTRIBUTOR', isActive: true },
      ],
    ]);
    product = {
      productId: 'product-1',
      userId: 'distributor-1',
      isActive: true,
    };
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async (id) => roles.get(id) ?? null,
      findProfileById: async () => null,
    };
    const productQuery: IProductQueryPort = {
      findOwnerById: async (id) => (product?.productId === id ? product : null),
    };
    useCase = new CreateReviewUseCase(
      reviews,
      userQuery,
      productQuery,
      new InMemoryUnitOfWork(),
    );
  });

  it.each([
    ['PRODUCT', productInput],
    ['USER', userInput],
  ])('saves a review of a %s', async (_, input) => {
    const { reviewId } = await useCase.execute(input);

    expect(reviews.items.get(reviewId)).toMatchObject({
      userId: 'farmer-1',
      targetType: input.targetType,
      targetId: input.targetId,
      content: 'Phân tốt',
      star: 5,
    });
  });

  it.each<[string, TUserRoleSummary | undefined]>([
    ['unknown', undefined],
    [
      'a DISTRIBUTOR',
      { userId: 'farmer-1', role: 'DISTRIBUTOR', isActive: true },
    ],
    [
      'an inactive FARMER',
      { userId: 'farmer-1', role: 'FARMER', isActive: false },
    ],
  ])('rejects a reviewer that is %s', async (_, reviewer) => {
    if (reviewer) roles.set('farmer-1', reviewer);
    else roles.delete('farmer-1');

    await expect(useCase.execute(productInput)).rejects.toThrow(
      ReviewReviewerNotAllowedException,
    );
    expect(reviews.items.size).toBe(0);
  });

  it('rejects an unknown target user', async () => {
    await expect(
      useCase.execute({ ...userInput, targetId: 'missing' }),
    ).rejects.toThrow(ReviewTargetNotFoundException);
  });

  it.each<[string, TUserRoleSummary]>([
    ['a FARMER', { userId: 'distributor-1', role: 'FARMER', isActive: true }],
    [
      'a PENDING distributor',
      { userId: 'distributor-1', role: 'DISTRIBUTOR', isActive: false },
    ],
  ])('rejects a target user that is %s', async (_, target) => {
    roles.set('distributor-1', target);

    await expect(useCase.execute(userInput)).rejects.toThrow(
      InvalidReviewTargetException,
    );
  });

  it('rejects an unknown or deleted product', async () => {
    product = null;

    await expect(useCase.execute(productInput)).rejects.toThrow(
      ReviewTargetNotFoundException,
    );
  });

  it('rejects a product that is not ACTIVE', async () => {
    product = { ...product!, isActive: false };

    await expect(useCase.execute(productInput)).rejects.toThrow(
      InvalidReviewTargetException,
    );
  });

  it('rejects a second review of the same target', async () => {
    await reviews.save(
      Review.create({ ...productInput, content: 'Lần trước', star: 4 }),
    );

    await expect(useCase.execute(productInput)).rejects.toThrow(
      ReviewAlreadyExistsException,
    );
    expect(reviews.items.size).toBe(1);
  });

  it('allows the same farmer to review another target', async () => {
    await useCase.execute(productInput);

    await expect(useCase.execute(userInput)).resolves.toEqual({
      reviewId: expect.any(String),
    });
    expect(reviews.items.size).toBe(2);
  });

  it('rejects an invalid star', async () => {
    await expect(useCase.execute({ ...productInput, star: 0 })).rejects.toThrow(
      InvalidReviewStarException,
    );
  });
});
