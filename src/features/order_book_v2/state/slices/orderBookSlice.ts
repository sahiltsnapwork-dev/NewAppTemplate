// Redux Slice: Order Book
// Source: OrderBookBlocV2 (order_book_bloc_v2.dart) → converted to Redux Toolkit
// BLoC States → slice state; BLoC Events → async thunks

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OrderBookEntry, OrderBookCount } from '../../domain/entities/OrderBookEntry';
import type { TradeBookDetails } from '../../domain/entities/TradeBookEntry';
import type { OrderRequestResult } from '../../domain/entities/PlaceOrder';
import {
  fetchOrderBookThunk,
  fetchTradeBookThunk,
  convertToDeliveryThunk,
  productConversionThunk,
} from '../thunks/orderBookThunks';

export type OrderBookStatus = 'OPEN' | 'CLOSED' | 'GTD';

export interface OrderBookFilterOptions {
  exchange: string;
  action: 'BUY' | 'SELL' | 'ALL';
  product: string;
  status: string;
  sortAlpha: 'ASC' | 'DESC' | 'NONE';
}

export interface OrderBookState {
  // Loading: loaderIndex -1 = global, 0+ = tab-specific (mirrors BLoC loaderIndex)
  loadingIndex: number | null;

  // Order lists per tab (mirrors SuccessOrderBookApiResponseState per status)
  openOrders: OrderBookEntry[];
  closedOrders: OrderBookEntry[];
  gtdOrders: OrderBookEntry[];

  // Order counts (mirrors OrderBookCount in SuccessOrderBookApiResponseState)
  orderCount: OrderBookCount;

  // Trade book (mirrors TradeBookStateV2)
  tradeBook: TradeBookDetails[];

  // Active filters (mirrors fliterSuccessOrderBookState)
  appliedFilters: OrderBookFilterOptions;
  filteredOrders: OrderBookEntry[];

  // CTD result (mirrors Convert2DeliveryState / CTDErrorState)
  ctdResult: OrderRequestResult | null;

  // Product conversion result (mirrors ProductConversionState)
  productConversionResult: OrderRequestResult | null;

  // Error (mirrors CommonErrorState)
  error: string | null;
  errorLoaderIndex: number | null;

  // Currently active tab
  activeTab: 0 | 1 | 2 | 3 | 4;
}

const DEFAULT_FILTERS: OrderBookFilterOptions = {
  exchange: 'ALL',
  action: 'ALL',
  product: 'ALL',
  status: 'ALL',
  sortAlpha: 'NONE',
};

const initialState: OrderBookState = {
  loadingIndex: null,
  openOrders: [],
  closedOrders: [],
  gtdOrders: [],
  orderCount: { openCount: 0, closedCount: 0, gtdCount: 0 },
  tradeBook: [],
  appliedFilters: DEFAULT_FILTERS,
  filteredOrders: [],
  ctdResult: null,
  productConversionResult: null,
  error: null,
  errorLoaderIndex: null,
  activeTab: 0,
};

