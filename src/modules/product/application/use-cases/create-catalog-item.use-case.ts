import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  CatalogItem,
  CatalogItemNameTakenException,
  EProductUnit,
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

export type TCreateCatalogItemInput = {
  userId: string;
  name: string;
  description: string;
  /** Id from the categories list. */
  categoryId?: string | null;
  unit?: EProductUnit | null;
};

/** Admin: adds a product to the catalog; its normalized name must be unique, its category (when set) must exist. */
@Injectable()
export class CreateCatalogItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalog: ICatalogRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categories: ICategoryRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TCreateCatalogItemInput): Promise<TCatalogItemOutput> {
    await assertProductAdmin(this.userQuery, input.userId);
    const item = CatalogItem.create({
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      unit: input.unit,
    });
    await assertCategoryExists(this.categories, item.categoryId);
    await this.unitOfWork.runInTransaction(async () => {
      if (await this.catalog.findByNormalizedName(item.normalizedName)) {
        throw new CatalogItemNameTakenException(item.name);
      }
      await this.catalog.save(item);
    });
    return toCatalogItemOutput(item);
  }
}
