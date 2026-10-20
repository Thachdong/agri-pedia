import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TypeOrmRepositoryBase } from '@shared/database';
import { ITopArticleSettingsRepository } from '../../application/ports';
import { TopArticleSettings } from '../../domain';
import {
  KNOWLEDGE_SETTINGS_ROW_ID,
  KnowledgeSettingsOrmEntity,
} from './knowledge-settings.orm-entity';

@Injectable()
export class PgTopArticleSettingsRepository
  extends TypeOrmRepositoryBase<KnowledgeSettingsOrmEntity>
  implements ITopArticleSettingsRepository
{
  constructor(dataSource: DataSource) {
    super(dataSource, KnowledgeSettingsOrmEntity);
  }

  async get(): Promise<TopArticleSettings> {
    const row = await this.repository.findOneBy({
      id: KNOWLEDGE_SETTINGS_ROW_ID,
    });
    return row
      ? TopArticleSettings.restore({ limit: row.topArticlesLimit })
      : TopArticleSettings.defaults();
  }

  async save(settings: TopArticleSettings): Promise<void> {
    await this.repository.save({
      id: KNOWLEDGE_SETTINGS_ROW_ID,
      topArticlesLimit: settings.limit,
    });
  }
}
