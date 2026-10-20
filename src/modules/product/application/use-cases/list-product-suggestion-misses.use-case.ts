import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  IProductSuggestionMissRepository,
  PRODUCT_SUGGESTION_MISS_REPOSITORY,
  TProductSuggestionMissSummary,
} from '../ports/product-suggestion-miss.repository';
import { assertProductAdmin } from '../product-admin';

export type TListProductSuggestionMissesInput = {
  userId: string;
  /** 1-based. */
  page: number;
  limit: number;
};

export type TListProductSuggestionMissesOutput = {
  items: TProductSuggestionMissSummary[];
  total: number;
  page: number;
  limit: number;
};

/** Admin: names read from photos that matched no catalog item, grouped, most frequent first. */
@Injectable()
export class ListProductSuggestionMissesUseCase {
  constructor(
    @Inject(PRODUCT_SUGGESTION_MISS_REPOSITORY)
    private readonly misses: IProductSuggestionMissRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
  ) {}

  async execute(
    input: TListProductSuggestionMissesInput,
  ): Promise<TListProductSuggestionMissesOutput> {
    await assertProductAdmin(this.userQuery, input.userId);
    const page = await this.misses.listSummaries({
      offset: (input.page - 1) * input.limit,
      limit: input.limit,
    });
    return { ...page, page: input.page, limit: input.limit };
  }
}
