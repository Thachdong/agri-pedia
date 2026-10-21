import {
  CatalogItem,
  ProductSuggestionMiss,
  ProductSuggestionSettings,
  ProductSuggestionUsage,
} from '../../domain';
import {
  CatalogItemMapper,
  ProductSuggestionMissMapper,
  ProductSuggestionSettingsMapper,
  ProductSuggestionUsageMapper,
} from './product-suggestion.mapper';

describe('product suggestion mappers', () => {
  it('CatalogItem round-trips every field', () => {
    const item = CatalogItem.create({
      name: 'Anvil 5SC',
      description: 'Hexaconazole',
    });

    const back = CatalogItemMapper.toDomain(CatalogItemMapper.toOrm(item));

    expect(back).toEqual(item);
  });

  it('ProductSuggestionSettings round-trips into the single row', () => {
    const settings = ProductSuggestionSettings.restore(
      { invalidImageLimit: 20, notFoundLimit: 5 },
      'gemini-2.5-flash-lite',
    );

    const row = ProductSuggestionSettingsMapper.toOrm(settings);

    expect(row.id).toBe(1);
    expect(row.model).toBe('gemini-2.5-flash-lite');
    expect(ProductSuggestionSettingsMapper.toDomain(row)).toEqual(settings);
  });

  it('ProductSuggestionUsage round-trips every field', () => {
    const usage = ProductSuggestionUsage.restore({
      userId: 'u1',
      used: 3,
      bonusUsed: 2,
    });

    expect(
      ProductSuggestionUsageMapper.toDomain(
        ProductSuggestionUsageMapper.toOrm(usage),
      ),
    ).toEqual(usage);
  });

  it('ProductSuggestionMiss maps every field', () => {
    const miss = ProductSuggestionMiss.create({
      userId: 'u1',
      detectedName: 'Thuốc A',
    });

    expect(ProductSuggestionMissMapper.toOrm(miss)).toEqual({
      id: miss.id,
      userId: 'u1',
      detectedName: 'Thuốc A',
      normalizedName: 'thuoc a',
      createdAt: miss.createdAt,
    });
  });
});
