import { IMediaQueryPort } from '@modules/media/contracts';
import { InMemoryCryptoService } from '@shared/crypto';
import {
  Address,
  Coordinates,
  EBusinessType,
  ELoginType,
  EUserRole,
  User,
  UserNotFoundException,
} from '../../domain';
import {
  InMemoryAddressRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import { GetMyProfileUseCase } from './get-my-profile.use-case';

const mediaQuery: IMediaQueryPort = {
  listByOwner: async () => [],
  findThumbnails: async () => [],
  findUrls: async (_, __, mediaIds) =>
    mediaIds.map((mediaId) => ({ mediaId, url: `https://signed/${mediaId}` })),
};

describe('GetMyProfileUseCase', () => {
  let users: InMemoryUserRepository;
  let addresses: InMemoryAddressRepository;
  let useCase: GetMyProfileUseCase;

  const register = (role: EUserRole) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: 'hash(user@mail.com)',
      encryptedIdentifier: 'enc(user@mail.com)',
      passwordHash: 'pwd(secret)',
      username: 'seed-shop',
      role,
      businessType:
        role === EUserRole.DISTRIBUTOR ? EBusinessType.SEEDS_SEEDLINGS : null,
      bio: 'bio',
    });
    users.items.set(user.id, user);
    return user;
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    addresses = new InMemoryAddressRepository();
    useCase = new GetMyProfileUseCase(
      users,
      addresses,
      new InMemoryCryptoService(),
      mediaQuery,
    );
  });

  it('returns the profile with the primary address', async () => {
    const user = register(EUserRole.FARMER);
    await addresses.save(
      Address.createPrimary({
        userId: user.id,
        province: 'ha_noi',
        ward: 'phuong_ba_dinh',
        houseNumber: '12 Kim Ma',
        coordinates: Coordinates.create(21.03, 105.82),
      }),
    );

    const output = await useCase.execute({ userId: user.id });

    expect(output).toEqual({
      id: user.id,
      loginType: ELoginType.EMAIL,
      email: 'user@mail.com',
      phone: null,
      username: 'seed-shop',
      role: EUserRole.FARMER,
      businessType: null,
      businessLicense: null,
      avatar: null,
      bio: 'bio',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      address: {
        province: 'ha_noi',
        ward: 'phuong_ba_dinh',
        houseNumber: '12 Kim Ma',
        lat: 21.03,
        long: 105.82,
      },
    });
  });

  it('returns a user that is not active', async () => {
    const user = register(EUserRole.DISTRIBUTOR);

    const output = await useCase.execute({ userId: user.id });

    expect(output.id).toBe(user.id);
    expect(output.businessType).toBe(EBusinessType.SEEDS_SEEDLINGS);
  });

  it('returns the business license as a signed URL', async () => {
    const user = register(EUserRole.DISTRIBUTOR);
    user.updateProfile({ businessLicense: 'license-1' });

    const output = await useCase.execute({ userId: user.id });

    expect(output.businessLicense).toBe('https://signed/license-1');
  });

  it('returns the avatar as a signed URL', async () => {
    const user = register(EUserRole.FARMER);
    user.updateProfile({ avatar: 'avatar-1' });

    const output = await useCase.execute({ userId: user.id });

    expect(output.avatar).toBe('https://signed/avatar-1');
  });

  it('returns a null address when the user has no primary address', async () => {
    const user = register(EUserRole.FARMER);

    const output = await useCase.execute({ userId: user.id });

    expect(output.address).toBeNull();
  });

  it('rejects an unknown user', async () => {
    await expect(useCase.execute({ userId: 'missing' })).rejects.toThrow(
      UserNotFoundException,
    );
  });
});
