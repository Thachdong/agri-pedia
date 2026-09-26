import {
  EBusinessType,
  ELoginType,
  EUserRole,
  EUserStatus,
  User,
} from '../../domain';
import { UserOrmEntity } from './user.orm-entity';

export class UserMapper {
  static toDomain(row: UserOrmEntity): User {
    return User.restore(row.id, {
      loginType: row.loginType as ELoginType,
      hashedIdentifier: row.hashedIdentifier,
      encryptedIdentifier: row.encryptedIdentifier,
      passwordHash: row.passwordHash,
      username: row.username,
      role: row.role as EUserRole,
      businessType: row.businessType as EBusinessType | null,
      status: row.status as EUserStatus,
      identifierVerifiedAt: row.identifierVerifiedAt,
      avatar: row.avatar,
      bio: row.bio,
      businessLicense: row.businessLicense,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toOrm(user: User): UserOrmEntity {
    return Object.assign(new UserOrmEntity(), {
      id: user.id,
      loginType: user.loginType,
      hashedIdentifier: user.hashedIdentifier,
      encryptedIdentifier: user.encryptedIdentifier,
      passwordHash: user.passwordHash,
      username: user.username,
      role: user.role,
      businessType: user.businessType,
      status: user.status,
      identifierVerifiedAt: user.identifierVerifiedAt,
      avatar: user.avatar,
      bio: user.bio,
      businessLicense: user.businessLicense,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
