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
  diseaseCardCodes,
  EArticleStatus,
  referencedDiseaseCodes,
  TArticleImageCredit,
  TArticleSource,
} from '../../domain';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
    slug: z.string().regex(SLUG).max(100),
    title: z.string().min(1).max(70),
    summary: z.string().min(50).max(160),
    status: z.nativeEnum(EArticleStatus),
    reviewedBy: z.string().min(1).nullable(),
    reviewedAt: z.coerce.date().nullable(),
    kbVersion: z.string(),
    /** Reference image (cards, related articles, Open Graph); one of `images[].file`. */
    cover: z.string().min(1),
    images: z
      .array(
        z.object({
          file: z.string().regex(/^[a-z0-9-]+\.webp$/),
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

/** KB codes of one crop: disease ids, and variant id -> disease id. */
type TKbCodes = { diseases: Set<string>; variantOf: Map<string, string> };

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
/** Fenced code blocks and inline code spans. */
const CODE = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g;
const IMAGE_TARGET = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
const HTML_TAG = /<[a-z!/]/i;

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
    const kbCodes: TKbCodes = {
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
    kbCodes: TKbCodes,
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
    const imageFiles = new Set(meta.images.map((image) => image.file));
    if (!imageFiles.has(meta.cover)) {
      fail(`cover ${meta.cover} is not listed in images`);
    }
    const prose = markdown.replace(CODE, '');
    for (const [, target] of prose.matchAll(IMAGE_TARGET)) {
      if (!imageFiles.has(target))
        fail(`image ${target} is not listed in images`);
    }
    for (const code of referencedDiseaseCodes(markdown)) {
      if (!kbCodes.diseases.has(code) && !kbCodes.variantOf.has(code)) {
        fail(`disease ${code} is not in the ${crop} KB`);
      }
    }
    for (const code of diseaseCardCodes(markdown)) {
      if (!kbCodes.diseases.has(code)) {
        fail(`disease-card ${code} must be a disease id, not a variant`);
      }
    }
    if (HTML_TAG.test(prose)) fail('HTML tags are not allowed');

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
