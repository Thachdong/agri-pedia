import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';
import { InMemoryUnitOfWork } from '@shared/database';
import {
  EProductStatus,
  EProductUnit,
  InvalidProductPriceException,
  ProductCategoryNotFoundException,
  ProductSellerNotAllowedException,
} from '../../domain';
import {
  InMemoryCategoryRepository,
  InMemoryProductRepository,
} from '../ports/fakes';
import {
  CreateProductUseCase,
  TCreateProductInput,
} from './create-product.use-case';

const input: TCreateProductInput = {
  userId: 'u1',
  name: 'Phân NPK',
  description: 'Bao 50kg',
  price: 350000,
  categoryId: 'c1',
  quantity: 20,
  unit: EProductUnit.BAG,
};

describe('CreateProductUseCase', () => {
  let products: InMemoryProductRepository;
  let categories: InMemoryCategoryRepository;
  let seller: TUserRoleSummary | null;
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    categories = new InMemoryCategoryRepository();
    categories.add({ id: 'c1', name: 'Phân bón' });
    seller = { userId: 'u1', role: 'DISTRIBUTOR', isActive: true };
    const userQuery: IUserQueryPort = {
      findByIdentifier: async () => null,
      findRoleById: async () => seller,
    };
    useCase = new CreateProductUseCase(
      products,
      categories,
      userQuery,
      new InMemoryUnitOfWork(),
    );
  });

  it('saves an ACTIVE product owned by the distributor', async () => {
    const { productId } = await useCase.execute(input);

    const saved = products.items.get(productId);
    expect(saved).toMatchObject({
      userId: 'u1',
      name: 'Phân NPK',
      categoryId: 'c1',
      status: EProductStatus.ACTIVE,
    });
  });

  it.each<[string, TUserRoleSummary | null]>([
    ['unknown user', null],
    ['farmer', { userId: 'u1', role: 'FARMER', isActive: true }],
    [
      'pending distributor',
      { userId: 'u1', role: 'DISTRIBUTOR', isActive: false },
    ],
  ])('rejects %s', async (_, summary) => {
    seller = summary;

    await expect(useCase.execute(input)).rejects.toThrow(
      ProductSellerNotAllowedException,
    );
    expect(products.items.size).toBe(0);
  });

  it('rejects an unknown category', async () => {
    await expect(
      useCase.execute({ ...input, categoryId: 'missing' }),
    ).rejects.toThrow(ProductCategoryNotFoundException);
    expect(products.items.size).toBe(0);
  });

  it('propagates domain validation', async () => {
    await expect(useCase.execute({ ...input, price: -1 })).rejects.toThrow(
      InvalidProductPriceException,
    );
  });
});
