import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EArticleStatus } from '../enums/article-status.enum';
import { imageFilesInOrder } from '../services/article-markdown-resolver';

/** Public site path prefix of articles. */
export const ARTICLE_PATH_PREFIX = '/benh-cay-trong';

export type TArticleImageCredit = {
  source: string;
  author: string;
  license: string;
  url: string;
};

export type TArticleImage = {
  /** File name used in the markdown and `cover`, e.g. `dao-on-la-1.webp`. */
  file: string;
  /** Storage object key (public prefix, content hash in the name). */
  key: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: TArticleImageCredit;
};

export type TArticleSource = { title: string; url: string };

/** Everything an article seed file defines (plus derived image data and hash). */
export type TArticleContent = {
  /** Crop.code. */
  cropType: string;
  /** Disease.code of the same crop; null = article not about a disease. */
  diseaseCode: string | null;
  /** Unique within the crop, e.g. `benh-dao-on`. */
  slug: string;
  title: string;
  summary: string;
  /** Body without frontmatter; image file names and `/diseases/<CODE>` links kept as written. */
  markdown: string;
  /** One of `images[].file`. */
  cover: string | null;
  images: TArticleImage[];
  sources: TArticleSource[];
  status: EArticleStatus;
  /** Temporarily `AI`. */
  reviewedBy: string | null;
  reviewedAt: Date | null;
  kbVersion: string;
  /** sha256 of the seed file and its images; detects changes between seeds. */
  contentHash: string;
  /** From the seed file. */
  updatedAt: Date;
};

export type TArticleProps = TArticleContent & {
  /** First seed; kept on revisions. */
  publishedAt: Date;
};

/** Markdown article about a crop disease, seeded from the crop pack. */
export class Article extends AggregateRoot {
  private constructor(
    id: string,
    private props: TArticleProps,
  ) {
    super(id);
  }

  static create(content: TArticleContent, publishedAt: Date): Article {
    return new Article(randomUUID(), { ...content, publishedAt });
  }

  static restore(id: string, props: TArticleProps): Article {
    return new Article(id, { ...props });
  }

  /** `/benh-cay-trong/<cropSlug>/<slug>`. */
  static pathOf(cropSlug: string, slug: string): string {
    return `${ARTICLE_PATH_PREFIX}/${cropSlug}/${slug}`;
  }

  /** Replaces the content with a newer seed; id and publishedAt stay. */
  revise(content: TArticleContent): void {
    this.props = { ...content, publishedAt: this.props.publishedAt };
  }

  path(cropSlug: string): string {
    return Article.pathOf(cropSlug, this.props.slug);
  }

  /** Listed in the sitemap. */
  isIndexable(): boolean {
    return this.props.status === EArticleStatus.REVIEWED;
  }

  coverImage(): TArticleImage | null {
    if (!this.props.cover) return null;
    return this.props.images.find((i) => i.file === this.props.cover) ?? null;
  }

  /** Images in order of appearance in the body, then the ones the body does not show (e.g. cover only). */
  imagesInOrder(): TArticleImage[] {
    const byFile = new Map(this.props.images.map((i) => [i.file, i]));
    const shown = imageFilesInOrder(this.props.markdown)
      .map((file) => byFile.get(file))
      .filter((i): i is TArticleImage => i !== undefined);
    const rest = this.props.images.filter((i) => !shown.includes(i));
    return [...shown, ...rest];
  }

  get cropType(): string {
    return this.props.cropType;
  }

  get diseaseCode(): string | null {
    return this.props.diseaseCode;
  }

  get slug(): string {
    return this.props.slug;
  }

  get title(): string {
    return this.props.title;
  }

  get summary(): string {
    return this.props.summary;
  }

  get markdown(): string {
    return this.props.markdown;
  }

  get cover(): string | null {
    return this.props.cover;
  }

  get images(): TArticleImage[] {
    return this.props.images;
  }

  get sources(): TArticleSource[] {
    return this.props.sources;
  }

  get status(): EArticleStatus {
    return this.props.status;
  }

  get reviewedBy(): string | null {
    return this.props.reviewedBy;
  }

  get reviewedAt(): Date | null {
    return this.props.reviewedAt;
  }

  get kbVersion(): string {
    return this.props.kbVersion;
  }

  get contentHash(): string {
    return this.props.contentHash;
  }

  get publishedAt(): Date {
    return this.props.publishedAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
