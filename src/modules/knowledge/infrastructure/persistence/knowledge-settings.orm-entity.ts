import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The single row of knowledge settings (id always 1). */
export const KNOWLEDGE_SETTINGS_ROW_ID = 1;

@Entity({ name: 'knowledge_settings' })
export class KnowledgeSettingsOrmEntity {
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ name: 'top_articles_limit', type: 'int' })
  topArticlesLimit: number;
}
