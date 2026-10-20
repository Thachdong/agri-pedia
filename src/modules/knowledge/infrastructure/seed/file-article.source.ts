import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as sharp from 'sharp';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import {
  IArticleSource,
  TArticleSeed,
  TArticleSeedImage,
} from '../../application/ports';
import {
  ARTICLE_IMAGE_FILE,
  ARTICLE_SLUG,
  ARTICLE_SLUG_MAX,
  ARTICLE_SUMMARY_MAX,
  ARTICLE_SUMMARY_MIN,
  ARTICLE_TITLE_MAX,
  articleContentIssues,
  EArticleStatus,
  TArticleImageCredit,
  TArticleKbCodes,
  TArticleSource,
} from '../../domain';

const credit = z.object({
  source: z.string().min(1),
  author: z.string().min(1),
  license: z.string().min(1),
  url: z.string().url(),
});

const articleFrontmatter = z
  .object({
    code: z.string(),
    crop: z.string(),
    slug: z.string().regex(ARTICLE_SLUG).max(ARTICLE_SLUG_MAX),
    title: z.string().min(1).max(ARTICLE_TITLE_MAX),
    summary: z.string().min(ARTICLE_SUMMARY_MIN).max(ARTICLE_SUMMARY_MAX),
    status: z.nativeEnum(EArticleStatus),
    reviewedBy: z.string().min(1).nullable(),
    reviewedAt: z.coerce.date().nullable(),
    kbVersion: z.string(),
    /** Reference image (cards, related articles, Open Graph); one of `images[].file`. */
    cover: z.string().min(1),
    images: z
      .array(
        z.object({
          file: z.string().regex(ARTICLE_IMAGE_FILE),
          alt: z.string().min(1),
          caption: z.string().nullable().optional(),
          credit,
        }),
      )
      .default([]),
    sources: z
      .array(z.object({ title: z.string(), url: z.string().url() }))
      .default([]),
    generator: z
      .object({ model: z.string(), prompt: z.string(), at: z.coerce.date() })
      .optional(),
    updatedAt: z.coerce.date(),
  })
  .refine(
    (a) => a.status === EArticleStatus.DRAFT || (a.reviewedBy && a.reviewedAt),
    'REVIEWED needs reviewedBy + reviewedAt',
  );

/** Only the entry and variant ids of a crop's diseases.json (the KB source checks the rest). */
const diseaseIdsSchema = z.object({
  diseases: z.array(
    z.object({
      id: z.string(),
      variants: z.array(z.object({ id: z.string() })).optional(),
    }),
  ),
});

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

type TFail = (message: string) => never;

const sha256 = (data: string | Buffer): string =>
  createHash('sha256').update(data).digest('hex');

/**
 * Reads `<crop>/articles/<CODE>.md` + `<crop>/articles/images/<CODE>/*.webp` for every crop pack under
 * `directory` (default: `crops/` next to this file); crops without `articles/` are skipped.
 * `<CODE>` is a disease id (main article) or a variant id (variant article, needs the main article).
 * Every check failure throws, so the app does not start with a broken article.
 */
export class FileArticleSource implements IArticleSource {
  constructor(private readonly directory: string = join(__dirname, 'crops')) {}

