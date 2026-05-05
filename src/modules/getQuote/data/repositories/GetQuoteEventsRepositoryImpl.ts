// GetQuoteEventsRepositoryImpl — implements IGetQuoteEventsRepository

import type { IGetQuoteEventsRepository } from '../../domain/repositories/IGetQuoteEventsRepository';
import type { EventEntity } from '../../domain/entities/EventEntity';
import type { FnoEntity } from '../../domain/entities/FnoEntity';
import { GetQuoteEventsApiDataSource } from '../dataSources/GetQuoteEventsApiDataSource';
import { eventDtoToEntity } from '../dto/EventDto';
import { fnoDtoToEntity } from '../dto/FnoDto';

export class GetQuoteEventsRepositoryImpl implements IGetQuoteEventsRepository {
  constructor(private readonly dataSource: GetQuoteEventsApiDataSource) {}

  async fetchEvents(params: { cmotId: string }): Promise<EventEntity[]> {
    const response = await this.dataSource.fetchEvents(params);
    const items = response?.data ?? [];
    return items.map(eventDtoToEntity);
  }

  async fetchFnoData(params: { symbol: string; exchange: string }): Promise<FnoEntity[]> {
    const dtos = await this.dataSource.fetchFnoData(params);
    return dtos.map(fnoDtoToEntity);
  }
}
