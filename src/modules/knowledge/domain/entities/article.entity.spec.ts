import { EArticleOrigin } from '../enums/article-origin.enum';
import { EArticleStatus } from '../enums/article-status.enum';
import { KnowledgeArticleInvalidContentException } from '../exceptions/knowledge-article-invalid-content.exception';
import { TArticleKbCodes } from '../services/article-content-rules';
import {
  Article,
  TArticleAdminCreate,
  TArticleContent,
  TArticleEditableContent,
  TArticleImage,
} from './article.entity';

const image = (file: string): TArticleImage => ({
  file,
  key: `articles/RICE/RICE_BLAST/${file.replace('.webp', '')}.1234abcd.webp`,
  width: 800,
  height: 600,
  alt: `alt ${file}`,
  caption: null,
  credit: {
    source: 'S',
    author: 'A',
    license: 'CC BY 4.0',
    url: 'https://x.test',
  },
});

const content = (
  overrides: Partial<TArticleContent> = {},
): TArticleContent => ({
  cropType: 'RICE',
  diseaseCode: 'RICE_BLAST',
  variantCode: null,
  slug: 'benh-dao-on',
  title: 'Bệnh đạo ôn',
  summary: 'Tóm tắt',
  markdown: 'Mở đầu\n\n![b](b.webp)\n\n![a](a.webp)\n',
  cover: 'c.webp',
  images: [image('a.webp'), image('b.webp'), image('c.webp')],
  sources: [{ title: 'VIPA', url: 'https://vipa.vn' }],
  status: EArticleStatus.REVIEWED,
  reviewedBy: 'AI',
  reviewedAt: new Date('2026-10-16'),
  kbVersion: '2026-10-12',
  contentHash: 'hash-1',
  updatedAt: new Date('2026-10-16'),
  ...overrides,
});

