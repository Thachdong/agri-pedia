import { ICryptoService } from './crypto.interface';

/** Test fake: readable, deterministic transforms. Set `nextDigits` / `nextToken` to control generated values. */
export class InMemoryCryptoService implements ICryptoService {
  nextDigits?: string;
  nextToken?: string;

  hash(value: string): string {
    return `hash(${value})`;
  }

  encrypt(plainText: string): string {
    return `enc(${plainText})`;
  }

  decrypt(cipherText: string): string {
    const match = /^enc\((.*)\)$/s.exec(cipherText);
    if (!match) {
      throw new Error('Invalid cipher text format');
    }
    return match[1];
  }

  async hashPassword(password: string): Promise<string> {
    return `pwd(${password})`;
  }

  async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    return passwordHash === `pwd(${password})`;
  }

  randomDigits(length: number): string {
    return this.nextDigits ?? '0'.repeat(length);
  }

  randomToken(): string {
    return this.nextToken ?? 'token';
  }
}
