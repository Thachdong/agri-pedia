import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResendActivationCodeDto {
  /** Email or phone used at registration, any casing/separators. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;
}
