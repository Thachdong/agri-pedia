import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EOtpPurpose } from '../../../domain';

export class ResendCodeDto {
  /** Email or phone used at registration, any casing/separators. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  /** Which code to resend: account activation or password reset. */
  @IsEnum(EOtpPurpose)
  purpose: EOtpPurpose;
}
