import { EOtpPurpose, Otp } from '../../domain';

export interface IOtpRepository {
  /** Most recently issued otp for the identifier and purpose; locks it for the current transaction. */
  findLatest(
    hashedIdentifier: string,
    purpose: EOtpPurpose,
  ): Promise<Otp | null>;
  save(otp: Otp): Promise<void>;
}

export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');
