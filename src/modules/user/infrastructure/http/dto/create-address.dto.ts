import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  /** Province codename. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  province: string;

  /** Ward codename of that province. */
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

  /** Default false; true makes it the primary address (the current primary is unmarked). */
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
