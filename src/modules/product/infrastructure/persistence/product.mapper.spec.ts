import { EProductUnit, Product } from '../../domain';
import { ProductMapper } from './product.mapper';

describe('ProductMapper', () => {
  it('round-trips domain -> orm -> domain keeping every field', () => {
    const product = Product.create({
      userId: '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69',
      name: 'Phân NPK',
      description: 'Bao 50kg',
      price: 350000.5,
      quantity: 20,
      unit: EProductUnit.KG_50,
      categoryId: '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10',
    });

    const restored = ProductMapper.toDomain(ProductMapper.toOrm(product));

    expect(restored).toEqual(product);
  });
});

describe('ProductMapper (deleted)', () => {
  it('keeps deletedAt of a deleted product', () => {
    const product = Product.create({
      userId: '5f0c2b1e-8d1a-4c3e-9b7a-1e2d3c4b5a69',
      name: 'Phân NPK',
      description: 'Bao 50kg',
      price: 1,
      quantity: 1,
      unit: EProductUnit.KG,
      categoryId: '0b6f6f7e-3c1a-4a52-9d3e-2f7a1c9b8e10',
    });
    product.delete();

    const restored = ProductMapper.toDomain(ProductMapper.toOrm(product));

    expect(restored.deletedAt).toEqual(product.deletedAt);
  });
});
