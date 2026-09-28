import { createServer, Server as HttpServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { InMemoryAccessTokenService } from '@shared/access-token';
import { InMemoryRealtimeChannels } from './in-memory.realtime';
import { SocketIoRealtimeGateway } from './socket-io.realtime';

describe('SocketIoRealtimeGateway channels (real socket.io)', () => {
  let httpServer: HttpServer;
  let server: Server;
  let gateway: SocketIoRealtimeGateway;
  let url: string;
  let clients: ClientSocket[] = [];

  beforeAll(async () => {
    httpServer = createServer();
    server = new Server(httpServer);
    gateway = new SocketIoRealtimeGateway(new InMemoryAccessTokenService());
    (gateway as unknown as { server: Server }).server = server;
    gateway.afterInit(server);
    server.on('connection', (socket) => gateway.handleConnection(socket));
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
  });

  afterEach(() => {
    clients.forEach((client) => client.disconnect());
    clients = [];
  });

  afterAll(async () => {
    server.close();
  });

  const connect = (userId: string) =>
    new Promise<ClientSocket>((resolve, reject) => {
      const client = io(url, {
        auth: { token: `access(${userId})` },
        transports: ['websocket'],
        reconnection: false,
        forceNew: true,
      });
      clients.push(client);
      client.once('connect', () => resolve(client));
      client.once('connect_error', reject);
    });

  /** Lets the server process the client's disconnect. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

  it('finds a user only after one of its connections joins', async () => {
    const a = await connect('u1');

    expect(await gateway.hasUser('room-1', 'u1')).toBe(false);
    gateway.join(a.id!, 'room-1');

    expect(await gateway.hasUser('room-1', 'u1')).toBe(true);
    expect(await gateway.hasUser('room-2', 'u1')).toBe(false);
  });

  it('does not mistake another user in the channel for the asked one', async () => {
    const other = await connect('u2');
    await connect('u1');
    gateway.join(other.id!, 'room-1');

    expect(await gateway.hasUser('room-1', 'u1')).toBe(false);
  });

  it('keeps the user while another of its connections stays', async () => {
    const phone = await connect('u1');
    const laptop = await connect('u1');
    gateway.join(phone.id!, 'room-1');
    gateway.join(laptop.id!, 'room-1');

    gateway.leave(phone.id!, 'room-1');
    expect(await gateway.hasUser('room-1', 'u1')).toBe(true);

    gateway.leave(laptop.id!, 'room-1');
    expect(await gateway.hasUser('room-1', 'u1')).toBe(false);
  });

  it('drops the user from channels on disconnect', async () => {
    const a = await connect('u1');
    gateway.join(a.id!, 'room-1');

    a.disconnect();
    await settle();

    expect(await gateway.hasUser('room-1', 'u1')).toBe(false);
  });

  it('ignores unknown connection ids', async () => {
    gateway.join('nope', 'room-1');
    gateway.leave('nope', 'room-1');

    expect(await gateway.hasUser('room-1', 'u1')).toBe(false);
  });
});

describe('InMemoryRealtimeChannels', () => {
  it('tracks joined users per channel and forgets them on disconnect', async () => {
    const channels = new InMemoryRealtimeChannels();
    channels.connect('c1', 'u1');
    channels.connect('c2', 'u2');
    channels.join('c1', 'room-1');
    channels.join('c2', 'room-2');

    expect(await channels.hasUser('room-1', 'u1')).toBe(true);
    expect(await channels.hasUser('room-1', 'u2')).toBe(false);

    channels.disconnect('c1');
    expect(await channels.hasUser('room-1', 'u1')).toBe(false);
  });
});
