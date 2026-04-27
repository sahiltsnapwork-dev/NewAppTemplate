import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { StockEntity } from '../../domain/entities/StockEntity';
import type { ThunkExtra } from '../../diBootstrap';

// ── Async thunks ──────────────────────────────────────────────────────────────

export const searchStocksThunk = createAsyncThunk<
  StockEntity[],
  string,
  { extra: ThunkExtra }
>('searchStocks/searchStocks', async (query, { extra }) => {
  return extra.searchStocksUseCase.execute(query);
});

export const fetchTrendingStocksThunk = createAsyncThunk<
  StockEntity[],
  void,
  { extra: ThunkExtra }
>('searchStocks/fetchTrending', async (_arg, { extra }) => {
  return extra.fetchTrendingStocksUseCase.execute();
});

export const loadHistoryThunk = createAsyncThunk<
  StockEntity[],
  void,
  { extra: ThunkExtra }
>('searchStocks/loadHistory', async (_arg, { extra }) => {
  return extra.searchHistoryStore.getHistory();
});

export const saveHistoryItemThunk = createAsyncThunk<
  void,
  StockEntity,
  { extra: ThunkExtra }
>('searchStocks/saveHistoryItem', async (item, { extra }) => {
  await extra.searchHistoryStore.addItem(item);
});

export const deleteHistoryItemThunk = createAsyncThunk<
  StockEntity,
  StockEntity,
  { extra: ThunkExtra }
>('searchStocks/deleteHistoryItem', async (item, { extra }) => {
  await extra.searchHistoryStore.deleteItem(item);
  return item;
});

// ── Slice ────────────────────────────────────────────────────────────────────

export type SearchStatus = 'idle' | 'typing' | 'loading' | 'success' | 'failed';
export type SearchView = 'home' | 'results';

interface SearchStocksState {
  query: string;
  activeFilter: string;
  searchResults: StockEntity[];
  trendingStocks: StockEntity[];
  historyStocks: StockEntity[];
  searchStatus: SearchStatus;
  trendingStatus: 'idle' | 'loading' | 'success' | 'failed';
  historyStatus: 'idle' | 'loading' | 'success';
  view: SearchView;
  error: string | null;
}

const initialState: SearchStocksState = {
  query: '',
  activeFilter: 'All',
  searchResults: [],
  trendingStocks: [],
  historyStocks: [],
  searchStatus: 'idle',
  trendingStatus: 'idle',
  historyStatus: 'idle',
  view: 'home',
  error: null,
};

const searchStocksSlice = createSlice({
  name: 'searchStocks',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
      state.view = action.payload.trim().length > 0 ? 'results' : 'home';
      if (action.payload.trim().length > 0) {
        state.searchStatus = 'typing';
      }
    },
    setActiveFilter(state, action: PayloadAction<string>) {
      state.activeFilter = action.payload;
    },
    clearSearch(state) {
      state.query = '';
      state.searchResults = [];
      state.searchStatus = 'idle';
      state.view = 'home';
      state.error = null;
    },
    resetState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    // searchStocks
    builder
      .addCase(searchStocksThunk.pending, (state) => {
        state.searchStatus = 'loading';
        state.error = null;
      })
      .addCase(searchStocksThunk.fulfilled, (state, action) => {
        state.searchStatus = 'success';
        state.searchResults = action.payload;
        state.view = 'results';
      })
      .addCase(searchStocksThunk.rejected, (state) => {
        state.searchStatus = 'failed';
        state.error = 'Search failed. Please try again.';
      });

    // trending
    builder
      .addCase(fetchTrendingStocksThunk.pending, (state) => {
        state.trendingStatus = 'loading';
      })
      .addCase(fetchTrendingStocksThunk.fulfilled, (state, action) => {
        state.trendingStatus = 'success';
        state.trendingStocks = action.payload;
      })
      .addCase(fetchTrendingStocksThunk.rejected, (state) => {
        state.trendingStatus = 'failed';
      });

    // history
    builder
      .addCase(loadHistoryThunk.pending, (state) => {
        state.historyStatus = 'loading';
      })
      .addCase(loadHistoryThunk.fulfilled, (state, action) => {
        state.historyStatus = 'success';
        state.historyStocks = action.payload;
      });

    builder.addCase(deleteHistoryItemThunk.fulfilled, (state, action) => {
      state.historyStocks = state.historyStocks.filter(
        (h) => h.companyName !== action.payload.companyName,
      );
    });
  },
});

export const { setQuery, setActiveFilter, clearSearch, resetState } =
  searchStocksSlice.actions;

export default searchStocksSlice.reducer;
