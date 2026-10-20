import { InvalidCatalogItemException } from '../exceptions/invalid-catalog-item.exception';
import { CatalogItem } from './catalog-item.entity';

describe('CatalogItem', () => {
  it('create trims content and derives the normalized name', () => {
    const item = CatalogItem.create({
      name: '  Anvil 5SC ',
      description: ' Hexaconazole 50g/l ',
    });

    expect(item.id).toBeDefined();
    expect(item.name).toBe('Anvil 5SC');
    expect(item.normalizedName).toBe('anvil 5sc');
    expect(item.description).toBe('Hexaconazole 50g/l');
    expect(item.updatedAt).toEqual(item.createdAt);
  });

  it.each([
    ['name without letters or digits', { name: '***', description: 'd' }],
    ['name too long', { name: 'a'.repeat(256), description: 'd' }],
    ['empty description', { name: 'Anvil', description: '   ' }],
    ['description too long', { name: 'Anvil', description: 'd'.repeat(5001) }],
  ])('create rejects %s', (_case, input) => {
    expect(() => CatalogItem.create(input)).toThrow(
      InvalidCatalogItemException,
    );
  });

  it('update changes the given fields only and re-derives the normalized name', () => {
    const item = CatalogItem.create({ name: 'Anvil 5SC', description: 'old' });

    item.update({ name: 'Tilt Super 300EC' });

    expect(item.name).toBe('Tilt Super 300EC');
    expect(item.normalizedName).toBe('tilt super 300ec');
    expect(item.description).toBe('old');
  });

  it('update validates like create', () => {
    const item = CatalogItem.create({ name: 'Anvil 5SC', description: 'old' });

    expect(() => item.update({ description: '' })).toThrow(
      InvalidCatalogItemException,
    );
    expect(item.description).toBe('old');
  });
});
