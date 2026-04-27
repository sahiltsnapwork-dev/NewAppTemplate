import { SearchStocksApiDataSource } from './data/dataSources/SearchStocksApiDataSource';
import { SearchHistoryStore } from './data/dataSources/SearchHistoryStore';
import { SearchStocksRepositoryImpl } from './data/repositories/SearchStocksRepositoryImpl';
import { SearchStocksUseCase } from './domain/usecases/SearchStocksUseCase';
import { FetchTrendingStocksUseCase } from './domain/usecases/FetchTrendingStocksUseCase';

export interface ThunkExtra {
  searchStocksUseCase: SearchStocksUseCase;
  fetchTrendingStocksUseCase: FetchTrendingStocksUseCase;
  searchHistoryStore: SearchHistoryStore;
}

export function createSearchStocksThunkExtra(): ThunkExtra {
  const apiDataSource = new SearchStocksApiDataSource();
  const historyStore = new SearchHistoryStore();
  const repository = new SearchStocksRepositoryImpl(apiDataSource);
  const searchStocksUseCase = new SearchStocksUseCase(repository);
  const fetchTrendingStocksUseCase = new FetchTrendingStocksUseCase(repository);

  return {
    searchStocksUseCase,
    fetchTrendingStocksUseCase,
    searchHistoryStore: historyStore,
  };
}
