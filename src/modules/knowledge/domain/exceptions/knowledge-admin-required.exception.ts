import { DomainException, EDomainErrorType } from '@shared/domain';

/** The caller is not an ACTIVE admin. */
export class KnowledgeAdminRequiredException extends DomainException {
  constructor(userId: string) {
    super(
      'KNOWLEDGE_ADMIN_REQUIRED',
      'Only an admin can manage articles',
      EDomainErrorType.FORBIDDEN,
      { userId },
    );
  }
}
