import { EBusinessType } from '../enums/business-type.enum';
import { ELoginType } from '../enums/login-type.enum';
import { EUserRole } from '../enums/user-role.enum';
import { EUserStatus } from '../enums/user-status.enum';
import { BusinessTypeNotAllowedException } from '../exceptions/business-type-not-allowed.exception';
import { BusinessTypeRequiredException } from '../exceptions/business-type-required.exception';
import { UserNotActiveException } from '../exceptions/user-not-active.exception';
import { USER_IDENTIFIER_VERIFICATION_REQUESTED } from '../events/user-identifier-verification-requested.domain-event';
import { TRegisterUserProps, User } from './user.entity';

const base: TRegisterUserProps = {
  loginType: ELoginType.EMAIL,
  hashedIdentifier: 'hash',
  encryptedIdentifier: 'enc',
  passwordHash: 'pwd',
  username: '  farmer01  ',
  role: EUserRole.FARMER,
  businessType: null,
};

describe('User.register', () => {
  it('registers an ACTIVE farmer without business type', () => {
    const user = User.register(base);
    expect(user.id).toEqual(expect.any(String));
    expect(user.status).toBe(EUserStatus.ACTIVE);
    expect(user.businessType).toBeNull();
    expect(user.username).toBe('farmer01');
    expect(user.identifierVerifiedAt).toBeNull();
    expect(user.avatar).toBeNull();
    expect(user.businessLicense).toBeNull();
    expect(user.bio).toBeNull();
    expect(user.createdAt).toEqual(user.updatedAt);
  });

  it('registers a PENDING distributor with business type', () => {
    const user = User.register({
      ...base,
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
      bio: 'seed shop',
    });
    expect(user.status).toBe(EUserStatus.PENDING);
    expect(user.businessType).toBe(EBusinessType.SEEDS_SEEDLINGS);
    expect(user.bio).toBe('seed shop');
  });

  it('requires business type for distributor', () => {
    expect(() =>
      User.register({ ...base, role: EUserRole.DISTRIBUTOR }),
    ).toThrow(BusinessTypeRequiredException);
  });

  it('rejects business type for farmer', () => {
    expect(() =>
      User.register({ ...base, businessType: EBusinessType.SEEDS_SEEDLINGS }),
    ).toThrow(BusinessTypeNotAllowedException);
  });

  it('requests identifier verification for a pending distributor', () => {
    const user = User.register({
      ...base,
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.AQUACULTURE_SEEDLINGS,
    });
    expect(user.pullEvents()).toEqual([
      {
        name: USER_IDENTIFIER_VERIFICATION_REQUESTED,
        occurredAt: expect.any(Date),
        payload: { userId: user.id, loginType: ELoginType.EMAIL },
      },
    ]);
    expect(user.pullEvents()).toEqual([]);
  });

  it('records no event for an active farmer', () => {
    expect(User.register(base).pullEvents()).toEqual([]);
  });

  it('restores without changing state', () => {
    const user = User.register(base);
    const restored = User.restore(user.id, {
      loginType: user.loginType,
      hashedIdentifier: user.hashedIdentifier,
      encryptedIdentifier: user.encryptedIdentifier,
      passwordHash: user.passwordHash,
      username: user.username,
      role: user.role,
      businessType: user.businessType,
      status: EUserStatus.PENDING,
      identifierVerifiedAt: null,
      avatar: null,
      bio: null,
      businessLicense: null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
    expect(restored.id).toBe(user.id);
    expect(restored.status).toBe(EUserStatus.PENDING);
    expect(restored.pullEvents()).toEqual([]);
  });
});

describe('User.activate', () => {
  const distributor = () =>
    User.register({
      ...base,
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });

  it('activates a pending user and records verification time', () => {
    const user = distributor();
    const now = new Date('2026-09-26T10:00:00.000Z');
    user.activate(now);
    expect(user.status).toBe(EUserStatus.ACTIVE);
    expect(user.identifierVerifiedAt).toEqual(now);
    expect(user.updatedAt).toEqual(now);
  });

  it('is a no-op for an active user', () => {
    const user = User.register(base);
    const updatedAt = user.updatedAt;
    user.activate(new Date('2030-01-01T00:00:00.000Z'));
    expect(user.status).toBe(EUserStatus.ACTIVE);
    expect(user.identifierVerifiedAt).toBeNull();
    expect(user.updatedAt).toBe(updatedAt);
  });
});

describe('User.canLogin / assertCanLogin', () => {
  it('allows an ACTIVE user', () => {
    const user = User.register(base);
    expect(user.canLogin()).toBe(true);
    expect(() => user.assertCanLogin()).not.toThrow();
  });

  it('rejects a PENDING distributor', () => {
    const user = User.register({
      ...base,
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });
    expect(user.canLogin()).toBe(false);
    expect(() => user.assertCanLogin()).toThrow(UserNotActiveException);
  });
});

describe('User.changePassword', () => {
  it('replaces the password hash and touches updatedAt', () => {
    const user = User.register(base);
    const now = new Date(user.updatedAt.getTime() + 60_000);

    user.changePassword('pwd(new-secret)', now);

    expect(user.passwordHash).toBe('pwd(new-secret)');
    expect(user.updatedAt).toEqual(now);
    expect(user.createdAt).not.toEqual(now);
  });
});

describe('User.updateProfile', () => {
  const distributor = () =>
    User.register({
      ...base,
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
    });

  it('applies given fields, trims username and touches updatedAt', () => {
    const user = distributor();
    const now = new Date(user.updatedAt.getTime() + 60_000);

    user.updateProfile(
      {
        username: '  shop02  ',
        bio: 'new bio',
        businessType: EBusinessType.AQUACULTURE_SEEDLINGS,
        avatar: 'avatar-media-id',
        businessLicense: 'license-media-id',
      },
      now,
    );

    expect(user.username).toBe('shop02');
    expect(user.bio).toBe('new bio');
    expect(user.businessType).toBe(EBusinessType.AQUACULTURE_SEEDLINGS);
    expect(user.avatar).toBe('avatar-media-id');
    expect(user.businessLicense).toBe('license-media-id');
    expect(user.updatedAt).toEqual(now);
  });

  it('leaves undefined fields unchanged', () => {
    const user = User.register({ ...base, bio: 'old bio' });
    user.updateProfile({ avatar: 'avatar-media-id' });

    user.updateProfile({ username: 'farmer02' });

    expect(user.username).toBe('farmer02');
    expect(user.bio).toBe('old bio');
    expect(user.businessType).toBeNull();
    expect(user.avatar).toBe('avatar-media-id');
    expect(user.businessLicense).toBeNull();
  });

  it('rejects a business type for a farmer and changes nothing', () => {
    const user = User.register(base);

    expect(() =>
      user.updateProfile({
        username: 'farmer02',
        businessType: EBusinessType.SEEDS_SEEDLINGS,
      }),
    ).toThrow(BusinessTypeNotAllowedException);
    expect(user.username).toBe('farmer01');
    expect(user.businessType).toBeNull();
  });

  it('accepts a null business type for a farmer', () => {
    const user = User.register(base);

    user.updateProfile({ businessType: null });

    expect(user.businessType).toBeNull();
  });

  it('requires a business type for a distributor', () => {
    const user = distributor();

    expect(() => user.updateProfile({ businessType: null })).toThrow(
      BusinessTypeRequiredException,
    );
    expect(user.businessType).toBe(EBusinessType.SEEDS_SEEDLINGS);
  });
});
