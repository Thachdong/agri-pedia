import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryEventBus } from '@shared/event-bus';
import { USER_PROFILE_UPDATED_EVENT } from '../../contracts';
import {
  BusinessTypeNotAllowedException,
  BusinessTypeRequiredException,
  EBusinessType,
  ELoginType,
  EUserRole,
  User,
  UserNotFoundException,
} from '../../domain';
import { InMemoryUserRepository } from '../ports/fakes';
import { UpdateProfileUseCase } from './update-profile.use-case';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const file = (name: string) => ({
  key: `tmp/u/${name}.png`,
  type: 'IMAGE' as const,
  extension: 'png',
  filename: `${name}.png`,
});

describe('UpdateProfileUseCase', () => {
  let users: InMemoryUserRepository;
  let eventBus: InMemoryEventBus;
  let useCase: UpdateProfileUseCase;

  const registerUser = (role: EUserRole) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: 'hash(user@mail.com)',
      encryptedIdentifier: 'enc(user@mail.com)',
      passwordHash: 'pwd(secret)',
      username: 'old-name',
      role,
      businessType:
        role === EUserRole.DISTRIBUTOR ? EBusinessType.SEEDS_SEEDLINGS : null,
      bio: 'old bio',
    });
    users.items.set(user.id, user);
    return user;
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    eventBus = new InMemoryEventBus();
    useCase = new UpdateProfileUseCase(
      users,
      new InMemoryUnitOfWork(),
      eventBus,
    );
  });

  it('updates the given fields and assigns new media ids', async () => {
    const user = registerUser(EUserRole.DISTRIBUTOR);

    const output = await useCase.execute({
      userId: user.id,
      username: 'new-name',
      bio: 'new bio',
      businessType: EBusinessType.AQUACULTURE_SEEDLINGS,
      avatar: file('avatar'),
      businessLicense: file('license'),
    });

    expect(output).toEqual({
      username: 'new-name',
      avatar: expect.stringMatching(UUID),
      bio: 'new bio',
      businessLicense: expect.stringMatching(UUID),
      businessType: EBusinessType.AQUACULTURE_SEEDLINGS,
      updatedAt: expect.any(Date),
    });
    expect(output.avatar).not.toBe(output.businessLicense);
    const saved = users.items.get(user.id);
    expect(saved?.avatar).toBe(output.avatar);
    expect(saved?.businessLicense).toBe(output.businessLicense);
    expect(saved?.username).toBe('new-name');
    expect(eventBus.published).toEqual([
      {
        name: USER_PROFILE_UPDATED_EVENT,
        occurredAt: expect.any(String),
        payload: {
          userId: user.id,
          avatar: { ...file('avatar'), mediaId: output.avatar },
          businessLicense: {
            ...file('license'),
            mediaId: output.businessLicense,
          },
        },
      },
    ]);
  });

  it('keeps omitted fields', async () => {
    const user = registerUser(EUserRole.FARMER);

    const output = await useCase.execute({ userId: user.id, bio: 'new bio' });

    expect(output).toMatchObject({
      username: 'old-name',
      avatar: null,
      bio: 'new bio',
      businessLicense: null,
      businessType: null,
    });
    expect(eventBus.published).toEqual([
      expect.objectContaining({
        name: USER_PROFILE_UPDATED_EVENT,
        payload: { userId: user.id },
      }),
    ]);
  });

  it('rejects a business type for a farmer', async () => {
    const user = registerUser(EUserRole.FARMER);

    await expect(
      useCase.execute({
        userId: user.id,
        businessType: EBusinessType.SEEDS_SEEDLINGS,
      }),
    ).rejects.toThrow(BusinessTypeNotAllowedException);
    expect(eventBus.published).toEqual([]);
  });

  it('requires a business type for a distributor', async () => {
    const user = registerUser(EUserRole.DISTRIBUTOR);

    await expect(
      useCase.execute({ userId: user.id, businessType: null }),
    ).rejects.toThrow(BusinessTypeRequiredException);
  });

  it('throws UserNotFound for an unknown user', async () => {
    await expect(
      useCase.execute({ userId: 'ghost', username: 'x' }),
    ).rejects.toThrow(UserNotFoundException);
    expect(eventBus.published).toEqual([]);
  });
});
