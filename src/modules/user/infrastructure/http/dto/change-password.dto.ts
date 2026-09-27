import { IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  /** Shape only: a malformed value simply fails as a wrong password. */
  @IsString()
  @Length(1, 128)
  oldPassword: string;

  @IsString()
  @Length(8, 128)
  newPassword: string;
}
