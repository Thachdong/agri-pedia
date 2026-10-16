import {
  EArticleStatus,
  TArticleImageCredit,
  TArticleSource,
} from '../../domain';

export type TArticleSeedImage = {
  /** File name in the markdown, e.g. `dao-on-la-1.webp`. */
  file: string;
  content: Buffer;
  /** Hex sha256 of `content`. */
  sha256: string;
  width: number;
  height: number;
  alt: string;
  caption: string | null;
  credit: TArticleImageCredit;
};

/** One article file of a crop pack, already checked against the KB of its crop. */
export type TArticleSeed = {
  /** Crop.code (pack folder). */
  cropType: string;
  diseaseCode: string;
  slug: string;
  title: string;
  summary: string;
  /** Body without frontmatter. */
  markdown: string;
  cover: string | null;
  images: TArticleSeedImage[];
  sources: TArticleSource[];
  status: EArticleStatus;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  kbVersion: string;
  updatedAt: Date;
  /** sha256 of the article file and its images' hashes. */
  contentHash: string;
};

/** Source of the article seed (crop pack files). */
export interface IArticleSource {
  /** Reads and checks every article; throws on the first invalid file. */
  load(): Promise<TArticleSeed[]>;
}

export const ARTICLE_SOURCE = Symbol('ARTICLE_SOURCE');
