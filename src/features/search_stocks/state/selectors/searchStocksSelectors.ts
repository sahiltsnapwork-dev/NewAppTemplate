import type { RootState } from '../../../../app/state/store';

export const selectQuery = (state: RootState) => state.searchStocks.query;
export const selectActiveFilter = (state: RootState) => state.searchStocks.activeFilter;
export const selectSearchResults = (state: RootState) => state.searchStocks.searchResults;
export const selectTrendingStocks = (state: RootState) => state.searchStocks.trendingStocks;
export const selectHistoryStocks = (state: RootState) => state.searchStocks.historyStocks;
export const selectSearchStatus = (state: RootState) => state.searchStocks.searchStatus;
export const selectTrendingStatus = (state: RootState) => state.searchStocks.trendingStatus;
export const selectView = (state: RootState) => state.searchStocks.view;
export const selectError = (state: RootState) => state.searchStocks.error;
