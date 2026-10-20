import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EChatMessageType } from '../../../domain';

export class SendChatMessageDto {
  /** Existing room; wins over receiverId when both are given. */
  @IsOptional()
  @IsUUID()
  roomId?: string;

  /** Opens (or reuses) the room with this user when roomId is absent. */
  @IsOptional()
  @IsUUID()
  receiverId?: string;

  /** 1..2000 characters after trimming (checked by the domain). */
  @IsString()
  message: string;

  /** Default TEXT. */
  @IsOptional()
  @IsEnum(EChatMessageType)
  type?: EChatMessageType;

  /** Required for DIAGNOSIS_REPORT: a COMPLETED diagnosis of the sender (FARMER only). */
  @IsOptional()
  @IsUUID()
  diagnosisId?: string;
}
