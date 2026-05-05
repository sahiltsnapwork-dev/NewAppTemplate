// Use Case: FetchBulkBlockUseCase
import type { BulkBlockEntity } from '../entities/BulkBlockEntity';
import type { IGetQuoteNewsRepository } from '../repositories/IGetQuoteNewsRepository';

export class FetchBulkBlockUseCase {
  constructor(private readonly repository: IGetQuoteNewsRepository) {}

  async execute(params: { cmotId: string; exchange: string; perPage?: string }): Promise<BulkBlockEntity[]> {
    return this.repository.fetchBulkBlock(params);
  }
}
