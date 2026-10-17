import { Inject, Injectable } from '@nestjs/common';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  ELoginType,
  Identifier,
  User,
  UserIdentifierAlreadyUsedException,
} from '../../domain';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TCreateAdminInput = {
  loginType: ELoginType;
  identifier: string;
  password: string;
  /** Defaults to the normalized identifier. */
  username?: string | null;
};

export type TCreateAdminOutput = { userId: string };

/** Creates an ACTIVE ADMIN account (back office, run from the CLI); no address, no event. */
@Injectable()
export class CreateAdminUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  async execute(input: TCreateAdminInput): Promise<TCreateAdminOutput> {
    const identifier = Identifier.create(input.loginType, input.identifier);
    const hashedIdentifier = this.crypto.hash(identifier.value);
    const passwordHash = await this.crypto.hashPassword(input.password);

    const admin = await this.unitOfWork.runInTransaction(async () => {
      if (await this.users.existsByHashedIdentifier(hashedIdentifier)) {
        throw new UserIdentifierAlreadyUsedException();
      }
      const created = User.createAdmin({
        loginType: identifier.loginType,
        hashedIdentifier,
        encryptedIdentifier: this.crypto.encrypt(identifier.value),
        passwordHash,
        username: input.username?.trim() || identifier.value,
      });
      await this.users.save(created);
      return created;
    });
    return { userId: admin.id };
  }
}
