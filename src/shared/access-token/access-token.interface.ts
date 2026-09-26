export type TAccessTokenPayload = {
  userId: string;
};

/** Issues signed, short-lived access tokens. */
export interface IAccessTokenService {
  sign(payload: TAccessTokenPayload): Promise<string>;
}

export const ACCESS_TOKEN_SERVICE = Symbol('ACCESS_TOKEN_SERVICE');
