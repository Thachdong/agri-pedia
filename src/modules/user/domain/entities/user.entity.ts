import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EBusinessType } from '../enums/business-type.enum';
import { ELoginType } from '../enums/login-type.enum';
import { EUserRole } from '../enums/user-role.enum';
import { EUserStatus } from '../enums/user-status.enum';
import { BusinessTypeNotAllowedException } from '../exceptions/business-type-not-allowed.exception';
import { BusinessTypeRequiredException } from '../exceptions/business-type-required.exception';
import { userRegistered } from '../events/user-registered.domain-event';

export type TUserProps = {
  loginType: ELoginType;
  hashedIdentifier: string;
  encryptedIdentifier: string;
  passwordHash: string;
  username: string;
  role: EUserRole;
  businessType: EBusinessType | null;
  status: EUserStatus;
  identifierVerifiedAt: Date | null;
  /** Media id. */
  avatar: string | null;
  bio: string | null;
  /** Media id. */
  businessLicense: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TRegisterUserProps = {
  loginType: ELoginType;
  hashedIdentifier: string;
  encryptedIdentifier: string;
  passwordHash: string;
  username: string;
  role: EUserRole;
  businessType: EBusinessType | null;
  bio?: string | null;
};

export class User extends AggregateRoot {
  private constructor(
    id: string,
    private props: TUserProps,
  ) {
    super(id);
  }

  /**
   * Registers a new user. FARMER is active immediately; DISTRIBUTOR stays PENDING
   * until the identifier is verified. Only DISTRIBUTOR has (and must have) a business type.
   */
  static register(input: TRegisterUserProps): User {
    User.assertBusinessType(input.role, input.businessType);
    const now = new Date();
    const user = new User(randomUUID(), {
      loginType: input.loginType,
      hashedIdentifier: input.hashedIdentifier,
      encryptedIdentifier: input.encryptedIdentifier,
      passwordHash: input.passwordHash,
      username: input.username.trim(),
      role: input.role,
      businessType: input.businessType,
      status:
        input.role === EUserRole.FARMER
          ? EUserStatus.ACTIVE
          : EUserStatus.PENDING,
      identifierVerifiedAt: null,
      avatar: null,
      bio: input.bio ?? null,
      businessLicense: null,
      createdAt: now,
      updatedAt: now,
    });
    user.addEvent(
      userRegistered({
        userId: user.id,
        loginType: user.loginType,
        role: user.role,
        status: user.status,
      }),
    );
    return user;
  }

  static restore(id: string, props: TUserProps): User {
    return new User(id, { ...props });
  }

  private static assertBusinessType(
    role: EUserRole,
    businessType: EBusinessType | null,
  ): void {
    if (role === EUserRole.DISTRIBUTOR && businessType === null) {
      throw new BusinessTypeRequiredException(role);
    }
    if (role !== EUserRole.DISTRIBUTOR && businessType !== null) {
      throw new BusinessTypeNotAllowedException(role);
    }
  }

  get loginType(): ELoginType {
    return this.props.loginType;
  }

  get hashedIdentifier(): string {
    return this.props.hashedIdentifier;
  }

  get encryptedIdentifier(): string {
    return this.props.encryptedIdentifier;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get username(): string {
    return this.props.username;
  }

  get role(): EUserRole {
    return this.props.role;
  }

  get businessType(): EBusinessType | null {
    return this.props.businessType;
  }

  get status(): EUserStatus {
    return this.props.status;
  }

  get identifierVerifiedAt(): Date | null {
    return this.props.identifierVerifiedAt;
  }

  get avatar(): string | null {
    return this.props.avatar;
  }

  get bio(): string | null {
    return this.props.bio;
  }

  get businessLicense(): string | null {
    return this.props.businessLicense;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
