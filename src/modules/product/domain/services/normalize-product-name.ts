/**
 * Key used to compare product names: no diacritics (đ -> d), lower case,
 * every run of non-alphanumeric characters turned into one space, trimmed.
 * "Anvil  5SC®" -> "anvil 5sc", "Thuốc Đặc Trị" -> "thuoc dac tri".
 */
export function normalizeProductName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
