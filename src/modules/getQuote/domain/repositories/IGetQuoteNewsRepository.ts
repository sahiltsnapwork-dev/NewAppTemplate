// Domain Repository Interface: IGetQuoteNewsRepository

import type { NewsEntity } from '../entities/NewsEntity';
import type { BulkBlockEntity } from '../entities/BulkBlockEntity';

export interface IGetQuoteNewsRepository {
  fetchNews(params: { cmotId: string }): Promise<NewsEntity[]>;
  fetchBulkBlock(params: {
    cmotId: string;
    exchange: string;
    perPage?: string;
  }): Promise<BulkBlockEntity[]>;
  fetchAnnouncements(params: { cmotId: string; exchange: string }): Promise<NewsEntity[]>;
}
