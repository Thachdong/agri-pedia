import { cp, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as sharp from 'sharp';
import { FileArticleSource } from './file-article.source';

const CROPS = join(__dirname, 'crops');

const FRONTMATTER = {
  code: 'RICE_BLAST',
  crop: 'RICE',
  slug: 'benh-dao-on',
  title: '"Bệnh đạo ôn lúa"',
  summary:
    '"Cách nhận biết bệnh đạo ôn trên lá, cổ bông và đốt thân lúa và các biện pháp phòng bệnh."',
  status: 'REVIEWED',
  reviewedBy: 'AI',
  reviewedAt: '2026-10-16',
  kbVersion: '2026-10-12',
  cover: 'dao-on-1.webp',
  updatedAt: '2026-10-16',
};

const IMAGES = `images:
  - file: dao-on-1.webp
    alt: "Vết đạo ôn hình thoi"
    credit:
      source: "Dataset"
      author: "Tác giả"
      license: "CC BY 4.0"
      url: "https://example.test/dataset"`;

const BODY = [
  'Mở đầu.',
  '',
  '![Vết đạo ôn hình thoi](dao-on-1.webp)',
  '',
  '[Bệnh đốm nâu](/diseases/RICE_BROWN_SPOT)',
  '',
  '::disease-card{code="RICE_NARROW_BROWN_SPOT"}',
].join('\n');

type TArticleFile = {
  frontmatter?: Record<string, string | null>;
  images?: string;
  body?: string;
};

function articleText({
  frontmatter = {},
  images = IMAGES,
  body = BODY,
}: TArticleFile = {}): string {
  const meta = { ...FRONTMATTER, ...frontmatter };
  const lines = Object.entries(meta)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value === null ? 'null' : value}`);
  return `---\n${lines.join('\n')}\n${images}\n---\n\n${body}\n`;
}

async function webp(color = 'red'): Promise<Buffer> {
  return sharp({
    create: { width: 40, height: 30, channels: 3, background: color },
  })
    .webp()
    .toBuffer();
}

/**
 * Temp `crops/` with the shipped RICE diseases.json and the given article files
 * (`name` → content) plus images (`CODE/file` → content).
 */
async function packWith(
  articles: Record<string, string>,
  images: Record<string, Buffer> = {},
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'articles-'));
  await mkdir(join(dir, 'RICE', 'articles', 'images'), { recursive: true });
  await cp(
    join(CROPS, 'RICE', 'diseases.json'),
    join(dir, 'RICE', 'diseases.json'),
  );
  for (const [name, content] of Object.entries(articles)) {
    await writeFile(join(dir, 'RICE', 'articles', name), content);
  }
  for (const [path, content] of Object.entries(images)) {
    const target = join(dir, 'RICE', 'articles', 'images', path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}

async function validPack(file: TArticleFile = {}): Promise<string> {
  return packWith(
    { 'RICE_BLAST.md': articleText(file) },
    { 'RICE_BLAST/dao-on-1.webp': await webp() },
  );
}

async function expectRejected(dir: string, message: string): Promise<void> {
  await expect(new FileArticleSource(dir).load()).rejects.toThrow(message);
}

describe('FileArticleSource (shipped crop packs)', () => {
  it('loads every shipped article', async () => {
    const seeds = await new FileArticleSource().load();

    expect(seeds.map((s) => [s.cropType, s.diseaseCode])).toEqual(
      expect.arrayContaining([
        ['RICE', 'RICE_BLAST'],
        ['DURIAN', 'DURIAN_PHYTOPHTHORA_CANKER'],
      ]),
    );
  });
});

describe('FileArticleSource (valid pack)', () => {
  it('reads frontmatter, body without frontmatter and image data', async () => {
    const image = await webp();
    const dir = await packWith(
      { 'RICE_BLAST.md': articleText() },
      { 'RICE_BLAST/dao-on-1.webp': image },
    );

    const [seed] = await new FileArticleSource(dir).load();

    expect(seed).toMatchObject({
      cropType: 'RICE',
      diseaseCode: 'RICE_BLAST',
      slug: 'benh-dao-on',
      title: 'Bệnh đạo ôn lúa',
      status: 'REVIEWED',
      reviewedBy: 'AI',
      reviewedAt: new Date('2026-10-16'),
      kbVersion: '2026-10-12',
      cover: 'dao-on-1.webp',
      sources: [],
      updatedAt: new Date('2026-10-16'),
    });
    expect(seed.markdown).toBe(`${BODY}\n`);
    expect(seed.images).toEqual([
      expect.objectContaining({
        file: 'dao-on-1.webp',
        content: image,
        width: 40,
        height: 30,
        caption: null,
      }),
    ]);
    expect(seed.contentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes the content hash when only an image changes', async () => {
    const before = await new FileArticleSource(await validPack()).load();
    const after = await new FileArticleSource(
      await packWith(
        { 'RICE_BLAST.md': articleText() },
        { 'RICE_BLAST/dao-on-1.webp': await webp('blue') },
      ),
    ).load();

    expect(after[0].contentHash).not.toBe(before[0].contentHash);
  });

  it('skips crops without an articles folder', async () => {
    const dir = await validPack();
    await mkdir(join(dir, 'DURIAN'));

    expect(await new FileArticleSource(dir).load()).toHaveLength(1);
  });

  it('ignores codes inside code blocks', async () => {
    const dir = await validPack({
      body: `${BODY}\n\n\`\`\`\n[x](/diseases/CORN_RUST) <b>\n\`\`\``,
    });

    await expect(new FileArticleSource(dir).load()).resolves.toHaveLength(1);
  });
});

