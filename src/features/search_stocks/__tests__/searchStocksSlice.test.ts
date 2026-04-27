import searchStocksReducer, {
  setQuery,
  setActiveFilter,
  clearSearch,
  searchStocksThunk,
  fetchTrendingStocksThunk,
  loadHistoryThunk,
  deleteHistoryItemThunk,
} from '../state/store/searchStocksSlice';
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

describe('searchStocksSlice', () => {
  const initialState = searchStocksReducer(undefined, { type: '@@INIT' });

  it('has correct initial state', () => {
    expect(initialState.query).toBe('');
    expect(initialState.activeFilter).toBe('All');
    expect(initialState.searchResults).toEqual([]);
    expect(initialState.view).toBe('home');
  });

  it('setQuery updates query and view', () => {
    const state = searchStocksReducer(initialState, setQuery('INFY'));
    expect(state.query).toBe('INFY');
    expect(state.view).toBe('results');
  });

  it('setQuery with empty string sets view to home', () => {
    const state = searchStocksReducer(initialState, setQuery(''));
    expect(state.view).toBe('home');
  });

  it('setActiveFilter updates filter', () => {
    const state = searchStocksReducer(initialState, setActiveFilter('Equity'));
    expect(state.activeFilter).toBe('Equity');
  });

  it('clearSearch resets query and results', () => {
    const withData = { ...initialState, query: 'INFY', searchResults: [mockStock], view: 'results' as const };
    const state = searchStocksReducer(withData, clearSearch());
    expect(state.query).toBe('');
    expect(state.searchResults).toEqual([]);
    expect(state.view).toBe('home');
  });

  it('searchStocks.pending sets status loading', () => {
    const state = searchStocksReducer(initialState, {
      type: searchStocksThunk.pending.type,
    });
    expect(state.searchStatus).toBe('loading');
    expect(state.error).toBeNull();
  });

  it('searchStocks.fulfilled sets results', () => {
    const state = searchStocksReducer(initialState, {
      type: searchStocksThunk.fulfilled.type,
      payload: [mockStock],
    });
    expect(state.searchStatus).toBe('success');
    expect(state.searchResults).toEqual([mockStock]);
  });

  it('searchStocks.rejected sets error', () => {
    const state = searchStocksReducer(initialState, {
      type: searchStocksThunk.rejected.type,
    });
    expect(state.searchStatus).toBe('failed');
    expect(state.error).toBeTruthy();
  });

  it('fetchTrending.fulfilled sets trending stocks', () => {
    const state = searchStocksReducer(initialState, {
      type: fetchTrendingStocksThunk.fulfilled.type,
      payload: [mockStock],
    });
    expect(state.trendingStocks).toEqual([mockStock]);
    expect(state.trendingStatus).toBe('success');
  });

  it('loadHistory.fulfilled sets history', () => {
    const state = searchStocksReducer(initialState, {
      type: loadHistoryThunk.fulfilled.type,
      payload: [mockStock],
    });
    expect(state.historyStocks).toEqual([mockStock]);
  });

  it('deleteHistoryItem.fulfilled removes item from history', () => {
    const withHistory = {
      ...initialState,
      historyStocks: [mockStock],
    };
    const state = searchStocksReducer(withHistory, {
      type: deleteHistoryItemThunk.fulfilled.type,
      payload: mockStock,
    });
    expect(state.historyStocks).toEqual([]);
  });
});
