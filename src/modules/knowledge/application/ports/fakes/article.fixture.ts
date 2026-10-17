import { createHash, randomUUID } from 'node:crypto';
import {
  Article,
  EArticleOrigin,
  EArticleStatus,
  TArticleProps,
} from '../../../domain';
import { TArticleSeed, TArticleSeedImage } from '../article-source';

const sha256 = (data: string | Buffer): string =>
  createHash('sha256').update(data).digest('hex');

/** Test helper: an article image whose content (and so hash) is `content`. */
export function buildArticleSeedImage(
  file: string,
  content = file,
): TArticleSeedImage {
  const buffer = Buffer.from(content);
  return {
    file,
    content: buffer,
    sha256: sha256(buffer),
    width: 800,
    height: 600,
    alt: `Ảnh ${file}`,
    caption: null,
    credit: {
      source: 'Dataset',
      author: 'Tác giả',
      license: 'CC BY 4.0',
      url: 'https://example.test/dataset',
    },
  };
}

/** Test helper: a REVIEWED RICE_BLAST article seed; `contentHash` follows the other props unless overridden. */
export function buildArticleSeed(
  overrides: Partial<TArticleSeed> = {},
): TArticleSeed {
  const seed: TArticleSeed = {
    cropType: 'RICE',
    diseaseCode: 'RICE_BLAST',
    variantCode: null,
    slug: 'benh-dao-on',
    title: 'Bệnh đạo ôn lúa',
    summary: 'Cách nhận biết và phòng bệnh đạo ôn trên lúa.',
    markdown: 'Mở đầu\n\n![Vết bệnh](dao-on-1.webp)\n',
    cover: 'dao-on-1.webp',
    images: [buildArticleSeedImage('dao-on-1.webp')],
    sources: [{ title: 'VIPA', url: 'https://vipa.vn' }],
    status: EArticleStatus.REVIEWED,
    reviewedBy: 'AI',
    reviewedAt: new Date('2026-10-16T00:00:00Z'),
    kbVersion: '2026-10-12',
    updatedAt: new Date('2026-10-16T00:00:00Z'),
    contentHash: '',
    ...overrides,
  };
  if (overrides.contentHash) return seed;
  const fields = { ...seed, images: seed.images.map((i) => i.sha256) };
  return { ...seed, contentHash: sha256(JSON.stringify(fields)) };
}

/** Test helper: a stored REVIEWED, published AI RICE_BLAST article (cover `dao-on-1.webp`); override any prop. */
export function buildArticle(
  overrides: Partial<TArticleProps> & { id?: string } = {},
): Article {
  const { id = randomUUID(), ...props } = overrides;
  return Article.restore(id, {
    cropType: 'RICE',
    diseaseCode: 'RICE_BLAST',
    variantCode: null,
    slug: 'benh-dao-on',
    title: 'Bệnh đạo ôn lúa',
    summary: 'Cách nhận biết và phòng bệnh đạo ôn trên lúa.',
    markdown: 'Mở đầu\n\n![Vết bệnh](dao-on-1.webp)\n',
    cover: 'dao-on-1.webp',
    images: [
      {
        file: 'dao-on-1.webp',
        key: 'articles/RICE/RICE_BLAST/dao-on-1.1234abcd.webp',
        width: 800,
        height: 600,
        alt: 'Vết bệnh',
        caption: null,
        credit: {
          source: 'Dataset',
          author: 'Tác giả',
          license: 'CC BY 4.0',
          url: 'https://example.test/dataset',
        },
      },
    ],
    sources: [{ title: 'VIPA', url: 'https://vipa.vn' }],
    status: EArticleStatus.REVIEWED,
    reviewedBy: 'AI',
    reviewedAt: new Date('2026-10-16T00:00:00Z'),
    kbVersion: '2026-10-12',
    contentHash: 'hash',
    publishedAt: new Date('2026-10-17T00:00:00Z'),
    updatedAt: new Date('2026-10-16T00:00:00Z'),
    origin: EArticleOrigin.AI,
    editedBy: null,
    isPublished: true,
    ...props,
  });
}
