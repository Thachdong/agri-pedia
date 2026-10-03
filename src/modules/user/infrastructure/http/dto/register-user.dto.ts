import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  isEmail,
} from 'class-validator';
import { EBusinessType, ELoginType, EUserRole } from '../../../domain';
import { RegisterAddressDto } from './register-address.dto';

const PHONE_SEPARATORS = /[\s.\-()]/g;
const VN_PHONE = /^(?:\+84|84|0)\d{9}$/;

/** Validates `identifier` as email or Vietnamese phone number depending on `loginType`. */
const IsIdentifierOfLoginType =
  (): PropertyDecorator => (target, propertyName) =>
    registerDecorator({
      name: 'isIdentifierOfLoginType',
      target: target.constructor,
      propertyName: propertyName as string,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          const { loginType } = args.object as RegisterUserDto;
          if (loginType === ELoginType.EMAIL) {
            return isEmail(value.trim());
          }
          if (loginType === ELoginType.PHONE) {
            return VN_PHONE.test(value.replace(PHONE_SEPARATORS, ''));
          }
          return false;
        },
        defaultMessage(args: ValidationArguments): string {
          const { loginType } = args.object as RegisterUserDto;
          return loginType === ELoginType.PHONE
            ? 'identifier must be a valid phone number'
            : 'identifier must be a valid email';
        },
      },
    });

export class RegisterUserDto {
  @IsEnum(ELoginType)
  loginType: ELoginType;

  @MaxLength(255)
  @IsIdentifierOfLoginType()
  identifier: string;

  @IsString()
  @Length(8, 128)
  password: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  username?: string;

  @IsEnum(EUserRole)
  role: EUserRole;

  /** Spelling follows the API contract. Required for DISTRIBUTOR, null for FARMER (domain rule). */
  @IsOptional()
  @IsEnum(EBusinessType)
  bussinessType?: EBusinessType | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => RegisterAddressDto)
  address: RegisterAddressDto;
}
