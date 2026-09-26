import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { ERefreshTokenStatus } from '../enums/refresh-token-status.enum';

export type TRefreshTokenProps = {
  /** Shared by every token rotated from the same login. */
  familyId: string;
  hashedToken: string;
  /** Owner, same hash as User.hashedIdentifier. */
  hashedIdentifier: string;
  issuedAt: Date;
  expiredAt: Date;
  status: ERefreshTokenStatus;
  rotatedFromId: string | null;
};

export type TIssueRefreshTokenProps = {
  hashedToken: string;
  hashedIdentifier: string;
  ttlSeconds: number;
  now?: Date;
};

/** Stores only the hash of a refresh token; the raw token is given to the client once. */
export class RefreshToken extends AggregateRoot {
  private constructor(
    id: string,
    private props: TRefreshTokenProps,
  ) {
    super(id);
  }

  /** First token of a new family (a login). */
  static issue(input: TIssueRefreshTokenProps): RefreshToken {
    const issuedAt = input.now ?? new Date();
    return new RefreshToken(randomUUID(), {
      familyId: randomUUID(),
      hashedToken: input.hashedToken,
      hashedIdentifier: input.hashedIdentifier,
      issuedAt,
      expiredAt: new Date(issuedAt.getTime() + input.ttlSeconds * 1000),
      status: ERefreshTokenStatus.ACTIVE,
      rotatedFromId: null,
    });
  }

  static restore(id: string, props: TRefreshTokenProps): RefreshToken {
    return new RefreshToken(id, { ...props });
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get hashedToken(): string {
    return this.props.hashedToken;
  }

  get hashedIdentifier(): string {
    return this.props.hashedIdentifier;
  }

  get issuedAt(): Date {
    return this.props.issuedAt;
  }

  get expiredAt(): Date {
    return this.props.expiredAt;
  }

  get status(): ERefreshTokenStatus {
    return this.props.status;
  }

  get rotatedFromId(): string | null {
    return this.props.rotatedFromId;
  }
}
