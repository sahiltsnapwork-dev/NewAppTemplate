import type { ISearchStocksRepository } from '../interfaces/ISearchStocksRepository';
import type { StockEntity } from '../entities/StockEntity';

export class FetchTrendingStocksUseCase {
  constructor(private readonly repo: ISearchStocksRepository) {}

  async execute(): Promise<StockEntity[]> {
    return this.repo.fetchTrendingStocks();
  }
}
