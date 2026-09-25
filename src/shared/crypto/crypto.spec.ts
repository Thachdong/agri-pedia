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

  it('encrypts with random iv and decrypts back', () => {
    const first = crypto.encrypt('0912345678');
    expect(first).not.toBe(crypto.encrypt('0912345678'));
    expect(crypto.decrypt(first)).toBe('0912345678');
  });

  it('rejects tampered cipher text', () => {
    const [iv, tag, data] = crypto.encrypt('secret').split('.');
    const tampered = [iv, tag, Buffer.from('other').toString('base64url')];
    expect(() => crypto.decrypt(tampered.join('.'))).toThrow();
    expect(() => crypto.decrypt(data)).toThrow();
  });

  it('hashes and verifies passwords', async () => {
    const hashed = await crypto.hashPassword('P@ssw0rd');
    expect(hashed).not.toContain('P@ssw0rd');
    await expect(crypto.verifyPassword('P@ssw0rd', hashed)).resolves.toBe(true);
    await expect(crypto.verifyPassword('wrong', hashed)).resolves.toBe(false);
    await expect(crypto.verifyPassword('P@ssw0rd', 'garbage')).resolves.toBe(
      false,
    );
  });

  it('generates numeric codes of given length', () => {
    expect(crypto.randomDigits(6)).toMatch(/^\d{6}$/);
  });
});
