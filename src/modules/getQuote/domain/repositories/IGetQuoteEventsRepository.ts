// Domain Repository Interface: IGetQuoteEventsRepository

import type { EventEntity } from '../entities/EventEntity';
import type { FnoEntity } from '../entities/FnoEntity';

export interface IGetQuoteEventsRepository {
  fetchEvents(params: { cmotId: string }): Promise<EventEntity[]>;
  fetchFnoData(params: { symbol: string; exchange: string }): Promise<FnoEntity[]>;
}
