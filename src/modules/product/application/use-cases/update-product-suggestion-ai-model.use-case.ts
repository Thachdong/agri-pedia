import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  IProductSuggestionSettingsRepository,
  PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
} from '../ports/product-suggestion-settings.repository';
import { assertProductAdmin } from '../product-admin';
import {
  toAiModelOutput,
  TProductSuggestionAiModelOutput,
} from '../product-suggestion-ai-model';

export type TUpdateProductSuggestionAiModelInput = {
  userId: string;
  /** null = env model. */
  model: string | null;
};

/** Admin: replaces the AI model that reads product names; applies to the next suggestion. */
@Injectable()
export class UpdateProductSuggestionAiModelUseCase {
  constructor(
    @Inject(PRODUCT_SUGGESTION_SETTINGS_REPOSITORY)
    private readonly settings: IProductSuggestionSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: TUpdateProductSuggestionAiModelInput,
  ): Promise<TProductSuggestionAiModelOutput> {
    await assertProductAdmin(this.userQuery, input.userId);
    const saved = await this.unitOfWork.runInTransaction(async () => {
      const settings = await this.settings.get();
      settings.updateAiModel(input.model);
      await this.settings.save(settings);
      return settings;
    });
    return toAiModelOutput(saved, this.config);
  }
}
