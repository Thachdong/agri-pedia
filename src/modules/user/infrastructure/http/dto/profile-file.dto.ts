import { IsIn, IsString, Length } from 'class-validator';

class ProfileFileDto {
  /** TMP key returned by `POST /media/presign-url`, after the file was PUT to the signed URL. */
  @IsString()
  @Length(1, 512)
  key: string;

  /** Same extension as sent to presign. */
  @IsString()
  @Length(1, 10)
  extension: string;

  @IsString()
  @Length(1, 255)
  filename: string;
}

export class AvatarFileDto extends ProfileFileDto {
  @IsIn(['IMAGE'])
  type: 'IMAGE';
}

export class BusinessLicenseFileDto extends ProfileFileDto {
  @IsIn(['IMAGE', 'FILE'])
  type: 'IMAGE' | 'FILE';
}
