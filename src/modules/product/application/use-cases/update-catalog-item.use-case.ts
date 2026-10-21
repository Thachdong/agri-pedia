import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  CatalogItemNameTakenException,
  CatalogItemNotFoundException,
  EProductUnit,
  normalizeProductName,
} from '../../domain';
import {
  CATALOG_REPOSITORY,
  ICatalogRepository,
} from '../ports/catalog.repository';
import {
  CATEGORY_REPOSITORY,
  ICategoryRepository,
} from '../ports/category.repository';
import {
  assertCategoryExists,
  assertProductAdmin,
  TCatalogItemOutput,
  toCatalogItemOutput,
} from '../product-admin';

export type TUpdateCatalogItemInput = {
  userId: string;
  catalogItemId: string;
  /** Omitted fields are kept; null clears categoryId / unit. */
  name?: string;
  description?: string;
  categoryId?: string | null;
  unit?: EProductUnit | null;
};

/** Admin: changes a catalog item; a new name must stay unique, a new category must exist. */
@Injectable()
export class UpdateCatalogItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalog: ICatalogRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: ICategoryRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TUpdateCatalogItemInput): Promise<TCatalogItemOutput> {
    await assertProductAdmin(this.userQuery, input.userId);
    await assertCategoryExists(this.categories, input.categoryId);
    const item = await this.unitOfWork.runInTransaction(async () => {
      const found = await this.catalog.findById(input.catalogItemId);
      if (!found) {
        throw new CatalogItemNotFoundException(input.catalogItemId);
      }
      if (input.name !== undefined) {
        const sameName = await this.catalog.findByNormalizedName(
          normalizeProductName(input.name),
        );
        if (sameName && sameName.id !== found.id) {
          throw new CatalogItemNameTakenException(input.name.trim());
        }
      }
      found.update({
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        unit: input.unit,
      });
      await this.catalog.save(found);
      return found;
    });
    return toCatalogItemOutput(item);
  }
}
