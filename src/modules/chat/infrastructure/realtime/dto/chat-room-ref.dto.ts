import { IsUUID } from 'class-validator';

export class ChatRoomRefDto {
  @IsUUID()
  roomId: string;
}
