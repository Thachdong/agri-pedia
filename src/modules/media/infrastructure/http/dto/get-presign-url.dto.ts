import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { PresignFileDto } from './presign-file.dto';

export const MAX_FILES_PER_PRESIGN = 10;

export class GetPresignUrlDto {
  /** 1..10 files; one signed URL is returned per file, in the same order. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_FILES_PER_PRESIGN)
  @ValidateNested({ each: true })
  @Type(() => PresignFileDto)
  files: PresignFileDto[];
}
