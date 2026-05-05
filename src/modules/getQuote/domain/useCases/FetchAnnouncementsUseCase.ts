// Use Case: FetchAnnouncementsUseCase
import type { NewsEntity } from '../entities/NewsEntity';
import type { IGetQuoteNewsRepository } from '../repositories/IGetQuoteNewsRepository';

export class FetchAnnouncementsUseCase {
  constructor(private readonly repository: IGetQuoteNewsRepository) {}

  async execute(params: { cmotId: string; exchange: string }): Promise<NewsEntity[]> {
    return this.repository.fetchAnnouncements(params);
  }
}
