import { InMemoryRealtimeTicketService } from '@shared/realtime';
import {
  EBusinessType,
  ELoginType,
  EUserRole,
  User,
  UserNotActiveException,
  UserNotFoundException,
} from '../../domain';
import { InMemoryUserRepository } from '../ports/fakes';
import { IssueRealtimeTicketUseCase } from './issue-realtime-ticket.use-case';

describe('IssueRealtimeTicketUseCase', () => {
  let users: InMemoryUserRepository;
  let tickets: InMemoryRealtimeTicketService;
  let useCase: IssueRealtimeTicketUseCase;

  const register = (role: EUserRole) => {
    const user = User.register({
      loginType: ELoginType.EMAIL,
      hashedIdentifier: 'hash(user@mail.com)',
      encryptedIdentifier: 'enc(user@mail.com)',
      passwordHash: 'pwd(secret)',
      username: 'seed-shop',
      role,
      businessType:
        role === EUserRole.DISTRIBUTOR ? EBusinessType.SEEDS_SEEDLINGS : null,
      bio: null,
    });
    users.items.set(user.id, user);
    return user;
  };

  beforeEach(() => {
    users = new InMemoryUserRepository();
    tickets = new InMemoryRealtimeTicketService();
    useCase = new IssueRealtimeTicketUseCase(users, tickets);
  });

  it('issues a ticket for an active user', async () => {
    const user = register(EUserRole.FARMER);

    const output = await useCase.execute({ userId: user.id });

    expect(output).toEqual({ ticket: `ticket(${user.id})`, expiresIn: 30 });
    expect(tickets.issued).toEqual([{ userId: user.id }]);
  });

  it('rejects a user that is not active', async () => {
    const user = register(EUserRole.DISTRIBUTOR);

    await expect(useCase.execute({ userId: user.id })).rejects.toThrow(
      UserNotActiveException,
    );
    expect(tickets.issued).toEqual([]);
  });

  it('rejects an unknown user', async () => {
    await expect(useCase.execute({ userId: 'missing' })).rejects.toThrow(
      UserNotFoundException,
    );
    expect(tickets.issued).toEqual([]);
  });
});
