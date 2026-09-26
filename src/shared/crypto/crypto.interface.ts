/** Cryptographic primitives the project needs. Encodings are opaque strings safe to store as text. */
export interface ICryptoService {
  /** Deterministic keyed hash (for lookup by secret value, e.g. identifier). */
  hash(value: string): string;
  /** Authenticated encryption (AES-GCM); output is random per call. */
  encrypt(plainText: string): string;
  /** Inverse of `encrypt`. Throws if the cipher text was tampered with or not produced by `encrypt`. */
  decrypt(cipherText: string): string;
  /** Slow salted hash for passwords. */
  hashPassword(password: string): Promise<string>;
  /** True if `password` matches a hash produced by `hashPassword`; false for a malformed hash. */
  verifyPassword(password: string, passwordHash: string): Promise<boolean>;
  /** Cryptographically secure numeric code of `length` digits (leading zeros kept). */
  randomDigits(length: number): string;
  /** Unguessable opaque token (URL-safe), e.g. a refresh token. */
  randomToken(): string;
}

export const CRYPTO_SERVICE = Symbol('CRYPTO_SERVICE');
