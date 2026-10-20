import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import {
  IProductSuggestionSettingsRepository,
  PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
} from '../ports/product-suggestion-settings.repository';
import {
  assertProductAdmin,
  TProductSuggestionSettingsOutput,
  toSuggestionSettingsOutput,
} from '../product-admin';

/** Admin: the product suggestion quotas (defaults until saved). */
@Injectable()
export class GetProductSuggestionSettingsUseCase {
  constructor(
    @Inject(PRODUCT_SUGGESTION_SETTINGS_REPOSITORY)
    private readonly settings: IProductSuggestionSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
  ) {}

  async execute(input: {
    userId: string;
  }): Promise<TProductSuggestionSettingsOutput> {
    await assertProductAdmin(this.userQuery, input.userId);
    return toSuggestionSettingsOutput(await this.settings.get());
  }
}
