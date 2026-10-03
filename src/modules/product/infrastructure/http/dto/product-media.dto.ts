import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class ProductMediaDto {
  /** TMP key returned by `POST /media/presign-url`, after the file was PUT to the signed URL. */
  @IsString()
  @Length(1, 512)
  key: string;

  @IsIn(['IMAGE', 'VIDEO', 'FILE'])
  type: 'IMAGE' | 'VIDEO' | 'FILE';

  /** Same extension as sent to presign. */
  @IsString()
  @Length(1, 10)
  extension: string;

  @IsString()
  @Length(1, 255)
  filename: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
