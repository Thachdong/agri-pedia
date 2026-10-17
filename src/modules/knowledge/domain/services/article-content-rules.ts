import {
  diseaseCardCodes,
  referencedDiseaseCodes,
} from './article-markdown-resolver';

export const ARTICLE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const ARTICLE_SLUG_MAX = 100;
export const ARTICLE_TITLE_MAX = 70;
export const ARTICLE_SUMMARY_MIN = 50;
export const ARTICLE_SUMMARY_MAX = 160;
/** Image file name as written in the markdown and `cover`. */
export const ARTICLE_IMAGE_FILE = /^[a-z0-9-]+\.webp$/;

/** KB codes of one crop: disease codes, and variant code -> disease code. */
export type TArticleKbCodes = {
  diseases: ReadonlySet<string>;
  variantOf: ReadonlyMap<string, string>;
};

export type TArticleCheckedContent = {
  title: string;
  summary: string;
  markdown: string;
  cover: string;
  imageFiles: string[];
};

/** Fenced code blocks and inline code spans. */
const CODE = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g;
const IMAGE_TARGET = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
const HTML_TAG = /<[a-z!/]/i;

/**
 * Problems of an article's content against the KB of its crop, in a stable order; empty = valid.
 * Covers lengths, image file names, the cover, body images, `/diseases/<CODE>` links and
 * `::disease-card` directives (disease ids only), and HTML outside code.
 */
export function articleContentIssues(
  content: TArticleCheckedContent,
  kb: TArticleKbCodes,
  cropType: string,
): string[] {
  const issues: string[] = [];
  const title = content.title.trim();
  if (title.length === 0 || title.length > ARTICLE_TITLE_MAX) {
    issues.push(`title must be 1-${ARTICLE_TITLE_MAX} characters`);
  }
  const summary = content.summary.trim().length;
  if (summary < ARTICLE_SUMMARY_MIN || summary > ARTICLE_SUMMARY_MAX) {
    issues.push(
      `summary must be ${ARTICLE_SUMMARY_MIN}-${ARTICLE_SUMMARY_MAX} characters`,
    );
  }
  const seen = new Set<string>();
  for (const file of content.imageFiles) {
    if (!ARTICLE_IMAGE_FILE.test(file)) {
      issues.push(`image file ${file} must match ${ARTICLE_IMAGE_FILE.source}`);
    }
    if (seen.has(file)) issues.push(`image file ${file} is listed twice`);
    seen.add(file);
  }
  if (!seen.has(content.cover)) {
    issues.push(`cover ${content.cover} is not listed in images`);
  }
  const prose = content.markdown.replace(CODE, '');
  for (const [, target] of prose.matchAll(IMAGE_TARGET)) {
    if (!seen.has(target))
      issues.push(`image ${target} is not listed in images`);
  }
  for (const code of referencedDiseaseCodes(content.markdown)) {
    if (!kb.diseases.has(code) && !kb.variantOf.has(code)) {
      issues.push(`disease ${code} is not in the ${cropType} KB`);
    }
  }
  for (const code of diseaseCardCodes(content.markdown)) {
    if (!kb.diseases.has(code) && kb.variantOf.has(code)) {
      issues.push(`disease-card ${code} must be a disease id, not a variant`);
    }
  }
  if (HTML_TAG.test(prose)) issues.push('HTML tags are not allowed');
  return issues;
}
