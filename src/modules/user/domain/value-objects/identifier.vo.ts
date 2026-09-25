import { ELoginType } from '../enums/login-type.enum';

/**
 * Login identifier (email or phone) in canonical form, so equal identifiers hash equally.
 * Never persisted as-is: the user stores only its hash and its encrypted form.
 * Format validation happens at the HTTP boundary.
 */
export class Identifier {
  private constructor(
    readonly loginType: ELoginType,
    readonly value: string,
  ) {}

  static create(loginType: ELoginType, raw: string): Identifier {
    const trimmed = raw.trim();
    const value =
      loginType === ELoginType.EMAIL
        ? trimmed.toLowerCase()
        : trimmed.replace(/[\s.\-()]/g, '');
    return new Identifier(loginType, value);
  }
}
