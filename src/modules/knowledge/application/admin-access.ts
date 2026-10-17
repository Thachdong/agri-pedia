import { IUserQueryPort } from '@modules/user/contracts';
import { KnowledgeAdminRequiredException } from '../domain';

/** Throws KnowledgeAdminRequiredException unless `userId` is an ACTIVE admin. */
export async function assertArticleAdmin(
  userQuery: IUserQueryPort,
  userId: string,
): Promise<void> {
  const user = await userQuery.findRoleById(userId);
  if (!user || user.role !== 'ADMIN' || !user.isActive) {
    throw new KnowledgeAdminRequiredException(userId);
  }
}
