import { Inject, Injectable } from '@nestjs/common';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUserRepository, USER_REPOSITORY } from '../../application/ports';
import { IUserQueryPort, TUserIdentifierSummary } from '../../contracts';
import { ELoginType, Identifier } from '../../domain';

@Injectable()
export class UserQueryService implements IUserQueryPort {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
  ) {}

  async findByIdentifier(
    identifier: string,
  ): Promise<TUserIdentifierSummary | null> {
    // Callers have no login type: an email always contains '@', a phone never does.
    const loginType = identifier.includes('@')
      ? ELoginType.EMAIL
      : ELoginType.PHONE;
    const hashedIdentifier = this.crypto.hash(
      Identifier.create(loginType, identifier).value,
    );
    const user = await this.users.findByHashedIdentifier(hashedIdentifier);
    return user ? { userId: user.id, hashedIdentifier } : null;
  }
}
