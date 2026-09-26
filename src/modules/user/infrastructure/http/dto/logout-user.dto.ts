import { IsString, Length } from 'class-validator';

export class LogoutUserDto {
  @IsString()
  @Length(1, 512)
  refreshToken: string;
}
