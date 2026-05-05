// Use Case: FetchFnoUseCase
import type { FnoEntity } from '../entities/FnoEntity';
import type { IGetQuoteEventsRepository } from '../repositories/IGetQuoteEventsRepository';

export class FetchFnoUseCase {
  constructor(private readonly repository: IGetQuoteEventsRepository) {}

  async execute(params: { symbol: string; exchange: string }): Promise<FnoEntity[]> {
    return this.repository.fetchFnoData(params);
  }
}
