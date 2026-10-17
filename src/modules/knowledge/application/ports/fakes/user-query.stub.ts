import { IUserQueryPort, TUserRoleSummary } from '@modules/user/contracts';

export const ADMIN_ID = '0f8c7a52-1e0b-4c55-9d4b-1f7b8f6c2a01';
export const FARMER_ID = '5d1f3c6e-2a4b-4e8f-8c7d-9a0b1c2d3e4f';

/** Test helper: user query port knowing an ACTIVE admin (ADMIN_ID) and a farmer (FARMER_ID); add more with `extra`. */
export function stubUserQuery(extra: TUserRoleSummary[] = []): IUserQueryPort {
  const roles = new Map<string, TUserRoleSummary>(
    [
      { userId: ADMIN_ID, role: 'ADMIN' as const, isActive: true },
      { userId: FARMER_ID, role: 'FARMER' as const, isActive: true },
      ...extra,
    ].map((summary) => [summary.userId, summary]),
  );
  return {
    findByIdentifier: async () => null,
    findRoleById: async (userId) => roles.get(userId) ?? null,
    findProfileById: async () => null,
    listProfilesByIds: async () => [],
  };
}
