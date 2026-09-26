export type TUserIdentifierSummary = {
  userId: string;
  /** Normalized identifier (email lowercase, phone digits): where messages are sent. */
  identifier: string;
  /** Same hash other modules store for this identifier (e.g. otp). */
  hashedIdentifier: string;
  /** Login type the account was registered with. */
  loginType: 'EMAIL' | 'PHONE';
  /** Account may log in (ACTIVE). */
  canLogin: boolean;
};

export interface IUserQueryPort {
  /** Raw identifier as typed by a client (email or phone, any casing/separators). */
  findByIdentifier(identifier: string): Promise<TUserIdentifierSummary | null>;
}
