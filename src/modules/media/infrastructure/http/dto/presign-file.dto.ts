import { IsEnum, IsString, Length } from 'class-validator';
import { EMediaType } from '../../../domain';

export class PresignFileDto {
  /** Original file name; kept by the client and sent again when the upload is confirmed. */
  @IsString()
  @Length(1, 255)
  filename: string;

  /** Allowed per type: IMAGE jpg/jpeg/png/webp, VIDEO mp4/mov, FILE pdf. */
  @IsString()
  @Length(1, 10)
  extension: string;

  @IsEnum(EMediaType)
  type: EMediaType;
}
