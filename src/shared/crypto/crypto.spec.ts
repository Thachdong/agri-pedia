import { IConfigService } from '@shared/config';
import { NodeCryptoService } from './node.crypto';

const config = {
  get: () => ({
    identifierHashSecret: 'x'.repeat(32),
    identifierEncryptionKey: 'ab'.repeat(32),
  }),
} as unknown as IConfigService;

describe('NodeCryptoService', () => {
  const crypto = new NodeCryptoService(config);

  it('hashes deterministically', () => {
    expect(crypto.hash('a@b.com')).toBe(crypto.hash('a@b.com'));
    expect(crypto.hash('a@b.com')).not.toBe(crypto.hash('c@b.com'));
  });

  it('encrypts with a random iv without exposing the plain text', () => {
    const first = crypto.encrypt('0912345678');
    expect(first).not.toBe(crypto.encrypt('0912345678'));
    expect(first).not.toContain('0912345678');
    expect(first.split('.')).toHaveLength(3);
  });

  it('decrypts what it encrypted', () => {
    expect(crypto.decrypt(crypto.encrypt('482913'))).toBe('482913');
  });

  it('rejects tampered or malformed cipher text', () => {
    const [iv, tag] = crypto.encrypt('482913').split('.');
    const forged = [iv, tag, Buffer.from('000000').toString('base64url')];
    expect(() => crypto.decrypt(forged.join('.'))).toThrow();
    expect(() => crypto.decrypt('not-a-cipher')).toThrow();
  });

  it('hashes passwords with a random salt', async () => {
    const hashed = await crypto.hashPassword('P@ssw0rd');
    expect(hashed).toMatch(/^scrypt\$16384\$8\$1\$[\w-]+\$[\w-]+$/);
    expect(hashed).not.toContain('P@ssw0rd');
    expect(hashed).not.toBe(await crypto.hashPassword('P@ssw0rd'));
  });

  it('verifies passwords against their hash', async () => {
    const hashed = await crypto.hashPassword('P@ssw0rd');
    await expect(crypto.verifyPassword('P@ssw0rd', hashed)).resolves.toBe(true);
    await expect(crypto.verifyPassword('wrong', hashed)).resolves.toBe(false);
  });

  it('rejects malformed password hashes', async () => {
    await expect(crypto.verifyPassword('P@ssw0rd', 'garbage')).resolves.toBe(
      false,
    );
    await expect(
      crypto.verifyPassword('P@ssw0rd', 'scrypt$a$b$c$salt$key'),
    ).resolves.toBe(false);
    await expect(
      crypto.verifyPassword('P@ssw0rd', 'scrypt$3$8$1$salt$key'),
    ).resolves.toBe(false);
  });

  it('generates numeric codes of given length', () => {
    expect(crypto.randomDigits(6)).toMatch(/^\d{6}$/);
  });

  it('generates random url-safe tokens', () => {
    const token = crypto.randomToken();
    expect(token).toMatch(/^[\w-]{43}$/);
    expect(token).not.toBe(crypto.randomToken());
  });
});
