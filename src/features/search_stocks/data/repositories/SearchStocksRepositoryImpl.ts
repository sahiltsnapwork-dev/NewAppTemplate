import type { ISearchStocksRepository } from '../../domain/interfaces/ISearchStocksRepository';
import type { StockEntity } from '../../domain/entities/StockEntity';
import type { SearchStocksApiDataSource } from '../dataSources/SearchStocksApiDataSource';

export class SearchStocksRepositoryImpl implements ISearchStocksRepository {
  constructor(private readonly dataSource: SearchStocksApiDataSource) {}

  async searchStocks(query: string): Promise<StockEntity[]> {
    return this.dataSource.searchStocks(query);
  }

  async fetchTrendingStocks(): Promise<StockEntity[]> {
    return this.dataSource.fetchTrendingStocks();
  }
}
