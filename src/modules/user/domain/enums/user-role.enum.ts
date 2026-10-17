export enum EUserRole {
  FARMER = 'FARMER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  /** Back-office account; created by `npm run create-admin`, never through registration. */
  ADMIN = 'ADMIN',
}

/** Roles a user may pick when registering. */
export const SELF_REGISTER_ROLES: readonly EUserRole[] = [
  EUserRole.FARMER,
  EUserRole.DISTRIBUTOR,
];
