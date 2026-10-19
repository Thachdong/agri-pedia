import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ArticleOrmEntity } from './article.orm-entity';
import { CropOrmEntity } from './crop.orm-entity';

/** One top article of a crop; `position` 0 = top. */
@Entity({ name: 'knowledge_crop_top_articles' })
export class CropTopArticleOrmEntity {
  @PrimaryColumn({ name: 'crop_type', type: 'varchar', length: 50 })
  cropType: string;

  @PrimaryColumn({ type: 'int' })
  position: number;

  @Column({ name: 'article_id', type: 'uuid' })
  articleId: string;

  // Same module: the list goes with its crop; a deleted article leaves it.
  @ManyToOne(() => CropOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crop_type', referencedColumnName: 'code' })
  crop?: CropOrmEntity;

  @ManyToOne(() => ArticleOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article?: ArticleOrmEntity;
}
