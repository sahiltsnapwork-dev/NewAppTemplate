import type { ISearchStocksRepository } from '../interfaces/ISearchStocksRepository';
import type { StockEntity } from '../entities/StockEntity';

export class SearchStocksUseCase {
  constructor(private readonly repo: ISearchStocksRepository) {}

  async execute(query: string): Promise<StockEntity[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }
    return this.repo.searchStocks(query.trim());
  }
}
