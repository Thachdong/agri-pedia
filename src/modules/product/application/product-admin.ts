import { IUserQueryPort } from '@modules/user/contracts';
import { CatalogItem, ProductAdminRequiredException } from '../domain';

/** Throws ProductAdminRequiredException unless `userId` is an ACTIVE admin. */
export async function assertProductAdmin(
  userQuery: IUserQueryPort,
  userId: string,
): Promise<void> {
  const user = await userQuery.findRoleById(userId);
  if (!user || user.role !== 'ADMIN' || !user.isActive) {
    throw new ProductAdminRequiredException(userId);
  }
}

export type TCatalogItemOutput = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toCatalogItemOutput(item: CatalogItem): TCatalogItemOutput {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
