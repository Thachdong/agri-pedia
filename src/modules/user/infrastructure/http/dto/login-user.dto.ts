import { IsEnum, IsString, Length } from 'class-validator';
import { ELoginType } from '../../../domain';

/** Shape only: a malformed identifier or password simply fails as invalid credentials. */
export class LoginUserDto {
  @IsEnum(ELoginType)
  loginType: ELoginType;

  @IsString()
  @Length(1, 255)
  identifier: string;

  @IsString()
  @Length(1, 128)
  password: string;
}
