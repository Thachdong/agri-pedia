import { randomUUID } from 'node:crypto';
import { AggregateRoot } from '@shared/domain';
import { EOtpBlockReason } from '../enums/otp-block-reason.enum';
import { EOtpPurpose } from '../enums/otp-purpose.enum';
import { EOtpSender } from '../enums/otp-sender.enum';

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
