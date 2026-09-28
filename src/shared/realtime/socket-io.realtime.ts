import { Inject } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ACCESS_TOKEN_SERVICE,
  IAccessTokenService,
  InvalidAccessTokenException,
  TAccessTokenPayload,
} from '@shared/access-token';
import { IRealtimePublisher } from './realtime.interface';

export type TAuthenticatedSocketData = { auth?: TAccessTokenPayload };

const BEARER = /^Bearer\s+(\S+)$/i;

const userRoom = (userId: string) => `user:${userId}`;

/**
 * Owns the socket.io server: rejects handshakes without a valid access token
 * (`auth.token`, or `Authorization: Bearer` header) and puts every connection
 * in its user's room so events can target a user.
 */
@WebSocketGateway()
export class SocketIoRealtimeGateway
  implements
    OnGatewayInit<Server>,
    OnGatewayConnection<Socket>,
    IRealtimePublisher
{
  @WebSocketServer()
  private server?: Server;

  constructor(
    @Inject(ACCESS_TOKEN_SERVICE)
    private readonly accessTokens: IAccessTokenService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      this.authenticate(socket).then(
        (auth) => {
          if (!auth) {
            next(new Error(new InvalidAccessTokenException().code));
            return;
          }
          (socket.data as TAuthenticatedSocketData).auth = auth;
          next();
        },
        (error: Error) => next(error),
      );
    });
  }

  handleConnection(socket: Socket): void {
    const { auth } = socket.data as TAuthenticatedSocketData;
    if (auth) {
      void socket.join(userRoom(auth.userId));
    }
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  private async authenticate(
    socket: Socket,
  ): Promise<TAccessTokenPayload | null> {
    const fromAuth: unknown = socket.handshake.auth?.token;
    const token =
      typeof fromAuth === 'string'
        ? fromAuth
        : BEARER.exec(socket.handshake.headers.authorization ?? '')?.[1];
    return token ? this.accessTokens.verify(token) : null;
  }
}
