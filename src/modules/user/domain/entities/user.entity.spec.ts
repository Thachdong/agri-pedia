import { EBusinessType } from '../enums/business-type.enum';
import { ELoginType } from '../enums/login-type.enum';
import { EUserRole } from '../enums/user-role.enum';
import { EUserStatus } from '../enums/user-status.enum';
import { BusinessTypeNotAllowedException } from '../exceptions/business-type-not-allowed.exception';
import { BusinessTypeRequiredException } from '../exceptions/business-type-required.exception';
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
  });
});
