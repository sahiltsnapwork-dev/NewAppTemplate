import { SearchStocksRepositoryImpl } from '../data/repositories/SearchStocksRepositoryImpl';
import type { SearchStocksApiDataSource } from '../data/dataSources/SearchStocksApiDataSource';
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

function makeDataSource(
  overrides?: Partial<SearchStocksApiDataSource>,
): SearchStocksApiDataSource {
  return {
    searchStocks: jest.fn().mockResolvedValue([mockStock]),
    fetchTrendingStocks: jest.fn().mockResolvedValue([mockStock]),
    ...overrides,
  } as unknown as SearchStocksApiDataSource;
}

describe('SearchStocksRepositoryImpl', () => {
  it('delegates searchStocks to data source', async () => {
    const dataSource = makeDataSource();
    const repo = new SearchStocksRepositoryImpl(dataSource);
    const result = await repo.searchStocks('INFY');
    expect(dataSource.searchStocks).toHaveBeenCalledWith('INFY');
    expect(result).toEqual([mockStock]);
  });

  it('delegates fetchTrendingStocks to data source', async () => {
    const dataSource = makeDataSource();
    const repo = new SearchStocksRepositoryImpl(dataSource);
    const result = await repo.fetchTrendingStocks();
    expect(dataSource.fetchTrendingStocks).toHaveBeenCalled();
    expect(result).toEqual([mockStock]);
  });
});
