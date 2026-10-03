import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ActivateAccountDto {
  /** Email or phone used at registration, any casing/separators. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  identifier: string;

  @IsString()
  @Matches(/^\d{4,10}$/, { message: 'code must be 4 to 10 digits' })
  code: string;
}