  async load(): Promise<TArticleSeed[]> {
    const crops = (await readdir(this.directory, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const seeds: TArticleSeed[] = [];
    for (const crop of crops) seeds.push(...(await this.loadCrop(crop)));
    return seeds;
  }

  private async loadCrop(crop: string): Promise<TArticleSeed[]> {
    const articlesDir = join(this.directory, crop, 'articles');
    const entries = await readdir(articlesDir, { withFileTypes: true }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      },
    );
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort();
    if (files.length === 0) return [];

    const { diseases } = diseaseIdsSchema.parse(
      JSON.parse(
        await readFile(join(this.directory, crop, 'diseases.json'), 'utf8'),
      ),
    );
    const kbCodes: TArticleKbCodes = {
      diseases: new Set(diseases.map((d) => d.id)),
      variantOf: new Map(
        diseases.flatMap((d) =>
          (d.variants ?? []).map((v): [string, string] => [v.id, d.id]),
        ),
      ),
    };
    const seeds: TArticleSeed[] = [];
    const fileOfSlug = new Map<string, string>();
    for (const file of files) {
      const fail: TFail = (message) => {
        throw new Error(`crops/${crop}/articles/${file}: ${message}`);
      };
      const seed = await this.loadArticle(crop, file, kbCodes, fail);
      const other = fileOfSlug.get(seed.slug);
      if (other) fail(`slug ${seed.slug} is also used by ${other}`);
      fileOfSlug.set(seed.slug, file);
      seeds.push(seed);
    }
    const mains = new Set(
      seeds.filter((s) => !s.variantCode).map((s) => s.diseaseCode),
    );
    for (const seed of seeds) {
      if (seed.variantCode && !mains.has(seed.diseaseCode)) {
        throw new Error(
          `crops/${crop}/articles/${seed.variantCode}.md: variant article needs the main article ${seed.diseaseCode}.md`,
        );
      }
    }
    return seeds;
  }

  private async loadArticle(
    crop: string,
    file: string,
    kbCodes: TArticleKbCodes,
    fail: TFail,
  ): Promise<TArticleSeed> {
    const raw = await readFile(
      join(this.directory, crop, 'articles', file),
      'utf8',
    );
    const match = FRONTMATTER.exec(raw.replace(/\r\n/g, '\n'));
    if (!match) return fail('missing --- frontmatter ---');
    const parsed = articleFrontmatter.safeParse(parseYaml(match[1]));
    if (!parsed.success) {
      return fail(
        parsed.error.issues
          .map(
            (issue) =>
              `${issue.path.join('.') || 'frontmatter'}: ${issue.message}`,
          )
          .join('; '),
      );
    }
    const meta = parsed.data;
    const markdown = match[2].replace(/^\n+/, '');

    if (file !== `${meta.code}.md`) fail(`file name must be ${meta.code}.md`);
    if (meta.crop !== crop) fail(`crop ${meta.crop} must be ${crop}`);
    const parent = kbCodes.variantOf.get(meta.code);
    if (!parent && !kbCodes.diseases.has(meta.code)) {
      fail(`code ${meta.code} is not a disease or variant in diseases.json`);
    }
    const [issue] = articleContentIssues(
      {
        title: meta.title as string,
        summary: meta.summary as string,
        markdown,
        cover: meta.cover as string,
        imageFiles: meta.images.map((image) => image.file as string),
      },
      kbCodes,
      crop,
    );
    if (issue) fail(issue);

    const images: TArticleSeedImage[] = [];
    for (const image of meta.images) {
      const path = join(
        this.directory,
        crop,
        'articles',
        'images',
        meta.code,
        image.file,
      );
      const content = await readFile(path).catch(() =>
        fail(`image file images/${meta.code}/${image.file} is missing`),
      );
      const { format, width, height } = await sharp(content)
        .metadata()
        .catch(() => fail(`image ${image.file} is not readable`));
      if (format !== 'webp' || !width || !height) {
        fail(`image ${image.file} is not a webp image`);
      }
      images.push({
        file: image.file,
        content,
        sha256: sha256(content),
        width: width as number,
        height: height as number,
        alt: image.alt,
        caption: image.caption ?? null,
        credit: image.credit as TArticleImageCredit,
      });
    }

    return {
      cropType: crop,
      diseaseCode: parent ?? meta.code,
      variantCode: parent ? meta.code : null,
      slug: meta.slug,
      title: meta.title,
      summary: meta.summary,
      markdown,
      cover: meta.cover,
      images,
      sources: meta.sources as TArticleSource[],
      status: meta.status,
      reviewedBy: meta.reviewedBy,
      reviewedAt: meta.reviewedAt,
      kbVersion: meta.kbVersion,
      updatedAt: meta.updatedAt,
      contentHash: sha256(raw + images.map((image) => image.sha256).join(',')),
    };
  }
}
