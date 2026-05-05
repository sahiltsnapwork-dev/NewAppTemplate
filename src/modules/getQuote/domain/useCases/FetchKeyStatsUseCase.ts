// Use Case: FetchKeyStatsUseCase
import type { KeyStatsEntity } from '../entities/KeyStatsEntity';
import type { IGetQuoteRepository } from '../repositories/IGetQuoteRepository';

export class FetchKeyStatsUseCase {
  constructor(private readonly repository: IGetQuoteRepository) {}

  async execute(params: { symbol: string; exchange: string }): Promise<KeyStatsEntity[]> {
    return this.repository.fetchKeyStats(params);
  }
}
