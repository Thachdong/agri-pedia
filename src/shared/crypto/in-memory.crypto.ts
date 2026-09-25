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

  async hashPassword(password: string): Promise<string> {
    return `pwd(${password})`;
  }

  randomDigits(length: number): string {
    return this.nextDigits ?? '0'.repeat(length);
  }
}
