import { Inject, Injectable } from '@nestjs/common';
import {
  IRealtimeTicketService,
  REALTIME_TICKET_SERVICE,
} from '@shared/realtime';
import { UserNotFoundException } from '../../domain';
import { IUserRepository, USER_REPOSITORY } from '../ports/user.repository';

export type TIssueRealtimeTicketInput = {
  /** Caller, from the access token. */
  userId: string;
};

export type TIssueRealtimeTicketOutput = {
  ticket: string;
  /** Seconds the ticket stays usable to open a realtime connection. */
  expiresIn: number;
};

/** Ticket to open a realtime connection without exposing the access token; caller must still be ACTIVE. */
@Injectable()
export class IssueRealtimeTicketUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(REALTIME_TICKET_SERVICE)
    private readonly tickets: IRealtimeTicketService,
  ) {}

  async execute(
    input: TIssueRealtimeTicketInput,
  ): Promise<TIssueRealtimeTicketOutput> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundException(input.userId);
    }
    user.assertCanLogin();

    return this.tickets.issue({ userId: user.id });
  }
}
