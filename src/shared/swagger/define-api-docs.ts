import { HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { EDomainErrorType } from '../domain';
import { DOMAIN_ERROR_HTTP_STATUS } from '../http';
import {
  DomainErrorResponse,
  ValidationErrorResponse,
} from './error-responses';

export type TApiErrorDoc = { type: EDomainErrorType; code: string };

/** Security scheme name registered in setupSwagger. */
export const ACCESS_TOKEN_SCHEME = 'access-token';

/** Thrown by AccessTokenGuard (@shared/access-token). */
const INVALID_ACCESS_TOKEN_ERROR: TApiErrorDoc = {
  type: EDomainErrorType.UNAUTHORIZED,
  code: 'AUTH_INVALID_ACCESS_TOKEN',
};

export type TApiOperationDoc = {
  summary: string;
  description?: string;
  /** Endpoint has a validated body/query: documents the ValidationPipe 400. */
  validation?: boolean;
  /** Domain exceptions the endpoint can throw. */
  errors?: TApiErrorDoc[];
  /** Behind AccessTokenGuard: documents the bearer scheme and AUTH_INVALID_ACCESS_TOKEN (401). */
  auth?: boolean;
};

type TControllerMethod<T> = {
  [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

export type TApiDocs<T> = {
  tag: string;
  /** Every public handler must be documented. */
  operations: Record<TControllerMethod<T>, TApiOperationDoc>;
};

const errorResponses = (doc: TApiOperationDoc): MethodDecorator[] => {
  const codesByStatus = new Map<number, string[]>();
  const errors = doc.auth
    ? [INVALID_ACCESS_TOKEN_ERROR, ...(doc.errors ?? [])]
    : (doc.errors ?? []);
  for (const error of errors) {
    const status = DOMAIN_ERROR_HTTP_STATUS[error.type];
    codesByStatus.set(status, [
      ...(codesByStatus.get(status) ?? []),
      error.code,
    ]);
  }

  const decorators: MethodDecorator[] = [];
  if (doc.validation) {
    const domainCodes = codesByStatus.get(HttpStatus.BAD_REQUEST);
    codesByStatus.delete(HttpStatus.BAD_REQUEST);
    decorators.push(
      domainCodes
        ? ApiResponse({
            status: HttpStatus.BAD_REQUEST,
            description: `Request validation failed, or: ${domainCodes.join(', ')}`,
            schema: {
              oneOf: [
                { $ref: getSchemaPath(ValidationErrorResponse) },
                { $ref: getSchemaPath(DomainErrorResponse) },
              ],
            },
          })
        : ApiResponse({
            status: HttpStatus.BAD_REQUEST,
            description: 'Request validation failed',
            type: ValidationErrorResponse,
          }),
    );
  }

  for (const [status, codes] of codesByStatus) {
    decorators.push(
      ApiResponse({
        status,
        description: codes.join(', '),
        type: DomainErrorResponse,
      }),
    );
  }
  return decorators;
};

/**
 * Attaches Swagger metadata to a controller from outside, so the controller stays free of
 * doc decorators. Request/response schemas come from the Swagger CLI plugin at `nest build`.
 * Call in `<controller>.api-docs.ts`, side-effect imported by the module file.
 */
export const defineApiDocs = <T>(
  controller: new (...args: never[]) => T,
  docs: TApiDocs<T>,
): void => {
  ApiTags(docs.tag)(controller);
  ApiExtraModels(DomainErrorResponse, ValidationErrorResponse)(controller);

  for (const [method, doc] of Object.entries<TApiOperationDoc>(
    docs.operations,
  )) {
    const descriptor = Object.getOwnPropertyDescriptor(
      controller.prototype,
      method,
    );
    const decorators = [
      ApiOperation({ summary: doc.summary, description: doc.description }),
      ...errorResponses(doc),
      ...(doc.auth ? [ApiBearerAuth(ACCESS_TOKEN_SCHEME)] : []),
    ];
    for (const decorate of decorators) {
      decorate(controller.prototype, method, descriptor);
    }
  }
};
