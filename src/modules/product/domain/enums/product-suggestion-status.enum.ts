/** Outcome of reading a product photo and looking the name up in the catalog. */
export enum EProductSuggestionStatus {
  /** No product name could be read from the photo. */
  UNREADABLE = 'UNREADABLE',
  /** A name was read but no catalog item matches it. */
  NOT_FOUND = 'NOT_FOUND',
  /** A catalog item matches the name read. */
  FOUND = 'FOUND',
}
