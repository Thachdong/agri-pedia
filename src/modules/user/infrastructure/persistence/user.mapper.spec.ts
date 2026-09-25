import { EBusinessType, ELoginType, EUserRole, User } from '../../domain';
import { UserMapper } from './user.mapper';

describe('UserMapper', () => {
  it('round-trips domain -> orm -> domain keeping all fields', () => {
    const user = User.register({
      loginType: ELoginType.PHONE,
      hashedIdentifier: 'hash',
      encryptedIdentifier: 'enc',
      passwordHash: 'pwd',
      username: 'shop',
      role: EUserRole.DISTRIBUTOR,
      businessType: EBusinessType.SEEDS_SEEDLINGS,
      bio: 'bio',
    });

    const restored = UserMapper.toDomain(UserMapper.toOrm(user));

    expect(UserMapper.toOrm(restored)).toEqual(UserMapper.toOrm(user));
    expect(restored.id).toBe(user.id);
  });
});
