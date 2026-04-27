import type { StockEntity } from '../entities/StockEntity';

export interface ISearchStocksRepository {
  searchStocks(query: string): Promise<StockEntity[]>;
  fetchTrendingStocks(): Promise<StockEntity[]>;
}
