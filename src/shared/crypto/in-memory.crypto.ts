import { ICryptoService } from './crypto.interface';

/** Test fake: readable, deterministic transforms. Set `nextDigits` to control generated codes. */
export class InMemoryCryptoService implements ICryptoService {
  nextDigits?: string;

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

  randomDigits(length: number): string {
    return this.nextDigits ?? '0'.repeat(length);
  }
}
