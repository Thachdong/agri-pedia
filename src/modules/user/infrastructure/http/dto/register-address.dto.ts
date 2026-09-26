import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegisterAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  province: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  ward: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  houseNumber: string;

  /** Range is checked by the domain (Coordinates). */
  @IsNumber({ allowNaN: false, allowInfinity: false })
  lat: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  long: number;

  /** Accepted for contract compatibility; the first address is always primary. */
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
