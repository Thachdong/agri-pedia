import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import {
  IProductSuggestionSettingsRepository,
  PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
} from '../ports/product-suggestion-settings.repository';
import { assertProductAdmin } from '../product-admin';
import {
  toAiModelOutput,
  TProductSuggestionAiModelOutput,
} from '../product-suggestion-ai-model';

export type TGetProductSuggestionAiModelInput = { userId: string };

/** Admin: AI model that reads product names. */
@Injectable()
export class GetProductSuggestionAiModelUseCase {
  constructor(
    @Inject(PRODUCT_SUGGESTION_SETTINGS_REPOSITORY)
    private readonly settings: IProductSuggestionSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
  ) {}

  async execute(
    input: TGetProductSuggestionAiModelInput,
  ): Promise<TProductSuggestionAiModelOutput> {
    await assertProductAdmin(this.userQuery, input.userId);
    return toAiModelOutput(await this.settings.get(), this.config);
  }
}
