import { IUserQueryPort } from '@modules/user/contracts';
import {
  CatalogItem,
  EProductUnit,
  ProductAdminRequiredException,
  ProductCategoryNotFoundException,
  ProductSuggestionSettings,
} from '../domain';
import { ICategoryRepository } from './ports/category.repository';

/** Throws ProductAdminRequiredException unless `userId` is an ACTIVE admin. */
export async function assertProductAdmin(
  userQuery: IUserQueryPort,
  userId: string,
): Promise<void> {
  const user = await userQuery.findRoleById(userId);
  if (!user || user.role !== 'ADMIN' || !user.isActive) {
    throw new ProductAdminRequiredException(userId);
  }
}

export type TCatalogItemOutput = {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  unit: EProductUnit | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Throws ProductCategoryNotFoundException when `categoryId` is set and unknown. */
export async function assertCategoryExists(
  categories: ICategoryRepository,
  categoryId: string | null | undefined,
): Promise<void> {
  if (categoryId && !(await categories.existsById(categoryId))) {
    throw new ProductCategoryNotFoundException(categoryId);
  }
}

export function toCatalogItemOutput(item: CatalogItem): TCatalogItemOutput {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    categoryId: item.categoryId,
    unit: item.unit,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export type TProductSuggestionSettingsOutput = {
  invalidImageLimit: number;
  notFoundLimit: number;
};

export function toSuggestionSettingsOutput(
  settings: ProductSuggestionSettings,
): TProductSuggestionSettingsOutput {
  return {
    invalidImageLimit: settings.invalidImageLimit,
    notFoundLimit: settings.notFoundLimit,
  };
}
