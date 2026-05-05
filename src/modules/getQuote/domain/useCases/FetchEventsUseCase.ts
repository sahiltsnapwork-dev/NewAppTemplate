// Use Case: FetchEventsUseCase
import type { EventEntity } from '../entities/EventEntity';
import type { IGetQuoteEventsRepository } from '../repositories/IGetQuoteEventsRepository';

export class FetchEventsUseCase {
  constructor(private readonly repository: IGetQuoteEventsRepository) {}

  async execute(params: { cmotId: string }): Promise<EventEntity[]> {
    return this.repository.fetchEvents(params);
  }
}
