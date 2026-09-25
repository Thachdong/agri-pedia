import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Body written by DomainExceptionFilter. */
export class DomainErrorResponse {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'USER_IDENTIFIER_ALREADY_USED' })
  code: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  details?: Record<string, unknown>;
}

/** Body written by the global ValidationPipe. */
export class ValidationErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({
    type: [String],
    example: ['password must be longer than or equal to 8 characters'],
  })
  message: string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
