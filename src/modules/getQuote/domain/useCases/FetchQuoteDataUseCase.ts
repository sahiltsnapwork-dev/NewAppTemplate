// Use Case: FetchQuoteDataUseCase
import type { QuoteEntity } from '../entities/QuoteEntity';
import type { IGetQuoteRepository } from '../repositories/IGetQuoteRepository';

export class FetchQuoteDataUseCase {
  constructor(private readonly repository: IGetQuoteRepository) {}

  async execute(params: { symbol: string; exchange: string }): Promise<QuoteEntity> {
    return this.repository.fetchQuoteData(params);
  }
}
