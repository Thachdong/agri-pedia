import { EArticleStatus } from '../enums/article-status.enum';
import { Article, TArticleContent, TArticleImage } from './article.entity';

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
});
