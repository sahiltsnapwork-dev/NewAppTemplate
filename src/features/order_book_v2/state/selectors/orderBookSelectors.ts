// Selectors: Order Book
// Typed selectors for all slice state fields

import type { RootState } from '../../../../store/rootReducer';

// Loading
export const selectOrderBookLoadingIndex = (state: RootState) =>
  state.orderBook.loadingIndex;
export const selectOrderBookIsLoading = (state: RootState) =>
  state.orderBook.loadingIndex !== null;

// Orders by status
export const selectOpenOrders = (state: RootState) => state.orderBook.openOrders;
export const selectClosedOrders = (state: RootState) => state.orderBook.closedOrders;
export const selectGtdOrders = (state: RootState) => state.orderBook.gtdOrders;
export const selectFilteredOrders = (state: RootState) => state.orderBook.filteredOrders;

// Order count
export const selectOrderCount = (state: RootState) => state.orderBook.orderCount;
export const selectOpenCount = (state: RootState) => state.orderBook.orderCount.openCount;
export const selectClosedCount = (state: RootState) => state.orderBook.orderCount.closedCount;
export const selectGtdCount = (state: RootState) => state.orderBook.orderCount.gtdCount;

// Trade book
export const selectTradeBook = (state: RootState) => state.orderBook.tradeBook;

// Filters
export const selectAppliedFilters = (state: RootState) => state.orderBook.appliedFilters;

// CTD result
export const selectCtdResult = (state: RootState) => state.orderBook.ctdResult;

// Product conversion
export const selectProductConversionResult = (state: RootState) =>
  state.orderBook.productConversionResult;

// Active tab
export const selectActiveTab = (state: RootState) => state.orderBook.activeTab;

// Error
export const selectOrderBookError = (state: RootState) => state.orderBook.error;
