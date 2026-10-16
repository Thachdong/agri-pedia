import { Inject, Injectable } from '@nestjs/common';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import { FILE_STORAGE, IFileStorage } from '@shared/storage';
import { Article, TArticleContent, TArticleImage } from '../../domain';
import {
  ARTICLE_SOURCE,
  IArticleSource,
  TArticleSeed,
  TArticleSeedImage,
} from '../ports/article-source';
import {
  ARTICLE_REPOSITORY,
  IArticleRepository,
} from '../ports/article.repository';
import {
  IKnowledgeRepository,
  KNOWLEDGE_REPOSITORY,
} from '../ports/knowledge.repository';

export type TSeededArticle = {
  cropSlug: string;
  slug: string;
  /** Previous slug when the seed renamed the article. */
  oldSlug: string | null;
  diseaseCode: string | null;
  /** New, renamed, or its title / cover changed: pages linking to it show stale data. */
  linkChanged: boolean;
};

export type TDeletedArticle = {
  cropSlug: string;
  slug: string;
  diseaseCode: string | null;
};

export type TSeedArticlesOutput = {
  upserted: TSeededArticle[];
  deleted: TDeletedArticle[];
};

/**
 * Writes the article seed into `articles` (run after the KB seed); idempotent by content hash.
 * New / changed images are uploaded first (public bucket, content hash in the key), then rows are
 * upserted (matched by disease code) and articles no longer in the pack deleted, in one transaction.
 */
@Injectable()
export class SeedArticlesUseCase {
  constructor(
    @Inject(ARTICLE_SOURCE) private readonly source: IArticleSource,
    @Inject(ARTICLE_REPOSITORY) private readonly articles: IArticleRepository,
    @Inject(KNOWLEDGE_REPOSITORY)
    private readonly knowledge: IKnowledgeRepository,
    @Inject(FILE_STORAGE) private readonly storage: IFileStorage,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(): Promise<TSeedArticlesOutput> {
    const seeds = await this.source.load();
    const crops = await this.knowledge.listCrops();
    const slugOf = new Map(crops.map((crop) => [crop.code, crop.slug]));
    const cropSlug = (cropType: string): string => {
      const slug = slugOf.get(cropType);
      if (!slug) throw new Error(`Article crop ${cropType} is not seeded`);
      return slug;
    };
    const existing = await this.articles.findAllForSeed();
    const byDisease = new Map(existing.map((a) => [a.diseaseCode, a]));
    const now = new Date();

    const save: Article[] = [];
    const uploads: Array<{ key: string; image: TArticleSeedImage }> = [];
    const upserted: TSeededArticle[] = [];
    for (const seed of seeds) {
      const old = byDisease.get(seed.diseaseCode);
      if (old?.contentHash === seed.contentHash) continue;

      const content = toContent(seed);
      const oldKeys = new Set(old?.images.map((image) => image.key));
      seed.images.forEach((image, index) => {
        const { key } = content.images[index];
        if (!oldKeys.has(key)) uploads.push({ key, image });
      });
      const renamed = old !== undefined && old.slug !== seed.slug;
      upserted.push({
        cropSlug: cropSlug(seed.cropType),
        slug: seed.slug,
        oldSlug: renamed ? old.slug : null,
        diseaseCode: seed.diseaseCode,
        linkChanged:
          !old ||
          renamed ||
          old.title !== seed.title ||
          coverKey(old.images, old.cover) !==
            coverKey(content.images, content.cover),
      });

      if (old) {
        old.revise(content);
        save.push(old);
      } else {
        save.push(Article.create(content, now));
      }
    }

    const seeded = new Set(seeds.map((seed) => seed.diseaseCode));
    const removed = existing.filter(
      (article) => !seeded.has(article.diseaseCode ?? ''),
    );

    // Upload before writing rows: a failed upload leaves the table unchanged.
    for (const { key, image } of uploads) {
      await this.storage.uploadPublicFile(key, image.content, 'image/webp');
    }
    if (save.length > 0 || removed.length > 0) {
      await this.unitOfWork.runInTransaction(() =>
        this.articles.replaceArticles(
          save,
          removed.map((article) => article.id),
        ),
      );
    }

    return {
      upserted,
      deleted: removed.map((article) => ({
        cropSlug: cropSlug(article.cropType),
        slug: article.slug,
        diseaseCode: article.diseaseCode,
      })),
    };
  }
}

function coverKey(
  images: TArticleImage[],
  cover: string | null,
): string | null {
  return images.find((image) => image.file === cover)?.key ?? null;
}

/** `articles/<CROP>/<CODE>/<name>.<sha8>.webp`: a new key whenever the content changes. */
function imageKey(seed: TArticleSeed, image: TArticleSeedImage): string {
  const name = image.file.replace(/\.webp$/, '');
  return `articles/${seed.cropType}/${seed.diseaseCode}/${name}.${image.sha256.slice(0, 8)}.webp`;
}

function toContent(seed: TArticleSeed): TArticleContent {
  return {
    cropType: seed.cropType,
    diseaseCode: seed.diseaseCode,
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    markdown: seed.markdown,
    cover: seed.cover,
    images: seed.images.map((image) => ({
      file: image.file,
      key: imageKey(seed, image),
      width: image.width,
      height: image.height,
      alt: image.alt,
      caption: image.caption,
      credit: image.credit,
    })),
    sources: seed.sources,
    status: seed.status,
    reviewedBy: seed.reviewedBy,
    reviewedAt: seed.reviewedAt,
    kbVersion: seed.kbVersion,
    contentHash: seed.contentHash,
    updatedAt: seed.updatedAt,
  };
}
