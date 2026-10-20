/** Who wrote the article's current content. */
export enum EArticleOrigin {
  /** Generated, seeded from the crop pack; the seed keeps it in sync with the pack. */
  AI = 'AI',
  /** Created by an admin. */
  ADMIN = 'ADMIN',
  /** Generated, then edited by an admin; the seed no longer touches it. */
  AI_REVIEWED = 'AI_REVIEWED',
}
