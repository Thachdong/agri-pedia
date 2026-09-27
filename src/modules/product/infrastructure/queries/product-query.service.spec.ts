import { InMemoryProductRepository } from '../../application/ports/fakes';
import { EProductStatus, EProductUnit, Product } from '../../domain';
import { ProductQueryService } from './product-query.service';

const newProduct = () =>
  Product.create({
    userId: 'distributor-1',
    name: 'Phân NPK',
    description: 'Bao 50kg',
    price: 350000,
    quantity: 20,
    unit: EProductUnit.BAG,
    categoryId: 'c1',
  });

describe('ProductQueryService.findOwnerById', () => {
  let products: InMemoryProductRepository;
  let service: ProductQueryService;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    service = new ProductQueryService(products);
  });

  it('returns the seller of an ACTIVE product', async () => {
    const product = newProduct();
    await products.save(product);

    await expect(service.findOwnerById(product.id)).resolves.toEqual({
      productId: product.id,
      userId: 'distributor-1',
      isActive: true,
    });
  });

  it.each([EProductStatus.INACTIVE, EProductStatus.OUT_OF_STOCK])(
    'reports a %s product as not active',
    async (status) => {
      const product = newProduct();
      product.update({ status });
      await products.save(product);

      await expect(service.findOwnerById(product.id)).resolves.toMatchObject({
        isActive: false,
      });
    },
  );

  it('returns null for a deleted product', async () => {
    const product = newProduct();
    product.delete();
    await products.save(product);

    await expect(service.findOwnerById(product.id)).resolves.toBeNull();
  });

  it('returns null for an unknown id', async () => {
    await expect(service.findOwnerById('missing')).resolves.toBeNull();
  });
});

describe('ProductQueryService.listBySeller', () => {
  let products: InMemoryProductRepository;
  let service: ProductQueryService;

  beforeEach(() => {
    products = new InMemoryProductRepository();
    service = new ProductQueryService(products);
  });

  it('lists every product of the seller, any status, deleted included', async () => {
    const active = newProduct();
    const inactive = newProduct();
    inactive.update({ status: EProductStatus.INACTIVE, name: 'Lúa OM5451' });
    const deleted = newProduct();
    deleted.delete();
    const otherSeller = Product.create({
      userId: 'distributor-2',
      name: 'Tôm giống',
      description: 'PL12',
      price: 100,
      quantity: 1,
      unit: EProductUnit.PIECE,
      categoryId: 'c1',
    });
    for (const product of [active, inactive, deleted, otherSeller]) {
      await products.save(product);
    }

    const result = await service.listBySeller('distributor-1');

    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([
        { productId: active.id, name: 'Phân NPK' },
        { productId: inactive.id, name: 'Lúa OM5451' },
        { productId: deleted.id, name: 'Phân NPK' },
      ]),
    );
  });

  it('returns an empty list for a seller without products', async () => {
    await expect(service.listBySeller('nobody')).resolves.toEqual([]);
  });
});
