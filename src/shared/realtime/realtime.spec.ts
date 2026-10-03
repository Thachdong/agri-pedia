import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InMemoryAccessTokenService } from '@shared/access-token';
import { DomainException, EDomainErrorType } from '@shared/domain';
import { InMemoryLogger } from '@shared/logger';
import { RealtimeExceptionFilter } from './realtime-exception.filter';
import { InMemoryRealtimeTicketService } from './in-memory.realtime-ticket';
import { SocketIoRealtimeGateway } from './socket-io.realtime';

type TMiddleware = (socket: Socket, next: (error?: Error) => void) => void;

const fakeSocket = (handshake: {
  auth?: Record<string, unknown>;
  authorization?: string;
}) => {
  const joined: string[] = [];
  const socket = {
    data: {},
    handshake: {
      auth: handshake.auth ?? {},
      headers: { authorization: handshake.authorization },
    },
    join: (room: string) => joined.push(room),
  } as unknown as Socket;
  return { socket, joined };
};

const setup = () => {
  const middlewares: TMiddleware[] = [];
  const emitted: { room: string; event: string; payload: unknown }[] = [];
  const server = {
    use: (fn: TMiddleware) => middlewares.push(fn),
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        emitted.push({ room, event, payload }),
    }),
  } as unknown as Server;
  const gateway = new SocketIoRealtimeGateway(
    new InMemoryAccessTokenService(),
    new InMemoryRealtimeTicketService(),
  );
  (gateway as unknown as { server: Server }).server = server;
  gateway.afterInit(server);
  const handshake = (socket: Socket) =>
    new Promise<Error | undefined>((resolve) =>
      middlewares[0](socket, resolve),
    );
  return { gateway, handshake, emitted };
};

describe('SocketIoRealtimeGateway', () => {
  it('accepts auth.token and joins the user room', async () => {
    const { gateway, handshake } = setup();
    const { socket, joined } = fakeSocket({ auth: { token: 'access(u1)' } });

    expect(await handshake(socket)).toBeUndefined();
    gateway.handleConnection(socket);

    expect(socket.data).toEqual({ auth: { userId: 'u1' } });
    expect(joined).toEqual(['user:u1']);
  });

  it('accepts an Authorization Bearer header', async () => {
    const { handshake } = setup();
    const { socket } = fakeSocket({ authorization: 'Bearer access(u2)' });

    expect(await handshake(socket)).toBeUndefined();
    expect(socket.data).toEqual({ auth: { userId: 'u2' } });
  });

  it('accepts auth.ticket and joins the user room', async () => {
    const { gateway, handshake } = setup();
    const { socket, joined } = fakeSocket({ auth: { ticket: 'ticket(u3)' } });

    expect(await handshake(socket)).toBeUndefined();
    gateway.handleConnection(socket);

    expect(socket.data).toEqual({ auth: { userId: 'u3' } });
    expect(joined).toEqual(['user:u3']);
  });

  it.each([
    {},
    { auth: { token: 'bad' } },
    { auth: { ticket: 'bad' } },
    { auth: { ticket: 42 } },
    { auth: { ticket: 'access(u1)' } },
    { auth: { ticket: 'bad', token: 'access(u1)' } },
  ])('rejects a handshake without a valid token (%o)', async (input) => {
    const { handshake } = setup();
    const { socket } = fakeSocket(input);

    const error = await handshake(socket);

    expect(error?.message).toBe('AUTH_INVALID_ACCESS_TOKEN');
    expect(socket.data).toEqual({});
  });

  it('emits to the user room', () => {
    const { gateway, emitted } = setup();

    gateway.emitToUser('u1', 'chat.message.received', { a: 1 });

    expect(emitted).toEqual([
      { room: 'user:u1', event: 'chat.message.received', payload: { a: 1 } },
    ]);
  });
});

class SampleException extends DomainException {
  constructor() {
    super('SAMPLE_CODE', 'Sample', EDomainErrorType.NOT_FOUND, { id: 'x' });
  }
}

describe('RealtimeExceptionFilter', () => {
  const run = (exception: unknown) => {
    const logger = new InMemoryLogger();
    const ack = jest.fn();
    const host = {
      getArgByIndex: (index: number) => [{}, {}, ack][index],
    } as unknown as ArgumentsHost;
    new RealtimeExceptionFilter(logger).catch(exception, host);
    return { ack, logger };
  };

  it('answers a DomainException with its code', () => {
    expect(run(new SampleException()).ack).toHaveBeenCalledWith({
      error: { code: 'SAMPLE_CODE', message: 'Sample', details: { id: 'x' } },
    });
  });

  it('answers a validation failure', () => {
    const { ack } = run(new BadRequestException(['message must be a string']));
    expect(ack).toHaveBeenCalledWith({
      error: {
        code: 'REALTIME_VALIDATION_FAILED',
        message: 'Message validation failed',
        details: ['message must be a string'],
      },
    });
  });

  it('hides and logs unknown errors', () => {
    const { ack, logger } = run(new Error('boom'));
    expect(ack).toHaveBeenCalledWith({
      error: { code: 'REALTIME_INTERNAL_ERROR', message: 'Internal error' },
    });
    expect(logger.entries[0].level).toBe('error');
  });

  it('does nothing without an ack', () => {
    const host = {
      getArgByIndex: () => undefined,
    } as unknown as ArgumentsHost;
    expect(() =>
      new RealtimeExceptionFilter(new InMemoryLogger()).catch(
        new SampleException(),
        host,
      ),
    ).not.toThrow();
  });
});
