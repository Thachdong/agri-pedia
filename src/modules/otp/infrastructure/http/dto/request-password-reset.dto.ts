import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EOtpSender } from '../../../domain';

export class RequestPasswordResetDto {
  /** Login type of the account: the code is sent by email or SMS accordingly. */
  @IsEnum(EOtpSender)
  loginType: EOtpSender;

  /** Email or phone used at registration, any casing/separators. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}
