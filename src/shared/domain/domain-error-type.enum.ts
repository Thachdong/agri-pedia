/** Category of a domain error. The HTTP adapter maps each category to a status code. */
export enum EDomainErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BUSINESS_RULE = 'BUSINESS_RULE',
}
