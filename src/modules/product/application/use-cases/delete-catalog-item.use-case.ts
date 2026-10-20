import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { CatalogItemNotFoundException } from '../../domain';
import {
  CATALOG_REPOSITORY,
  ICatalogRepository,
} from '../ports/catalog.repository';
import { assertProductAdmin } from '../product-admin';

export type TDeleteCatalogItemInput = {
  userId: string;
  catalogItemId: string;
};

/** Admin: removes a catalog item for good (products do not reference the catalog). */
@Injectable()
export class DeleteCatalogItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalog: ICatalogRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TDeleteCatalogItemInput): Promise<void> {
    await assertProductAdmin(this.userQuery, input.userId);
    await this.unitOfWork.runInTransaction(async () => {
      if (!(await this.catalog.findById(input.catalogItemId))) {
        throw new CatalogItemNotFoundException(input.catalogItemId);
      }
      await this.catalog.delete(input.catalogItemId);
    });
  }
}
