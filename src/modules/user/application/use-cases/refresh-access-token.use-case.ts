import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
} from '@shared/access-token';
import { CONFIG_SERVICE, IConfigService } from '@shared/config';
import { CRYPTO_SERVICE, ICryptoService } from '@shared/crypto';
import { IUnitOfWork, UNIT_OF_WORK } from '@shared/database';
import {
  ERefreshTokenStatus,
  InvalidRefreshTokenException,
  RefreshToken,
} from '../../domain';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '../ports/refresh-token.repository';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TRefreshAccessTokenInput = {
  refreshToken: string;
};

export type TRefreshAccessTokenOutput = {
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class RefreshAccessTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CRYPTO_SERVICE) private readonly crypto: ICryptoService,
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: IAccessTokenService,
    @Inject(CONFIG_SERVICE) private readonly config: IConfigService,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: IUnitOfWork,
  ) {}

  /**
   * Rotates the refresh token and signs a new access token.
   * - ROTATED within the grace period (a retried/concurrent refresh): the child it was
   *   rotated into is rotated instead, if still ACTIVE.
   * - ROTATED past the grace period, or REVOKED: reuse, the whole family is revoked.
   * Every failure is InvalidRefreshToken. The family revoke is committed first,
   * then the error is thrown outside the transaction.
   */
  async execute(
    input: TRefreshAccessTokenInput,
  ): Promise<TRefreshAccessTokenOutput> {
    const { refreshTokenTtlSeconds, refreshTokenGraceSeconds } =
      this.config.get('auth');
    const hashedToken = this.crypto.hash(input.refreshToken);
    const newRefreshToken = this.crypto.randomToken();
    const now = new Date();

    const userId = await this.unitOfWork.runInTransaction(
      async (): Promise<string | null> => {
        const presented =
          await this.refreshTokens.findByHashedTokenForUpdate(hashedToken);
        if (!presented || presented.isExpired(now)) {
          return null;
        }
        const current = await this.resolveCurrent(
          presented,
          refreshTokenGraceSeconds,
          now,
        );
        if (!current) {
          await this.refreshTokens.revokeFamily(presented.familyId);
          return null;
        }

        const user = await this.users.findByHashedIdentifier(
          current.hashedIdentifier,
        );
        if (!user?.canLogin()) {
          return null;
        }

        const next = current.rotate({
          hashedToken: this.crypto.hash(newRefreshToken),
          ttlSeconds: refreshTokenTtlSeconds,
          now,
        });
        await this.refreshTokens.save(current);
        await this.refreshTokens.save(next);
        return user.id;
      },
    );
    if (!userId) {
      throw new InvalidRefreshTokenException();
    }

    return {
      accessToken: await this.accessTokens.sign({ userId }),
      refreshToken: newRefreshToken,
    };
  }

  /** Token to rotate, or null when the presented token is being reused. */
  private async resolveCurrent(
    presented: RefreshToken,
    graceSeconds: number,
    now: Date,
  ): Promise<RefreshToken | null> {
    if (presented.status === ERefreshTokenStatus.ACTIVE) {
      return presented;
    }
    if (presented.status === ERefreshTokenStatus.REVOKED) {
      return null;
    }
    const child = await this.refreshTokens.findByRotatedFromId(presented.id);
    return child &&
      child.status === ERefreshTokenStatus.ACTIVE &&
      child.isIssuedWithin(graceSeconds, now)
      ? child
      : null;
  }
}
