import { IMediaQueryPort } from '@modules/media/contracts';
import { InMemoryCryptoService } from '@shared/crypto';
import { EBusinessType, ELoginType, EUserRole, User } from '../domain';
import { readUserContactDetails } from './user-contact-details';

describe('readUserContactDetails', () => {
  const crypto = new InMemoryCryptoService();
  let requests: unknown[][];
  const mediaQuery: IMediaQueryPort = {
    listByOwner: async () => [],
    findThumbnails: async () => [],
    findUrls: async (ownerType, ownerId, mediaIds) => {
      requests.push([ownerType, ownerId, mediaIds]);
      return mediaIds
        .filter((id) => id === 'license-1')
        .map((mediaId) => ({ mediaId, url: `https://signed/${mediaId}` }));
    },
  };

  const register = (loginType: ELoginType, identifier: string) =>
    User.register({
      loginType,
      hashedIdentifier: `hash(${identifier})`,
      encryptedIdentifier: `enc(${identifier})`,
      passwordHash: 'pwd(secret)',
      username: 'seed-shop',
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });

  beforeEach(() => {
    requests = [];
  });

  it('returns the decrypted email and the license URL', async () => {
    const user = register(ELoginType.EMAIL, 'shop@mail.com');
    user.updateProfile({ businessLicense: 'license-1' });

    await expect(
      readUserContactDetails(user, crypto, mediaQuery),
    ).resolves.toEqual({
      email: 'shop@mail.com',
      phone: null,
      businessLicense: 'https://signed/license-1',
    });
    expect(requests).toEqual([['USER_LICENSE', user.id, ['license-1']]]);
  });

  it('returns the decrypted phone and no license without querying media', async () => {
    const user = register(ELoginType.PHONE, '0912345678');

    await expect(
      readUserContactDetails(user, crypto, mediaQuery),
    ).resolves.toEqual({
      email: null,
      phone: '0912345678',
      businessLicense: null,
    });
    expect(requests).toEqual([]);
  });

  it('returns a null license when its media is gone', async () => {
    const user = register(ELoginType.EMAIL, 'shop@mail.com');
    user.updateProfile({ businessLicense: 'license-gone' });

    const details = await readUserContactDetails(user, crypto, mediaQuery);

    expect(details.businessLicense).toBeNull();
  });
});
