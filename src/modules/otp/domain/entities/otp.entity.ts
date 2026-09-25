import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EOtpBlockReason } from '../enums/otp-block-reason.enum';
import { EOtpPurpose } from '../enums/otp-purpose.enum';
import { EOtpSender } from '../enums/otp-sender.enum';
import { OtpAlreadyConsumedException } from '../exceptions/otp-already-consumed.exception';
import { OtpBlockedException } from '../exceptions/otp-blocked.exception';
import { OtpExpiredException } from '../exceptions/otp-expired.exception';

export type TOtpProps = {
  sender: EOtpSender;
  purpose: EOtpPurpose;
  /** Hash of the normalized identifier (never the plain value). */
  hashedIdentifier: string;
  /** Code encrypted reversibly (resend must read it back). Spec name: hashCode. */
  encryptedCode: string;
  retryCount: number;
  wrongCount: number;
  issuedAt: Date;
  expiredAt: Date;
  isConsumed: boolean;
  blockUntil: Date | null;
  blockReason: EOtpBlockReason | null;
};

export type TIssueOtpProps = {
  sender: EOtpSender;
  purpose: EOtpPurpose;
  hashedIdentifier: string;
  encryptedCode: string;
  ttlSeconds: number;
  now?: Date;
};

export type TOtpAttemptPolicy = {
  maxWrongCount: number;
  wrongBlockSeconds: number;
};

/** VERIFIED: code consumed. WRONG_CODE: attempt counted. BLOCKED: this attempt exceeded the limit. */
export type TOtpVerifyResult = 'VERIFIED' | 'WRONG_CODE' | 'BLOCKED';

export type TOtpResendPolicy = {
  maxRetryCount: number;
  retryBlockSeconds: number;
};

/** RESEND: send the same code again. EXPIRED: issue a new otp instead. BLOCKED: this resend exceeded the limit. */
export type TOtpResendResult = 'RESEND' | 'EXPIRED' | 'BLOCKED';

export class Otp extends AggregateRoot {
  private constructor(
    id: string,
    private props: TOtpProps,
  ) {
    super(id);
  }

  /** Issues a fresh, unconsumed, unblocked code valid for `ttlSeconds`. */
  static issue(input: TIssueOtpProps): Otp {
    const issuedAt = input.now ?? new Date();
    return new Otp(randomUUID(), {
      sender: input.sender,
      purpose: input.purpose,
      hashedIdentifier: input.hashedIdentifier,
      encryptedCode: input.encryptedCode,
      retryCount: 0,
      wrongCount: 0,
      issuedAt,
      expiredAt: new Date(issuedAt.getTime() + input.ttlSeconds * 1000),
      isConsumed: false,
      blockUntil: null,
      blockReason: null,
    });
  }

  static restore(id: string, props: TOtpProps): Otp {
    return new Otp(id, { ...props });
  }

  /**
   * Checks a submitted code against the real one (the caller decrypts `encryptedCode`).
   * Throws if the otp cannot be used. A wrong code is counted; once wrongCount exceeds
   * `maxWrongCount` the otp is blocked for `wrongBlockSeconds`. State changes must be
   * persisted even when the result is not VERIFIED.
   */
  verify(
    submittedCode: string,
    actualCode: string,
    now: Date,
    policy: TOtpAttemptPolicy,
  ): TOtpVerifyResult {
    this.assertNotConsumedNorBlocked(now);
    if (this.isExpired(now)) {
      throw new OtpExpiredException();
    }
    if (submittedCode === actualCode) {
      this.props.isConsumed = true;
      return 'VERIFIED';
    }
    this.props.wrongCount += 1;
    if (this.props.wrongCount > policy.maxWrongCount) {
      this.props.blockUntil = new Date(
        now.getTime() + policy.wrongBlockSeconds * 1000,
      );
      this.props.blockReason = EOtpBlockReason.WRONG_COUNT_MAXIMUM;
      return 'BLOCKED';
    }
    return 'WRONG_CODE';
  }

  /**
   * Asks for the code to be sent again. Throws if consumed or still blocked (even when expired).
   * An expired otp is not counted: the caller issues a new one. Otherwise retryCount is counted;
   * once it exceeds `maxRetryCount` the otp is blocked for `retryBlockSeconds`.
   * State changes must be persisted even when the result is BLOCKED.
   */
  resend(now: Date, policy: TOtpResendPolicy): TOtpResendResult {
    this.assertNotConsumedNorBlocked(now);
    if (this.isExpired(now)) {
      return 'EXPIRED';
    }
    this.props.retryCount += 1;
    if (this.props.retryCount > policy.maxRetryCount) {
      this.props.blockUntil = new Date(
        now.getTime() + policy.retryBlockSeconds * 1000,
      );
      this.props.blockReason = EOtpBlockReason.RETRY_COUNT_MAXIMUM;
      return 'BLOCKED';
    }
    return 'RESEND';
  }

  private assertNotConsumedNorBlocked(now: Date): void {
    if (this.props.isConsumed) {
      throw new OtpAlreadyConsumedException();
    }
    const { blockUntil } = this.props;
    if (blockUntil !== null && now.getTime() < blockUntil.getTime()) {
      throw new OtpBlockedException(blockUntil);
    }
  }

  private isExpired(now: Date): boolean {
    return now.getTime() >= this.props.expiredAt.getTime();
  }

  get sender(): EOtpSender {
    return this.props.sender;
  }

  get purpose(): EOtpPurpose {
    return this.props.purpose;
  }

  get hashedIdentifier(): string {
    return this.props.hashedIdentifier;
  }

  get encryptedCode(): string {
    return this.props.encryptedCode;
  }

  get retryCount(): number {
    return this.props.retryCount;
  }

  get wrongCount(): number {
    return this.props.wrongCount;
  }

  get issuedAt(): Date {
    return this.props.issuedAt;
  }

  get expiredAt(): Date {
    return this.props.expiredAt;
  }

  get isConsumed(): boolean {
    return this.props.isConsumed;
  }

  get blockUntil(): Date | null {
    return this.props.blockUntil;
  }

  get blockReason(): EOtpBlockReason | null {
    return this.props.blockReason;
  }
}
