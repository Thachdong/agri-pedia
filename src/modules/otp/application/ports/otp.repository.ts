import { Otp } from '../../domain';

export interface IOtpRepository {
  save(otp: Otp): Promise<void>;
}

export const OTP_REPOSITORY = Symbol('OTP_REPOSITORY');
