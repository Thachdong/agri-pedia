import { IsString, Length } from 'class-validator';

export class RefreshAccessTokenDto {
  @IsString()
  @Length(1, 512)
  refreshToken: string;
}
