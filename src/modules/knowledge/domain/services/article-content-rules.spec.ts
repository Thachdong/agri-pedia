import {
  articleContentIssues,
  TArticleCheckedContent,
  TArticleKbCodes,
} from './article-content-rules';

const kb: TArticleKbCodes = {
  diseases: new Set(['RICE_BLAST', 'RICE_BROWN_SPOT']),
  variantOf: new Map([['RICE_BLAST__V1', 'RICE_BLAST']]),
};

const valid = (
  overrides: Partial<TArticleCheckedContent> = {},
): TArticleCheckedContent => ({
  title: 'Bệnh đạo ôn',
  summary: 'Cách nhận biết và phòng trừ bệnh đạo ôn trên lúa ở từng giai đoạn.',
  markdown: [
    'Xem [đạo ôn lá](/diseases/RICE_BLAST__V1).',
    '::disease-card{code="RICE_BROWN_SPOT"}',
    '![Vết bệnh](a.webp)',
    '`<b>` trong code được phép.',
  ].join('\n\n'),
  cover: 'b.webp',
  imageFiles: ['a.webp', 'b.webp'],
  ...overrides,
});

describe('articleContentIssues', () => {
  it('accepts valid content', () => {
    expect(articleContentIssues(valid(), kb, 'RICE')).toEqual([]);
  });

  it.each<[string, Partial<TArticleCheckedContent>, string]>([
    ['empty title', { title: '  ' }, 'title must be 1-70 characters'],
    ['long title', { title: 'x'.repeat(71) }, 'title must be 1-70 characters'],
    ['short summary', { summary: 'ngắn' }, 'summary must be 50-160 characters'],
    [
      'bad image file name',
      { imageFiles: ['a.webp', 'b.webp', 'Anh.png'] },
      'image file Anh.png must match ^[a-z0-9-]+\\.webp$',
    ],
    [
      'duplicate image file',
      { imageFiles: ['a.webp', 'b.webp', 'a.webp'] },
      'image file a.webp is listed twice',
    ],
    [
      'unknown cover',
      { cover: 'x.webp' },
      'cover x.webp is not listed in images',
    ],
    [
      'unlisted body image',
      { markdown: '![x](x.webp)' },
      'image x.webp is not listed in images',
    ],
    [
      'link outside the crop KB',
      { markdown: '[x](/diseases/DURIAN_X)' },
      'disease DURIAN_X is not in the RICE KB',
    ],
    [
      'disease card of a variant',
      { markdown: '::disease-card{code="RICE_BLAST__V1"}' },
      'disease-card RICE_BLAST__V1 must be a disease id, not a variant',
    ],
    [
      'HTML outside code',
      { markdown: 'a <br> b' },
      'HTML tags are not allowed',
    ],
  ])('reports %s', (_name, overrides, issue) => {
    expect(articleContentIssues(valid(overrides), kb, 'RICE')).toEqual([issue]);
  });
});
