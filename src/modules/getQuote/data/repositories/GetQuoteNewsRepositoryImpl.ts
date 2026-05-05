// GetQuoteNewsRepositoryImpl — implements IGetQuoteNewsRepository

import type { IGetQuoteNewsRepository } from '../../domain/repositories/IGetQuoteNewsRepository';
import type { NewsEntity } from '../../domain/entities/NewsEntity';
import type { BulkBlockEntity } from '../../domain/entities/BulkBlockEntity';
import { GetQuoteNewsApiDataSource } from '../dataSources/GetQuoteNewsApiDataSource';
import { newsDtoToEntity } from '../dto/NewsDto';
import { bulkBlockDtoToEntity } from '../dto/BulkBlockDto';

export class GetQuoteNewsRepositoryImpl implements IGetQuoteNewsRepository {
  constructor(private readonly dataSource: GetQuoteNewsApiDataSource) {}

  async fetchNews(params: { cmotId: string }): Promise<NewsEntity[]> {
    const response = await this.dataSource.fetchNews(params);
    const items = response?.data ?? [];
    return items.map(dto => newsDtoToEntity({ ...dto, type: 'news' }));
  }

  async fetchBulkBlock(params: {
    cmotId: string;
    exchange: string;
    perPage?: string;
  }): Promise<BulkBlockEntity[]> {
    const [bulkResponse, blockResponse] = await Promise.allSettled([
      this.dataSource.fetchBulkDeals(params),
      this.dataSource.fetchBlockDeals(params),
    ]);

    const bulkItems =
      bulkResponse.status === 'fulfilled'
        ? (bulkResponse.value?.data ?? []).map(dto => bulkBlockDtoToEntity({ ...dto, type: 'Bulk' }))
        : [];

    const blockItems =
      blockResponse.status === 'fulfilled'
        ? (blockResponse.value?.data ?? []).map(dto => bulkBlockDtoToEntity({ ...dto, type: 'Block' }))
        : [];

    const all = [...bulkItems, ...blockItems];
    // Sort by date descending (mirrors Flutter sort)
    all.sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.localeCompare(a.date);
    });
    return all;
  }

  async fetchAnnouncements(params: { cmotId: string; exchange: string }): Promise<NewsEntity[]> {
    const response = await this.dataSource.fetchAnnouncements(params);
    const items = response?.data ?? [];
    return items.map(dto => newsDtoToEntity({ ...dto, type: 'announcement' }));
  }
}
