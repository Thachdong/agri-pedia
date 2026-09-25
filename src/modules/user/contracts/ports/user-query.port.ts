export type TUserIdentifierSummary = {
  userId: string;
  /** Same hash other modules store for this identifier (e.g. otp). */
  hashedIdentifier: string;
};

export interface IUserQueryPort {
  /** Raw identifier as typed by a client (email or phone, any casing/separators). */
  findByIdentifier(identifier: string): Promise<TUserIdentifierSummary | null>;
}
