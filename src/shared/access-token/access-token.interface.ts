export type TAccessTokenPayload = {
  userId: string;
};

/** Issues and checks signed, short-lived access tokens. */
export interface IAccessTokenService {
  sign(payload: TAccessTokenPayload): Promise<string>;
  /** Payload of a valid token; null if malformed, tampered or expired. */
  verify(token: string): Promise<TAccessTokenPayload | null>;
}

export const ACCESS_TOKEN_SERVICE = Symbol('ACCESS_TOKEN_SERVICE');
