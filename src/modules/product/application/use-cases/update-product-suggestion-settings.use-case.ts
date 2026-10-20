import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { TProductSuggestionSettingsProps } from '../../domain';
import {
  IProductSuggestionSettingsRepository,
  PRODUCT_SUGGESTION_SETTINGS_REPOSITORY,
} from '../ports/product-suggestion-settings.repository';
import {
  assertProductAdmin,
  TProductSuggestionSettingsOutput,
  toSuggestionSettingsOutput,
} from '../product-admin';

export type TUpdateProductSuggestionSettingsInput =
  TProductSuggestionSettingsProps & { userId: string };

/** Admin: replaces both quotas; they apply to what every distributor already used. */
@Injectable()
export class UpdateProductSuggestionSettingsUseCase {
  constructor(
    @Inject(PRODUCT_SUGGESTION_SETTINGS_REPOSITORY)
    private readonly settings: IProductSuggestionSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: TUpdateProductSuggestionSettingsInput,
  ): Promise<TProductSuggestionSettingsOutput> {
    const { userId, ...props } = input;
    await assertProductAdmin(this.userQuery, userId);
    const saved = await this.unitOfWork.runInTransaction(async () => {
      const settings = await this.settings.get();
      settings.update(props);
      await this.settings.save(settings);
      return settings;
    });
    return toSuggestionSettingsOutput(saved);
  }
}
