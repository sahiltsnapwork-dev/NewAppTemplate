// Use Case: FetchNewsUseCase
import type { NewsEntity } from '../entities/NewsEntity';
import type { IGetQuoteNewsRepository } from '../repositories/IGetQuoteNewsRepository';

export class FetchNewsUseCase {
  constructor(private readonly repository: IGetQuoteNewsRepository) {}

  async execute(params: { cmotId: string }): Promise<NewsEntity[]> {
    return this.repository.fetchNews(params);
  }
}
