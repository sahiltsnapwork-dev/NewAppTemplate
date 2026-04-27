import { SearchStocksUseCase } from '../domain/usecases/SearchStocksUseCase';
import type { ISearchStocksRepository } from '../domain/interfaces/ISearchStocksRepository';
import type { StockEntity } from '../domain/entities/StockEntity';

const mockStock: StockEntity = {
  companyName: 'Infosys Limited',
  displayName: 'Infosys Limited',
  symbol: 'INFY',
  instrumentName: 'Equity',
  instrumentId: '12345',
  exchange: 'NSE',
  isin: 'INE009A01021',
  lssymbol: 'item_NSE_INFY',
  hslcode: 'INFY',
  exchangeScriptID: 'INFY',
  exchangeName: 'NSE',
};

function makeRepo(overrides?: Partial<ISearchStocksRepository>): ISearchStocksRepository {
  return {
    searchStocks: jest.fn().mockResolvedValue([mockStock]),
    fetchTrendingStocks: jest.fn().mockResolvedValue([mockStock]),
    ...overrides,
  };
}

describe('SearchStocksUseCase', () => {
  it('calls repo.searchStocks with trimmed query', async () => {
    const repo = makeRepo();
    const useCase = new SearchStocksUseCase(repo);
    const result = await useCase.execute('  INFY  ');
    expect(repo.searchStocks).toHaveBeenCalledWith('INFY');
    expect(result).toEqual([mockStock]);
  });

  it('returns empty array for blank query', async () => {
    const repo = makeRepo();
    const useCase = new SearchStocksUseCase(repo);
    const result = await useCase.execute('   ');
    expect(repo.searchStocks).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns empty array for empty string', async () => {
    const repo = makeRepo();
    const useCase = new SearchStocksUseCase(repo);
    const result = await useCase.execute('');
    expect(result).toEqual([]);
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo({
      searchStocks: jest.fn().mockRejectedValue(new Error('Network error')),
    });
    const useCase = new SearchStocksUseCase(repo);
    await expect(useCase.execute('INFY')).rejects.toThrow('Network error');
  });
});
