import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { normalizeProductName } from '../../domain';
import {
  CATALOG_REPOSITORY,
  ICatalogRepository,
} from '../ports/catalog.repository';
import {
  assertProductAdmin,
  TCatalogItemOutput,
  toCatalogItemOutput,
} from '../product-admin';

export type TListCatalogItemsInput = {
  userId: string;
  /** Matched against the name ignoring case, diacritics and punctuation. */
  search?: string;
  /** 1-based. */
  page: number;
  limit: number;
};

export type TListCatalogItemsOutput = {
  items: TCatalogItemOutput[];
  total: number;
  page: number;
  limit: number;
};

/** Admin: one page of the product catalog, sorted by name. */
@Injectable()
export class ListCatalogItemsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY) private readonly catalog: ICatalogRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
  ) {}

  async execute(
    input: TListCatalogItemsInput,
  ): Promise<TListCatalogItemsOutput> {
    await assertProductAdmin(this.userQuery, input.userId);
    const search = normalizeProductName(input.search ?? '');
    const page = await this.catalog.listPage({
      search: search || undefined,
      offset: (input.page - 1) * input.limit,
      limit: input.limit,
    });
    return {
      items: page.items.map(toCatalogItemOutput),
      total: page.total,
      page: input.page,
      limit: input.limit,
    };
  }
}
