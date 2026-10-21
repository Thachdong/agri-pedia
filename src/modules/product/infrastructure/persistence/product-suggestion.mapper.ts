import {
  CatalogItem,
  EProductUnit,
  ProductSuggestionMiss,
  ProductSuggestionSettings,
  ProductSuggestionUsage,
} from '../../domain';
import { CatalogItemOrmEntity } from './catalog-item.orm-entity';
import { ProductSuggestionMissOrmEntity } from './product-suggestion-miss.orm-entity';
import {
  PRODUCT_SUGGESTION_SETTINGS_ROW_ID,
  ProductSuggestionSettingsOrmEntity,
} from './product-suggestion-settings.orm-entity';
import { ProductSuggestionUsageOrmEntity } from './product-suggestion-usage.orm-entity';

export class CatalogItemMapper {
  static toDomain(row: CatalogItemOrmEntity): CatalogItem {
    return CatalogItem.restore(row.id, {
      name: row.name,
      normalizedName: row.normalizedName,
      description: row.description,
      categoryId: row.categoryId,
      unit: row.unit as EProductUnit | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toOrm(item: CatalogItem): CatalogItemOrmEntity {
    return Object.assign(new CatalogItemOrmEntity(), {
      id: item.id,
      name: item.name,
      normalizedName: item.normalizedName,
      description: item.description,
      categoryId: item.categoryId,
      unit: item.unit,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
}

export class ProductSuggestionSettingsMapper {
  static toDomain(
    row: ProductSuggestionSettingsOrmEntity,
  ): ProductSuggestionSettings {
    return ProductSuggestionSettings.restore({
      invalidImageLimit: row.invalidImageLimit,
      notFoundLimit: row.notFoundLimit,
    });
  }

  static toOrm(
    settings: ProductSuggestionSettings,
  ): ProductSuggestionSettingsOrmEntity {
    return Object.assign(new ProductSuggestionSettingsOrmEntity(), {
      id: PRODUCT_SUGGESTION_SETTINGS_ROW_ID,
      invalidImageLimit: settings.invalidImageLimit,
      notFoundLimit: settings.notFoundLimit,
    });
  }
}

export class ProductSuggestionUsageMapper {
  static toDomain(
    row: ProductSuggestionUsageOrmEntity,
  ): ProductSuggestionUsage {
    return ProductSuggestionUsage.restore({
      userId: row.userId,
      used: row.used,
      bonusUsed: row.bonusUsed,
    });
  }

  static toOrm(usage: ProductSuggestionUsage): ProductSuggestionUsageOrmEntity {
    return Object.assign(new ProductSuggestionUsageOrmEntity(), {
      userId: usage.userId,
      used: usage.used,
      bonusUsed: usage.bonusUsed,
    });
  }
}

export class ProductSuggestionMissMapper {
  static toOrm(miss: ProductSuggestionMiss): ProductSuggestionMissOrmEntity {
    return Object.assign(new ProductSuggestionMissOrmEntity(), {
      id: miss.id,
      userId: miss.userId,
      detectedName: miss.detectedName,
      normalizedName: miss.normalizedName,
      createdAt: miss.createdAt,
    });
  }
}
