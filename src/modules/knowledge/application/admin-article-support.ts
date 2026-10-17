import { IUserQueryPort } from '@modules/user/contracts';
import {
  Disease,
  KnowledgeAdminRequiredException,
  KnowledgeArticleImageInvalidException,
  KnowledgeDiseaseNotFoundException,
  TArticleImage,
  TArticleImageCredit,
  TArticleKbCodes,
} from '../domain';
import { IArticleImagePublisher } from './ports/article-image-publisher';
import { IKnowledgeRepository } from './ports/knowledge.repository';

/** Throws KnowledgeAdminRequiredException unless `userId` is an ACTIVE admin. */
export async function assertArticleAdmin(
  userQuery: IUserQueryPort,
  userId: string,
): Promise<void> {
  const user = await userQuery.findRoleById(userId);
  if (!user || user.role !== 'ADMIN' || !user.isActive) {
    throw new KnowledgeAdminRequiredException(userId);
  }
}

/** KB codes of the crop's diseases, for the article content rules. */
export function kbCodesOf(diseases: Disease[]): TArticleKbCodes {
  return {
    diseases: new Set(diseases.map((d) => d.code)),
    variantOf: new Map(
      diseases.flatMap((d) =>
        d.content.variants.map((v): [string, string] => [v.code, d.code]),
      ),
    ),
  };
}

export type TKbTarget = { disease: Disease; variantCode: string | null };

/** The disease of a KB code (disease code, or variant code `<disease>__V<n>`); KnowledgeDiseaseNotFound otherwise. */
export async function findKbTarget(
  knowledge: IKnowledgeRepository,
  code: string,
): Promise<TKbTarget> {
  const [diseaseCode] = code.split('__');
  const disease = await knowledge.findDisease(diseaseCode);
  if (disease && code === disease.code) return { disease, variantCode: null };
  if (disease?.content.variants.some((v) => v.code === code)) {
    return { disease, variantCode: code };
  }
  throw new KnowledgeDiseaseNotFoundException(code);
}

/** An image of an admin article. */
export type TAdminArticleImageInput = {
  /** File name used in the markdown and `cover`, e.g. `dao-on-la-1.webp`. */
  file: string;
  /** Presign TMP key of a new image; omitted = keep the stored image with the same `file`. */
  tmpKey?: string;
  alt: string;
  caption?: string | null;
  credit: TArticleImageCredit;
};

/**
 * Article images in input order: stored ones (same `file`, no `tmpKey`) are kept, new ones are
 * published to `articles/<CROP>/<CODE>/<name>.<sha8>.webp`. A new image must be an upload of
 * `uploaderId` (`tmp/<uploaderId>/...`) that the publisher can read; else KnowledgeArticleImageInvalid.
 * Returns the images and the TMP keys used (to delete once the article is saved).
 */
export async function resolveArticleImages(
  publisher: IArticleImagePublisher,
  input: {
    uploaderId: string;
    cropType: string;
    code: string;
    images: TAdminArticleImageInput[];
    stored: TArticleImage[];
  },
): Promise<{ images: TArticleImage[]; tmpKeys: string[] }> {
  const storedByFile = new Map(input.stored.map((i) => [i.file, i]));
  const images: TArticleImage[] = [];
  const tmpKeys: string[] = [];
  for (const image of input.images) {
    const meta = {
      file: image.file,
      alt: image.alt.trim(),
      caption: image.caption?.trim() || null,
      credit: image.credit,
    };
    if (image.tmpKey === undefined) {
      const stored = storedByFile.get(image.file);
      if (!stored)
        throw new KnowledgeArticleImageInvalidException(image.file, null);
      images.push({ ...stored, ...meta });
      continue;
    }
    const published = image.tmpKey.startsWith(`tmp/${input.uploaderId}/`)
      ? await publisher.publish({
          tmpKey: image.tmpKey,
          keyPrefix: `articles/${input.cropType}/${input.code}/${image.file.replace(/\.webp$/, '')}`,
        })
      : null;
    if (!published) {
      throw new KnowledgeArticleImageInvalidException(image.file, image.tmpKey);
    }
    images.push({ ...meta, ...published });
    tmpKeys.push(image.tmpKey);
  }
  return { images, tmpKeys };
}