const orderBookSlice = createSlice({
  name: 'orderBook',
  initialState,
  reducers: {
    // Reset (mirrors UnOrderBookEvent / LoadOrderBookEvent)
    resetOrderBook(state) {
      Object.assign(state, initialState);
    },

    setActiveTab(state, action: PayloadAction<0 | 1 | 2 | 3 | 4>) {
      state.activeTab = action.payload;
    },

    // Client-side filter (mirrors OrderFilterApiEvent)
    applyFilters(state, action: PayloadAction<{ status: OrderBookStatus; filters: OrderBookFilterOptions }>) {
      const { status, filters } = action.payload;
      state.appliedFilters = filters;

      const source =
        status === 'OPEN'
          ? state.openOrders
          : status === 'CLOSED'
          ? state.closedOrders
          : state.gtdOrders;

      let filtered = [...source];

      if (filters.exchange !== 'ALL') {
        filtered = filtered.filter(
          (o) => o.exchangeIdentity.exchangeId === filters.exchange
        );
      }
      if (filters.action !== 'ALL') {
        const side = filters.action === 'BUY' ? 1 : 2;
        filtered = filtered.filter((o) => o.orderLegDetails.orderSide === side);
      }
      if (filters.status !== 'ALL') {
        filtered = filtered.filter((o) => o.orderStatus === filters.status);
      }
      if (filters.sortAlpha === 'ASC') {
        filtered.sort((a, b) =>
          (a.instrumentIdentity.lsSymbol ?? '').localeCompare(b.instrumentIdentity.lsSymbol ?? '')
        );
      } else if (filters.sortAlpha === 'DESC') {
        filtered.sort((a, b) =>
          (b.instrumentIdentity.lsSymbol ?? '').localeCompare(a.instrumentIdentity.lsSymbol ?? '')
        );
      }

      state.filteredOrders = filtered;
    },

    clearCtdResult(state) {
      state.ctdResult = null;
    },

    clearError(state) {
      state.error = null;
      state.errorLoaderIndex = null;
    },
  },
  extraReducers: (builder) => {
    // ── Fetch Order Book ────────────────────────────────────────────────────
    builder
      .addCase(fetchOrderBookThunk.pending, (state, action) => {
        state.loadingIndex = action.meta.arg.loaderIndex ?? 0;
        state.error = null;
      })
      .addCase(fetchOrderBookThunk.fulfilled, (state, action) => {
        state.loadingIndex = null;
        const { orders, count, status } = action.payload;
        if (status === 'OPEN') state.openOrders = orders;
        else if (status === 'CLOSED') state.closedOrders = orders;
        else if (status === 'GTD') state.gtdOrders = orders;
        state.orderCount = count;
        state.filteredOrders = orders;
      })
      .addCase(fetchOrderBookThunk.rejected, (state, action) => {
        state.loadingIndex = null;
        state.error = action.error.message ?? 'Failed to load order book';
        state.errorLoaderIndex = action.meta.arg.loaderIndex ?? 0;
      });

    // ── Fetch Trade Book ────────────────────────────────────────────────────
    builder
      .addCase(fetchTradeBookThunk.pending, (state) => {
        state.loadingIndex = 2;
        state.error = null;
      })
      .addCase(fetchTradeBookThunk.fulfilled, (state, action) => {
        state.loadingIndex = null;
        state.tradeBook = action.payload;
      })
      .addCase(fetchTradeBookThunk.rejected, (state) => {
        state.loadingIndex = null;
        // Trade book errors are silent (mirrors CommonErrorStateNotToHandle)
      });

    // ── Convert To Delivery ─────────────────────────────────────────────────
    builder
      .addCase(convertToDeliveryThunk.pending, (state) => {
        state.loadingIndex = -1;
        state.ctdResult = null;
      })
      .addCase(convertToDeliveryThunk.fulfilled, (state, action) => {
        state.loadingIndex = null;
        state.ctdResult = action.payload;
      })
      .addCase(convertToDeliveryThunk.rejected, (state, action) => {
        state.loadingIndex = null;
        state.ctdResult = { statusCode: 'ERROR', message: action.error.message };
      });

    // ── Product Conversion ──────────────────────────────────────────────────
    builder
      .addCase(productConversionThunk.pending, (state) => {
        state.loadingIndex = -1;
      })
      .addCase(productConversionThunk.fulfilled, (state, action) => {
        state.loadingIndex = null;
        state.productConversionResult = action.payload;
      })
      .addCase(productConversionThunk.rejected, (state, action) => {
        state.loadingIndex = null;
        state.error = action.error.message ?? 'Product conversion failed';
      });
  },
});

export const {
  resetOrderBook,
  setActiveTab,
  applyFilters,
  clearCtdResult,
  clearError,
} = orderBookSlice.actions;

export default orderBookSlice.reducer;