describe('FileArticleSource (invalid article)', () => {
  it('rejects a file name that differs from the code', async () => {
    const dir = await packWith(
      { 'RICE_OTHER.md': articleText() },
      { 'RICE_BLAST/dao-on-1.webp': await webp() },
    );

    await expectRejected(
      dir,
      'crops/RICE/articles/RICE_OTHER.md: file name must be RICE_BLAST.md',
    );
  });

  it('rejects a crop that differs from the folder', async () => {
    await expectRejected(
      await validPack({ frontmatter: { crop: 'DURIAN' } }),
      'crops/RICE/articles/RICE_BLAST.md: crop DURIAN must be RICE',
    );
  });

  it('rejects a code missing from the crop KB', async () => {
    const dir = await packWith({
      'RICE_NOPE.md': articleText({
        frontmatter: { code: 'RICE_NOPE', cover: null },
        images: 'images: []',
        body: 'Mở đầu.',
      }),
    });

    await expectRejected(
      dir,
      'code RICE_NOPE is not a disease or variant in diseases.json',
    );
  });

  it('rejects a slug used twice in the crop', async () => {
    const dir = await packWith(
      {
        'RICE_BLAST.md': articleText(),
        'RICE_BROWN_SPOT.md': articleText({
          frontmatter: { code: 'RICE_BROWN_SPOT', cover: null },
          images: 'images: []',
          body: 'Mở đầu.',
        }),
      },
      { 'RICE_BLAST/dao-on-1.webp': await webp() },
    );

    await expectRejected(
      dir,
      'RICE_BROWN_SPOT.md: slug benh-dao-on is also used by RICE_BLAST.md',
    );
  });

  it('rejects an invalid frontmatter field', async () => {
    await expectRejected(
      await validPack({ frontmatter: { slug: 'Bệnh-Đạo-Ôn' } }),
      'crops/RICE/articles/RICE_BLAST.md: slug:',
    );
  });

  it('rejects REVIEWED without a reviewer', async () => {
    await expectRejected(
      await validPack({ frontmatter: { reviewedBy: null } }),
      'REVIEWED needs reviewedBy + reviewedAt',
    );
  });

  it('rejects a file without frontmatter', async () => {
    const dir = await packWith({ 'RICE_BLAST.md': 'Chỉ có thân bài.' });

    await expectRejected(dir, 'missing --- frontmatter ---');
  });

  it('rejects a cover that is not an image of the article', async () => {
    await expectRejected(
      await validPack({ frontmatter: { cover: 'khac.webp' } }),
      'cover khac.webp is not listed in images',
    );
  });

  it('rejects a listed image without its file', async () => {
    const dir = await packWith({ 'RICE_BLAST.md': articleText() });

    await expectRejected(
      dir,
      'image file images/RICE_BLAST/dao-on-1.webp is missing',
    );
  });

  it('rejects an image file that is not webp', async () => {
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    const dir = await packWith(
      { 'RICE_BLAST.md': articleText() },
      { 'RICE_BLAST/dao-on-1.webp': png },
    );

    await expectRejected(dir, 'image dao-on-1.webp is not a webp image');
  });

  it('rejects a body image that is not listed', async () => {
    await expectRejected(
      await validPack({ body: `${BODY}\n\n![Khác](khac.webp)` }),
      'image khac.webp is not listed in images',
    );
  });

  it('rejects a link to a disease of another crop', async () => {
    await expectRejected(
      await validPack({
        body: `${BODY}\n\n[Xì mủ](/diseases/DURIAN_ROOT_ROT)`,
      }),
      'disease DURIAN_ROOT_ROT is not in the RICE KB',
    );
  });

  it('rejects a disease card of an unknown code', async () => {
    await expectRejected(
      await validPack({ body: `${BODY}\n\n::disease-card{code="RICE_NOPE"}` }),
      'disease RICE_NOPE is not in the RICE KB',
    );
  });

  it('loads a variant article under its disease, with links to variant ids', async () => {
    const variant = articleText({
      frontmatter: {
        code: 'RICE_BLAST__V1',
        slug: 'benh-dao-on-la',
        cover: null,
      },
      images: 'images: []',
      body: 'Xem [bài chính](/diseases/RICE_BLAST) và [cổ bông](/diseases/RICE_BLAST__V2).',
    });
    const dir = await packWith(
      {
        'RICE_BLAST.md': articleText({
          body: `${BODY}\n\nChi tiết: [Đạo ôn lá](/diseases/RICE_BLAST__V1)`,
        }),
        'RICE_BLAST__V1.md': variant,
      },
      { 'RICE_BLAST/dao-on-1.webp': await webp() },
    );

    const seeds = await new FileArticleSource(dir).load();

    expect(seeds.map((s) => [s.slug, s.diseaseCode, s.variantCode])).toEqual([
      ['benh-dao-on', 'RICE_BLAST', null],
      ['benh-dao-on-la', 'RICE_BLAST', 'RICE_BLAST__V1'],
    ]);
  });

  it('rejects a variant article without the main article of its disease', async () => {
    const dir = await packWith({
      'RICE_BLAST__V1.md': articleText({
        frontmatter: { code: 'RICE_BLAST__V1', cover: null },
        images: 'images: []',
        body: 'Mở đầu.',
      }),
    });

    await expectRejected(
      dir,
      'variant article needs the main article RICE_BLAST.md',
    );
  });

  it('rejects a disease card of a variant id', async () => {
    await expectRejected(
      await validPack({
        body: `${BODY}\n\n::disease-card{code="RICE_BLAST__V1"}`,
      }),
      'disease-card RICE_BLAST__V1 must be a disease id, not a variant',
    );
  });

  it('rejects HTML tags outside code', async () => {
    await expectRejected(
      await validPack({ body: `${BODY}\n\n<div>khung</div>` }),
      'HTML tags are not allowed',
    );
  });
});
