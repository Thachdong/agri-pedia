import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { assertArticleAdmin } from '../admin-article-support';
import {
  ITopArticleSettingsRepository,
  TOP_ARTICLE_SETTINGS_REPOSITORY,
} from '../ports/top-article-settings.repository';
import { TTopArticleSettingsOutput } from './get-top-article-settings.use-case';

export type TUpdateTopArticleSettingsInput = { userId: string; limit: number };

/** Changes the top articles limit; lists already longer stay, public reads show the first `limit`. */
@Injectable()
export class UpdateTopArticleSettingsUseCase {
  constructor(
    @Inject(TOP_ARTICLE_SETTINGS_REPOSITORY)
    private readonly settings: ITopArticleSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(
    input: TUpdateTopArticleSettingsInput,
  ): Promise<TTopArticleSettingsOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const saved = await this.unitOfWork.runInTransaction(async () => {
      const settings = await this.settings.get();
      settings.changeLimit(input.limit);
      await this.settings.save(settings);
      return settings;
    });
    return { limit: saved.limit };
  }
}
