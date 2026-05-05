// Use Case: FetchExpertTipsUseCase
import type { ExpertTipEntity } from '../entities/ExpertTipEntity';
import type { IGetQuoteRepository } from '../repositories/IGetQuoteRepository';

export class FetchExpertTipsUseCase {
  constructor(private readonly repository: IGetQuoteRepository) {}

  async execute(params: { symbol: string }): Promise<ExpertTipEntity | null> {
    return this.repository.fetchExpertTips(params);
  }
}
