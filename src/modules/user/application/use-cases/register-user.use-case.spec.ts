import { InMemoryCryptoService } from '@shared/crypto';
import { InMemoryUnitOfWork } from '@shared/database';
import { InMemoryEventBus } from '@shared/event-bus';
import { USER_REGISTERED_EVENT } from '../../contracts';
import {
  BusinessTypeNotAllowedException,
  BusinessTypeRequiredException,
  EBusinessType,
  ELoginType,
  EUserRole,
  EUserStatus,
  InvalidCoordinatesException,
  UserIdentifierAlreadyUsedException,
} from '../../domain';
import {
  InMemoryAddressRepository,
  InMemoryUserRepository,
} from '../ports/fakes';
import {
  RegisterUserUseCase,
  TRegisterUserInput,
} from './register-user.use-case';

const farmerInput: TRegisterUserInput = {
  loginType: ELoginType.EMAIL,
  identifier: ' Farmer@Mail.com ',
  password: 'secret123',
  role: EUserRole.FARMER,
  address: {
    province: 'Can Tho',
    ward: 'Ninh Kieu',
    houseNumber: '12',
    lat: 10.03,
    long: 105.78,
  },
};

describe('RegisterUserUseCase', () => {
  let users: InMemoryUserRepository;
  let addresses: InMemoryAddressRepository;
  let eventBus: InMemoryEventBus;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    addresses = new InMemoryAddressRepository();
    eventBus = new InMemoryEventBus();
    useCase = new RegisterUserUseCase(
      users,
      addresses,
      new InMemoryCryptoService(),
      new InMemoryUnitOfWork(),
      eventBus,
    );
  });

  it('registers an active farmer with hashed/encrypted identifier and primary address', async () => {
    const { userId } = await useCase.execute(farmerInput);

    const user = users.items.get(userId)!;
    expect(user.status).toBe(EUserStatus.ACTIVE);
    expect(user.hashedIdentifier).toBe('hash(farmer@mail.com)');
    expect(user.encryptedIdentifier).toBe('enc(farmer@mail.com)');
    expect(user.passwordHash).toBe('pwd(secret123)');
    expect(user.username).toBe('farmer@mail.com');
    expect(user.businessType).toBeNull();

    const [address] = [...addresses.items.values()];
    expect(address.userId).toBe(userId);
    expect(address.isPrimary).toBe(true);
    expect(address.coordinates.lat).toBe(10.03);

    expect(eventBus.published).toHaveLength(1);
    expect(eventBus.published[0].payload).toMatchObject({
      userId,
      identifier: 'farmer@mail.com',
      role: 'FARMER',
      status: 'ACTIVE',
    });
  });

  it('registers a pending distributor with given username', async () => {
    const { userId } = await useCase.execute({
      ...farmerInput,
      loginType: ELoginType.PHONE,
      identifier: '0912 345 678',
      username: 'Seed Shop',
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });

    const user = users.items.get(userId)!;
    expect(user.status).toBe(EUserStatus.PENDING);
    expect(user.hashedIdentifier).toBe('hash(0912345678)');
    expect(user.username).toBe('Seed Shop');
    expect(eventBus.published).toEqual([
      {
        name: USER_REGISTERED_EVENT,
        occurredAt: expect.any(String),
        payload: {
          userId,
          loginType: 'PHONE',
          identifier: '0912345678',
          role: 'DISTRIBUTOR',
          status: 'PENDING',
        },
      },
    ]);
  });

  it('rejects an identifier already registered (after normalization)', async () => {
    await useCase.execute(farmerInput);
    await expect(
      useCase.execute({ ...farmerInput, identifier: 'FARMER@mail.com' }),
    ).rejects.toThrow(UserIdentifierAlreadyUsedException);
    expect(users.items.size).toBe(1);
    expect(eventBus.published).toHaveLength(1);
  });

  it('rejects distributor without business type', async () => {
    await expect(
      useCase.execute({ ...farmerInput, role: EUserRole.DISTRIBUTOR }),
    ).rejects.toThrow(BusinessTypeRequiredException);
    expect(users.items.size).toBe(0);
    expect(eventBus.published).toEqual([]);
  });

  it('rejects farmer with business type', async () => {
    await expect(
      useCase.execute({
        ...farmerInput,
        businessType: EBusinessType.SEEDS_SEEDLINGS,
      }),
    ).rejects.toThrow(BusinessTypeNotAllowedException);
  });

  it('rejects invalid coordinates before writing anything', async () => {
    await expect(
      useCase.execute({
        ...farmerInput,
        address: { ...farmerInput.address, lat: 100 },
      }),
    ).rejects.toThrow(InvalidCoordinatesException);
    expect(users.items.size).toBe(0);
    expect(addresses.items.size).toBe(0);
    expect(eventBus.published).toEqual([]);
  });
});
