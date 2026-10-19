import { Inject, Injectable } from '@nestjs/common';
import { IUserQueryPort, USER_QUERY_PORT } from '@modules/user/contracts';
import { assertArticleAdmin } from '../admin-article-support';
import {
  ITopArticleSettingsRepository,
  TOP_ARTICLE_SETTINGS_REPOSITORY,
} from '../ports/top-article-settings.repository';

export type TGetTopArticleSettingsInput = { userId: string };

export type TTopArticleSettingsOutput = {
  /** Top articles an admin may choose per crop. */
  limit: number;
};

/** Top articles settings, for the admin settings page. */
@Injectable()
export class GetTopArticleSettingsUseCase {
  constructor(
    @Inject(TOP_ARTICLE_SETTINGS_REPOSITORY)
    private readonly settings: ITopArticleSettingsRepository,
    @Inject(USER_QUERY_PORT) private readonly userQuery: IUserQueryPort,
  ) {}

  async execute(
    input: TGetTopArticleSettingsInput,
  ): Promise<TTopArticleSettingsOutput> {
    await assertArticleAdmin(this.userQuery, input.userId);
    const { limit } = await this.settings.get();
    return { limit };
  }
}
