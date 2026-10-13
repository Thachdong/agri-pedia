/** How well a KB entry is backed by sources. */
export enum EVerification {
  /** Rewritten from downloaded sources. */
  SOURCED = 'SOURCED',
  /** Gemini content with known errors fixed; sources available for cross-check. */
  GEMINI_REVIEWED = 'GEMINI_REVIEWED',
  /** Gemini content only; never used as a diagnosis candidate. */
  GEMINI_ONLY = 'GEMINI_ONLY',
}
