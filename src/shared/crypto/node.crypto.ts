import { Inject, Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  scrypt,
  ScryptOptions,
  timingSafeEqual,
} from 'node:crypto';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { ICryptoService } from './crypto.interface';

const CIPHER = 'aes-256-gcm';
const IV_LENGTH = 12;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };
const RANDOM_TOKEN_BYTES = 32;

const scryptAsync = (
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scrypt(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );

/**
 * Node `crypto` implementation.
 * - hash: HMAC-SHA256, hex.
 * - encrypt: AES-256-GCM, `<iv>.<authTag>.<cipherText>` base64url.
 * - password: scrypt, `scrypt$<N>$<r>$<p>$<salt>$<key>` base64url.
 * - randomToken: 32 random bytes, base64url.
 */
@Injectable()
export class NodeCryptoService implements ICryptoService {
  private readonly hashSecret: string;
  private readonly encryptionKey: Buffer;

  constructor(@Inject(CONFIG_SERVICE) config: IConfigService) {
    const security = config.get('security');
    this.hashSecret = security.identifierHashSecret;
    this.encryptionKey = Buffer.from(security.identifierEncryptionKey, 'hex');
  }

  hash(value: string): string {
    return createHmac('sha256', this.hashSecret).update(value).digest('hex');
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(CIPHER, this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), encrypted]
      .map((part) => part.toString('base64url'))
      .join('.');
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid cipher text format');
    }
    const [iv, authTag, encrypted] = parts.map((part) =>
      Buffer.from(part, 'base64url'),
    );
    const decipher = createDecipheriv(CIPHER, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SCRYPT_SALT_LENGTH);
    const { N, r, p } = SCRYPT_OPTIONS;
    const key = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH, {
      N,
      r,
      p,
    });
    return [
      'scrypt',
      N,
      r,
      p,
      salt.toString('base64url'),
      key.toString('base64url'),
    ].join('$');
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const parts = passwordHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return false;
    }
    const [N, r, p] = parts.slice(1, 4).map(Number);
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (![N, r, p].every(Number.isInteger) || expected.length === 0) {
      return false;
    }
    try {
      const actual = await scryptAsync(password, salt, expected.length, {
        N,
        r,
        p,
      });
      return timingSafeEqual(actual, expected);
    } catch {
      // invalid scrypt parameters in the stored hash
      return false;
    }
  }

  randomDigits(length: number): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += randomInt(0, 10).toString();
    }
    return code;
  }

  randomToken(): string {
    return randomBytes(RANDOM_TOKEN_BYTES).toString('base64url');
  }
}
