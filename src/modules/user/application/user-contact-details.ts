import { IMediaQueryPort } from '@modules/media/contracts';
import { ICryptoService } from '@shared/crypto';
import { ELoginType, User } from '../domain';

export type TUserContactDetails = {
  /** Decrypted identifier when the user logs in by email; otherwise null. */
  email: string | null;
  /** Decrypted identifier when the user logs in by phone; otherwise null. */
  phone: string | null;
  /** Signed read URL of the business license; null if none (or its media is gone). */
  businessLicense: string | null;
  /** Signed read URL of the avatar; null if none (or its media is gone). */
  avatar: string | null;
};

/** Contact identifier and media URLs (business license, avatar) shown on a user profile. */
export const readUserContactDetails = async (
  user: User,
  crypto: ICryptoService,
  mediaQuery: IMediaQueryPort,
): Promise<TUserContactDetails> => {
  const identifier = crypto.decrypt(user.encryptedIdentifier);
  const [[license], [avatar]] = await Promise.all([
    user.businessLicense
      ? mediaQuery.findUrls('USER_LICENSE', user.id, [user.businessLicense])
      : [],
    user.avatar
      ? mediaQuery.findUrls('USER_AVATAR', user.id, [user.avatar])
      : [],
  ]);
  return {
    email: user.loginType === ELoginType.EMAIL ? identifier : null,
    phone: user.loginType === ELoginType.PHONE ? identifier : null,
    businessLicense: license?.url ?? null,
    avatar: avatar?.url ?? null,
  };
};
