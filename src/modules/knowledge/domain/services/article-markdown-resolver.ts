/** Fenced code blocks and inline code spans: left untouched by every rule below. */
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/;
const IMAGE_FILE = /\]\(([a-z0-9-]+\.webp)\)/g;
/** `[text](/diseases/<CODE>)`, not preceded by `!` (an image). */
const DISEASE_LINK = /(?<!!)\[([^\]]*)\]\(\/diseases\/([A-Z0-9_]+)\)/g;
const DISEASE_CARD = /::disease-card\{code="([A-Z0-9_]+)"\}/g;

export type TArticleMarkdownLinks = {
  /** Public URL of an image file of the article; undefined = leave as written. */
  imageUrl(file: string): string | undefined;
  /** Article path of a disease code; undefined = the disease has no article. */
  diseasePath(code: string): string | undefined;
};

/** Applies `transform` to the markdown outside code. */
function outsideCode(
  markdown: string,
  transform: (text: string) => string,
): string {
  return markdown
    .split(CODE)
    .map((part, index) => (index % 2 === 1 ? part : transform(part)))
    .join('');
}

/** Capture group `group` of every match outside code, in order. */
function matchesOutsideCode(
  markdown: string,
  pattern: RegExp,
  group = 1,
): string[] {
  const found: string[] = [];
  outsideCode(markdown, (text) => {
    for (const match of text.matchAll(pattern)) found.push(match[group]);
    return text;
  });
  return found;
}

/**
 * Makes a stored article body servable: image file names → public URLs; `/diseases/<CODE>` links →
 * the article path of that disease, or plain text when it has no article. Directives stay.
 */
export function resolveArticleMarkdown(
  markdown: string,
  links: TArticleMarkdownLinks,
): string {
  return outsideCode(markdown, (text) =>
    text
      .replace(IMAGE_FILE, (whole, file: string) => {
        const url = links.imageUrl(file);
        return url ? `](${url})` : whole;
      })
      .replace(DISEASE_LINK, (_whole, label: string, code: string) => {
        const path = links.diseasePath(code);
        return path ? `[${label}](${path})` : label;
      }),
  );
}

/** Image file names in order of first appearance in the body. */
export function imageFilesInOrder(markdown: string): string[] {
  return [...new Set(matchesOutsideCode(markdown, IMAGE_FILE))];
}

/** Codes of `::disease-card{code="..."}` directives, in order, without duplicates. */
export function diseaseCardCodes(markdown: string): string[] {
  return [...new Set(matchesOutsideCode(markdown, DISEASE_CARD))];
}

/** Codes the body links to or shows as a card, without duplicates. */
export function referencedDiseaseCodes(markdown: string): string[] {
  return [
    ...new Set([
      ...matchesOutsideCode(markdown, DISEASE_LINK, 2),
      ...diseaseCardCodes(markdown),
    ]),
  ];
}
