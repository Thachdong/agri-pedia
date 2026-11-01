import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  isEmail,
} from 'class-validator';
import {
  EBusinessType,
  ELoginType,
  EUserRole,
  SELF_REGISTER_ROLES,
} from '../../../domain';
import { RegisterAddressDto } from './register-address.dto';

const PHONE_SEPARATORS = /[\s.\-()]/g;
/**
 * Vietnamese mobile number of Viettel (32-39, 86, 96-98), Mobifone (70, 76-79, 89, 90, 93)
 * or Vinaphone (81-85, 88, 91, 94): the carriers OTP SMS is sent to. Checked on the original
 * prefix, so a number ported to or from another carrier is judged by its old carrier.
 */
const VN_PHONE = /^(?:\+84|84|0)(?:3[2-9]|7[06-9]|8[1-689]|9[0134678])\d{7}$/;

/** Validates `identifier` as email or supported Vietnamese mobile number depending on `loginType`. */
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
            ? 'identifier must be a Viettel, Mobifone or Vinaphone phone number'
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

  /** FARMER | DISTRIBUTOR; ADMIN accounts are created by the CLI. */
  @IsIn(SELF_REGISTER_ROLES)
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
