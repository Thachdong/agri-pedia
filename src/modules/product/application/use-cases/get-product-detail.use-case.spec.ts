import { IMediaQueryPort, TMediaItem } from '@modules/media/contracts';
import {
  EProductStatus,
  EProductUnit,
  Product,
  ProductNotFoundException,
} from '../../domain';
import { InMemoryProductRepository } from '../ports/fakes';
import { GetProductDetailUseCase } from './get-product-detail.use-case';

describe('GetProductDetailUseCase', () => {
  let products: InMemoryProductRepository;
  let mediaByOwner: Map<string, TMediaItem[]>;
  let product: Product;
  let useCase: GetProductDetailUseCase;

  beforeEach(async () => {
    products = new InMemoryProductRepository();
    mediaByOwner = new Map();
    product = Product.create({
      userId: 'distributor-1',
      name: 'Phân NPK',
      description: 'Bao 50kg',
      price: 350000,
      quantity: 20,
      unit: EProductUnit.BAG,
      categoryId: 'c1',
    });
    await products.save(product);
    const mediaQuery: IMediaQueryPort = {
      findThumbnails: async () => [],
      findUrls: async () => [],
      listByOwner: async (ownerType, ownerId) =>
        ownerType === 'PRODUCT' ? (mediaByOwner.get(ownerId) ?? []) : [],
    };
    useCase = new GetProductDetailUseCase(products, mediaQuery);
  });

  it('returns the product with its seller id and media in order', async () => {
    mediaByOwner.set(product.id, [
      { mediaId: 'm1', type: 'IMAGE', url: 'https://cdn/m1.png' },
      { mediaId: 'm2', type: 'VIDEO', url: 'https://cdn/m2.mp4' },
    ]);

    await expect(useCase.execute({ productId: product.id })).resolves.toEqual({
      id: product.id,
      name: 'Phân NPK',
      description: 'Bao 50kg',
      price: 350000,
      quantity: 20,
      unit: EProductUnit.BAG,
      categoryId: 'c1',
      status: EProductStatus.ACTIVE,
      distributorId: 'distributor-1',
      media: [
        { id: 'm1', type: 'IMAGE', url: 'https://cdn/m1.png' },
        { id: 'm2', type: 'VIDEO', url: 'https://cdn/m2.mp4' },
      ],
    });
  });

  it('returns a product that is not ACTIVE, with an empty media list', async () => {
    product.update({ status: EProductStatus.OUT_OF_STOCK });

    const output = await useCase.execute({ productId: product.id });

    expect(output.status).toBe(EProductStatus.OUT_OF_STOCK);
    expect(output.media).toEqual([]);
  });

  it('rejects an unknown product', async () => {
    await expect(useCase.execute({ productId: 'nope' })).rejects.toThrow(
      ProductNotFoundException,
    );
  });

  it('rejects a deleted product', async () => {
    product.delete();

    await expect(useCase.execute({ productId: product.id })).rejects.toThrow(
      ProductNotFoundException,
    );
  });
});
