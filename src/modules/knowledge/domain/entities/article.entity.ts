import { createHash, randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EArticleOrigin } from '../enums/article-origin.enum';
import { EArticleStatus } from '../enums/article-status.enum';
import { KnowledgeArticleInvalidContentException } from '../exceptions/knowledge-article-invalid-content.exception';
import {
  ARTICLE_SLUG,
  ARTICLE_SLUG_MAX,
  articleContentIssues,
  TArticleKbCodes,
} from '../services/article-content-rules';
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
  /** Variant code of that disease (`<diseaseCode>__V<n>`) for a variant article; null = the disease's main article. */
  variantCode: string | null;
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
  /** First seed / creation; kept on revisions. */
  publishedAt: Date;
  origin: EArticleOrigin;
  /** Admin (user id) who created or last edited the content; null = never touched by an admin. */
  editedBy: string | null;
  /** Shown by the public API; an admin hides it with unpublish(). */
  isPublished: boolean;
};

/** What an admin writes: the content of the page. Slug, crop and KB code stay fixed once created. */
export type TArticleEditableContent = {
  title: string;
  summary: string;
  markdown: string;
  /** One of `images[].file`. */
  cover: string;
  images: TArticleImage[];
  sources: TArticleSource[];
};

export type TArticleAdminCreate = TArticleEditableContent & {
  cropType: string;
  diseaseCode: string;
  variantCode: string | null;
  slug: string;
  kbVersion: string;
};

const sha256 = (data: string): string =>
  createHash('sha256').update(data).digest('hex');

/** Throws KnowledgeArticleInvalidContentException unless the content follows the article rules. */
function assertValidContent(
  content: TArticleEditableContent,
  kb: TArticleKbCodes,
  cropType: string,
  slug: string,
): void {
  const issues = articleContentIssues(
    { ...content, imageFiles: content.images.map((image) => image.file) },
    kb,
    cropType,
  );
  if (!ARTICLE_SLUG.test(slug) || slug.length > ARTICLE_SLUG_MAX) {
    issues.unshift(
      `slug must match ${ARTICLE_SLUG.source} (max ${ARTICLE_SLUG_MAX})`,
    );
  }
  if (issues.length > 0)
    throw new KnowledgeArticleInvalidContentException(issues);
}

/** Markdown article about a crop disease, seeded from the crop pack. */
export class Article extends AggregateRoot {
  private constructor(
    id: string,
    private props: TArticleProps,
  ) {
    super(id);
  }

  /** Seeded from the crop pack: origin AI, published. */
  static create(content: TArticleContent, publishedAt: Date): Article {
    return new Article(randomUUID(), {
      ...content,
      publishedAt,
      origin: EArticleOrigin.AI,
      editedBy: null,
      isPublished: true,
    });
  }

  /** Written by an admin: origin ADMIN, REVIEWED by that admin, published. Content checked against the crop KB. */
  static createByAdmin(
    input: TArticleAdminCreate,
    kb: TArticleKbCodes,
    adminId: string,
    now: Date = new Date(),
  ): Article {
    const content = Article.trimmed(input);
    assertValidContent(content, kb, input.cropType, input.slug);
    return new Article(randomUUID(), {
      ...content,
      cropType: input.cropType,
      diseaseCode: input.diseaseCode,
      variantCode: input.variantCode,
      slug: input.slug,
      status: EArticleStatus.REVIEWED,
      reviewedBy: adminId,
      reviewedAt: now,
      kbVersion: input.kbVersion,
      contentHash: Article.hashOf(content),
      updatedAt: now,
      publishedAt: now,
      origin: EArticleOrigin.ADMIN,
      editedBy: adminId,
      isPublished: true,
    });
  }

  static restore(id: string, props: TArticleProps): Article {
    return new Article(id, { ...props });
  }

  /** `/benh-cay-trong/<cropSlug>/<slug>`. */
  static pathOf(cropSlug: string, slug: string): string {
    return `${ARTICLE_PATH_PREFIX}/${cropSlug}/${slug}`;
  }

  /** Replaces the content with a newer seed; id, publishedAt, origin and visibility stay. Only for seed-managed articles. */
  revise(content: TArticleContent): void {
    if (!this.isSeedManaged()) {
      throw new Error(
        `Article ${this.id} is edited by an admin; the seed must skip it`,
      );
    }
    this.props = {
      ...content,
      publishedAt: this.props.publishedAt,
      origin: this.props.origin,
      editedBy: this.props.editedBy,
      isPublished: this.props.isPublished,
    };
  }

  /**
   * An admin replaces the page content (slug, crop and KB code stay): REVIEWED by that admin;
   * an AI article becomes AI_REVIEWED (the seed stops touching it). Content checked against the crop KB.
   */
  editContent(
    input: TArticleEditableContent,
    kb: TArticleKbCodes,
    adminId: string,
    now: Date = new Date(),
  ): void {
    const content = Article.trimmed(input);
    assertValidContent(content, kb, this.props.cropType, this.props.slug);
    this.props = {
      ...this.props,
      ...content,
      status: EArticleStatus.REVIEWED,
      reviewedBy: adminId,
      reviewedAt: now,
      contentHash: Article.hashOf(content),
      updatedAt: now,
      origin:
        this.props.origin === EArticleOrigin.AI
          ? EArticleOrigin.AI_REVIEWED
          : this.props.origin,
      editedBy: adminId,
    };
  }

  /** Hides the article from the public API; false when it was already hidden. */
  unpublish(): boolean {
    if (!this.props.isPublished) return false;
    this.props.isPublished = false;
    return true;
  }

  /** Shows the article again; false when it was already shown. */
  publish(): boolean {
    if (this.props.isPublished) return false;
    this.props.isPublished = true;
    return true;
  }

  /** Origin AI: the crop pack is its source (revised / deleted by the seed). */
  isSeedManaged(): boolean {
    return this.props.origin === EArticleOrigin.AI;
  }

  private static trimmed(
    input: TArticleEditableContent,
  ): TArticleEditableContent {
    return {
      title: input.title.trim(),
      summary: input.summary.trim(),
      markdown: input.markdown,
      cover: input.cover,
      images: input.images,
      sources: input.sources,
    };
  }

  private static hashOf(content: TArticleEditableContent): string {
    return sha256(JSON.stringify(content));
  }

  path(cropSlug: string): string {
    return Article.pathOf(cropSlug, this.props.slug);
  }

  /** Listed in the sitemap: REVIEWED and published. */
  isIndexable(): boolean {
    return (
      this.props.status === EArticleStatus.REVIEWED && this.props.isPublished
    );
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

  get variantCode(): string | null {
    return this.props.variantCode;
  }

  /** KB code the article is about: the variant code, else the disease code. */
  get kbCode(): string | null {
    return this.props.variantCode ?? this.props.diseaseCode;
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

  get origin(): EArticleOrigin {
    return this.props.origin;
  }

  get editedBy(): string | null {
    return this.props.editedBy;
  }

  get isPublished(): boolean {
    return this.props.isPublished;
  }
}
