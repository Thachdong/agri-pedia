import { IsOptional, IsString, IsUUID } from 'class-validator';

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
}
