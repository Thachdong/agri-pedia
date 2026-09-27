import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { EBusinessType } from '../../../domain';
import { AvatarFileDto, BusinessLicenseFileDto } from './profile-file.dto';

/** Every field is optional; an absent field is kept. */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  /** Spelling follows the API contract. DISTRIBUTOR only; null is rejected for a DISTRIBUTOR (domain rule). */
  @IsOptional()
  @IsEnum(EBusinessType)
  bussinessType?: EBusinessType | null;

  /** New avatar (IMAGE). null or absent: unchanged. */
  @IsOptional()
  @ValidateNested()
  @Type(() => AvatarFileDto)
  avatar?: AvatarFileDto | null;

  /** New business license (IMAGE or FILE). Spelling follows the API contract. null or absent: unchanged. */
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessLicenseFileDto)
  bussinessLicense?: BusinessLicenseFileDto | null;
}
