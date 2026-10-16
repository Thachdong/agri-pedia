import {
  diseaseCardCodes,
  imageFilesInOrder,
  referencedDiseaseCodes,
  resolveArticleMarkdown,
} from './article-markdown-resolver';

const links = {
  imageUrl: (file: string) =>
    file === 'dao-on-1.webp'
      ? 'https://cdn.test/articles/dao-on-1.abcd1234.webp'
      : undefined,
  diseasePath: (code: string) =>
    code === 'RICE_BROWN_SPOT' ? '/benh-cay-trong/lua/benh-dom-nau' : undefined,
};

describe('resolveArticleMarkdown', () => {
  it('replaces image file names with their public URL', () => {
    expect(resolveArticleMarkdown('![Vết bệnh](dao-on-1.webp)', links)).toBe(
      '![Vết bệnh](https://cdn.test/articles/dao-on-1.abcd1234.webp)',
    );
  });

  it('leaves an image without a known URL as written', () => {
    expect(resolveArticleMarkdown('![x](unknown.webp)', links)).toBe(
      '![x](unknown.webp)',
    );
  });

  it('points a disease link to the article path of that disease', () => {
    expect(
      resolveArticleMarkdown(
        '| [Bệnh đốm nâu](/diseases/RICE_BROWN_SPOT) |',
        links,
      ),
    ).toBe('| [Bệnh đốm nâu](/benh-cay-trong/lua/benh-dom-nau) |');
  });

  it('drops the link but keeps the text when the disease has no article', () => {
    expect(
      resolveArticleMarkdown(
        'Xem [bệnh đốm gạch](/diseases/RICE_NARROW_BROWN_SPOT).',
        links,
      ),
    ).toBe('Xem bệnh đốm gạch.');
  });

  it('keeps directives', () => {
    const markdown =
      '::disease-card{code="RICE_BROWN_SPOT"}\n\n::cta-diagnosis';

    expect(resolveArticleMarkdown(markdown, links)).toBe(markdown);
  });

  it('does not touch fenced code blocks or inline code', () => {
    const markdown = [
      '```',
      '[a](/diseases/RICE_BROWN_SPOT) ![b](dao-on-1.webp)',
      '```',
      'Inline `[a](/diseases/RICE_BROWN_SPOT)` and [a](/diseases/RICE_BROWN_SPOT)',
    ].join('\n');

    expect(resolveArticleMarkdown(markdown, links)).toBe(
      [
        '```',
        '[a](/diseases/RICE_BROWN_SPOT) ![b](dao-on-1.webp)',
        '```',
        'Inline `[a](/diseases/RICE_BROWN_SPOT)` and [a](/benh-cay-trong/lua/benh-dom-nau)',
      ].join('\n'),
    );
  });
});

describe('article markdown scanners', () => {
  const markdown = [
    '![b](b.webp) [x](/diseases/RICE_BROWN_SPOT) ![a](a.webp) ![b again](b.webp)',
    '::disease-card{code="RICE_NARROW_BROWN_SPOT"}',
    '::disease-card{code="RICE_BROWN_SPOT"}',
    '`::disease-card{code="RICE_IN_CODE"}` `![c](c.webp)`',
  ].join('\n');

  it('imageFilesInOrder() lists image files by first appearance, outside code', () => {
    expect(imageFilesInOrder(markdown)).toEqual(['b.webp', 'a.webp']);
  });

  it('diseaseCardCodes() lists card codes in order, outside code', () => {
    expect(diseaseCardCodes(markdown)).toEqual([
      'RICE_NARROW_BROWN_SPOT',
      'RICE_BROWN_SPOT',
    ]);
  });

  it('referencedDiseaseCodes() merges linked and card codes without duplicates', () => {
    expect(referencedDiseaseCodes(markdown)).toEqual([
      'RICE_BROWN_SPOT',
      'RICE_NARROW_BROWN_SPOT',
    ]);
  });
});
