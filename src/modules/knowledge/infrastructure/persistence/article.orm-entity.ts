import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import type { TArticleImage, TArticleSource } from '../../domain';
import { CropOrmEntity } from './crop.orm-entity';
import { DiseaseOrmEntity } from './disease.orm-entity';

/** Titles sort in Vietnamese order (list order and its keyset cursor). */
export const ARTICLE_TITLE_COLLATION = 'vi-x-icu';

@Entity({ name: 'articles' })
@Index('UQ_articles_crop_type_slug', ['cropType', 'slug'], { unique: true })
// One main article per disease and one article per variant (variant codes contain the disease code).
@Index('UQ_articles_disease_code_locale', ['diseaseCode', 'locale'], {
  unique: true,
  where: '"variant_code" IS NULL',
})
@Index('UQ_articles_variant_code_locale', ['variantCode', 'locale'], {
  unique: true,
  where: '"variant_code" IS NOT NULL',
})
@Index('IDX_articles_crop_type_title', ['cropType', 'title'])
@Index('IDX_articles_crop_type_status', ['cropType', 'status'])
export class ArticleOrmEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'crop_type', type: 'varchar', length: 50 })
  cropType: string;

  // Same module: the article goes with its crop / disease.
  @ManyToOne(() => CropOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crop_type', referencedColumnName: 'code' })
  crop?: CropOrmEntity;

  @Column({
    name: 'disease_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  diseaseCode: string | null;

  /** Variant of the disease (`<diseaseCode>__V<n>`); null = the disease's main article. */
  @Column({
    name: 'variant_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  variantCode: string | null;

  @ManyToOne(() => DiseaseOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'disease_code', referencedColumnName: 'code' })
  disease?: DiseaseOrmEntity;

  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 10, default: 'vi' })
  locale: string;

  @Column({ type: 'varchar', length: 200, collation: ARTICLE_TITLE_COLLATION })
  title: string;

  @Column({ type: 'varchar', length: 300 })
  summary: string;

  @Column({ type: 'text' })
  markdown: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  cover: string | null;

  @Column({ type: 'jsonb' })
  images: TArticleImage[];

  @Column({ type: 'jsonb' })
  sources: TArticleSource[];

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'reviewed_by', type: 'varchar', length: 100, nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'kb_version', type: 'varchar', length: 20 })
  kbVersion: string;

  @Column({ name: 'content_hash', type: 'varchar', length: 64 })
  contentHash: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt: Date;

  /** From the seed file, not the write time. */
  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