describe('Article', () => {
  it('create() assigns an id and the publish date', () => {
    const publishedAt = new Date('2026-10-17T00:00:00Z');

    const article = Article.create(content(), publishedAt);

    expect(article.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(article.publishedAt).toEqual(publishedAt);
    expect(article.slug).toBe('benh-dao-on');
    expect(article.contentHash).toBe('hash-1');
  });

  it('revise() replaces the content but keeps id and publishedAt', () => {
    const publishedAt = new Date('2026-10-17T00:00:00Z');
    const article = Article.create(content(), publishedAt);
    const id = article.id;

    article.revise(content({ slug: 'dao-on', contentHash: 'hash-2' }));

    expect(article.id).toBe(id);
    expect(article.publishedAt).toEqual(publishedAt);
    expect(article.slug).toBe('dao-on');
    expect(article.contentHash).toBe('hash-2');
  });

  it('path() puts the crop slug and article slug under /benh-cay-trong', () => {
    const article = Article.create(content(), new Date());

    expect(article.path('lua')).toBe('/benh-cay-trong/lua/benh-dao-on');
    expect(Article.pathOf('sau-rieng', 'xi-mu')).toBe(
      '/benh-cay-trong/sau-rieng/xi-mu',
    );
  });

  it('isIndexable() only for REVIEWED', () => {
    expect(Article.create(content(), new Date()).isIndexable()).toBe(true);
    expect(
      Article.create(
        content({
          status: EArticleStatus.DRAFT,
          reviewedBy: null,
          reviewedAt: null,
        }),
        new Date(),
      ).isIndexable(),
    ).toBe(false);
  });

  it('coverImage() returns the cover entry, or null without a cover', () => {
    expect(Article.create(content(), new Date()).coverImage()?.file).toBe(
      'c.webp',
    );
    expect(
      Article.create(content({ cover: null }), new Date()).coverImage(),
    ).toBeNull();
  });

  it('imagesInOrder() follows the body, then images the body does not show', () => {
    const article = Article.create(content(), new Date());

    expect(article.imagesInOrder().map((i) => i.file)).toEqual([
      'b.webp',
      'a.webp',
      'c.webp',
    ]);
  });

  it('kbCode is the variant code of a variant article, else the disease code', () => {
    expect(Article.create(content(), new Date()).kbCode).toBe('RICE_BLAST');
    const variant = Article.create(
      content({ variantCode: 'RICE_BLAST__V1', slug: 'benh-dao-on-la' }),
      new Date(),
    );
    expect(variant.variantCode).toBe('RICE_BLAST__V1');
    expect(variant.diseaseCode).toBe('RICE_BLAST');
    expect(variant.kbCode).toBe('RICE_BLAST__V1');
    expect(
      Article.create(content({ diseaseCode: null }), new Date()).kbCode,
    ).toBeNull();
  });

  it('isIndexable() is false once unpublished', () => {
    const article = Article.create(content(), new Date());
    article.unpublish();
    expect(article.isIndexable()).toBe(false);
  });
});

const kb: TArticleKbCodes = {
  diseases: new Set(['RICE_BLAST', 'RICE_BROWN_SPOT']),
  variantOf: new Map([['RICE_BLAST__V1', 'RICE_BLAST']]),
};
const SUMMARY =
  'Cách nhận biết và phòng trừ bệnh đạo ôn trên lúa ở từng giai đoạn.';
const ADMIN = '6f1c2f0e-9a51-4d7e-9a43-6f7f6a1f3a11';

const editable = (
  overrides: Partial<TArticleEditableContent> = {},
): TArticleEditableContent => ({
  title: ' Bệnh đạo ôn ',
  summary: SUMMARY,
  markdown: 'Xem [đốm nâu](/diseases/RICE_BROWN_SPOT).\n\n![a](a.webp)\n',
  cover: 'a.webp',
  images: [image('a.webp')],
  sources: [{ title: 'VIPA', url: 'https://vipa.vn' }],
  ...overrides,
});

const adminCreate = (
  overrides: Partial<TArticleAdminCreate> = {},
): TArticleAdminCreate => ({
  ...editable(),
  cropType: 'RICE',
  diseaseCode: 'RICE_BLAST',
  variantCode: null,
  slug: 'benh-dao-on',
  kbVersion: '2026-10-12',
  ...overrides,
});

describe('Article (origin and visibility)', () => {
  it('create() is a published AI article no admin touched', () => {
    const article = Article.create(content(), new Date());

    expect(article.origin).toBe(EArticleOrigin.AI);
    expect(article.editedBy).toBeNull();
    expect(article.isPublished).toBe(true);
    expect(article.isSeedManaged()).toBe(true);
  });

  it('createByAdmin() is a published ADMIN article reviewed by the admin', () => {
    const now = new Date('2026-10-18T00:00:00Z');

    const article = Article.createByAdmin(adminCreate(), kb, ADMIN, now);

    expect(article.origin).toBe(EArticleOrigin.ADMIN);
    expect(article.editedBy).toBe(ADMIN);
    expect(article.isPublished).toBe(true);
    expect(article.isSeedManaged()).toBe(false);
    expect(article.status).toBe(EArticleStatus.REVIEWED);
    expect(article.reviewedBy).toBe(ADMIN);
    expect(article.reviewedAt).toEqual(now);
    expect(article.publishedAt).toEqual(now);
    expect(article.updatedAt).toEqual(now);
    expect(article.title).toBe('Bệnh đạo ôn');
    expect(article.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('createByAdmin() rejects invalid content with every issue', () => {
    const create = (): Article =>
      Article.createByAdmin(
        adminCreate({
          slug: 'Bệnh Đạo Ôn',
          summary: 'ngắn',
          cover: 'x.webp',
          markdown: '[x](/diseases/DURIAN_X) <b>đậm</b>',
        }),
        kb,
        ADMIN,
      );

    expect(create).toThrow(KnowledgeArticleInvalidContentException);
    try {
      create();
    } catch (error) {
      expect(
        (error as KnowledgeArticleInvalidContentException).details,
      ).toEqual({
        issues: [
          expect.stringMatching(/^slug must match/),
          'summary must be 50-160 characters',
          'cover x.webp is not listed in images',
          'disease DURIAN_X is not in the RICE KB',
          'HTML tags are not allowed',
        ],
      });
    }
  });

  it('editContent() turns an AI article into AI_REVIEWED, keeping slug and codes', () => {
    const article = Article.create(content(), new Date('2026-10-17'));
    const now = new Date('2026-10-18T00:00:00Z');

    article.editContent(editable({ title: 'Đạo ôn lúa' }), kb, ADMIN, now);

    expect(article.origin).toBe(EArticleOrigin.AI_REVIEWED);
    expect(article.isSeedManaged()).toBe(false);
    expect(article.editedBy).toBe(ADMIN);
    expect(article.title).toBe('Đạo ôn lúa');
    expect(article.slug).toBe('benh-dao-on');
    expect(article.diseaseCode).toBe('RICE_BLAST');
    expect(article.status).toBe(EArticleStatus.REVIEWED);
    expect(article.reviewedBy).toBe(ADMIN);
    expect(article.reviewedAt).toEqual(now);
    expect(article.updatedAt).toEqual(now);
    expect(article.publishedAt).toEqual(new Date('2026-10-17'));
    expect(article.contentHash).not.toBe('hash-1');
  });

  it('editContent() keeps the ADMIN origin and visibility', () => {
    const article = Article.createByAdmin(adminCreate(), kb, ADMIN);
    article.unpublish();

    article.editContent(editable(), kb, 'other-admin');

    expect(article.origin).toBe(EArticleOrigin.ADMIN);
    expect(article.editedBy).toBe('other-admin');
    expect(article.isPublished).toBe(false);
  });

  it('editContent() rejects invalid content and changes nothing', () => {
    const article = Article.create(content(), new Date());

    expect(() =>
      article.editContent(editable({ cover: 'x.webp' }), kb, ADMIN),
    ).toThrow(KnowledgeArticleInvalidContentException);
    expect(article.origin).toBe(EArticleOrigin.AI);
    expect(article.title).toBe('Bệnh đạo ôn');
  });

  it('unpublish() / publish() toggle visibility and report a change', () => {
    const article = Article.create(content(), new Date());

    expect(article.unpublish()).toBe(true);
    expect(article.isPublished).toBe(false);
    expect(article.unpublish()).toBe(false);
    expect(article.publish()).toBe(true);
    expect(article.isPublished).toBe(true);
    expect(article.publish()).toBe(false);
  });

  it('revise() keeps origin and visibility of a seed-managed article', () => {
    const article = Article.create(content(), new Date());
    article.unpublish();

    article.revise(content({ contentHash: 'hash-2' }));

    expect(article.isPublished).toBe(false);
    expect(article.origin).toBe(EArticleOrigin.AI);
  });

  it('revise() refuses an article an admin edited', () => {
    const article = Article.create(content(), new Date());
    article.editContent(editable(), kb, ADMIN);

    expect(() => article.revise(content())).toThrow(/edited by an admin/);
  });
});
