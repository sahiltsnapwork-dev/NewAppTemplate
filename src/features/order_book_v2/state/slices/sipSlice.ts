// Redux Slice: SIP
// Source: GetStockSipData, SipRequestBookApiEvent, ViewTrailApiEvent, ViewChildApiEvent
// → Redux Toolkit

import { createSlice } from '@reduxjs/toolkit';
import type { StockSipData, SipRequestBookModel, SipBasketInfo, SipOrderTrailItem, SipChildOrderItem } from '../../domain/entities/StockSip';
import {
  fetchSipDataThunk,
  fetchSipRequestBookThunk,
  fetchSipOrderTrailThunk,
  fetchSipChildOrdersThunk,
} from '../thunks/orderBookThunks';

export interface SipState {
  isLoading: boolean;

  // SIP list (mirrors SipDataResponseState)
  sipData: StockSipData[];

  // SIP request book (mirrors StockSipResponseDataState)
  sipRequestBook: SipRequestBookModel[];

  // Trail data (mirrors ViewTrailDataState)
  trailBasketInfo: SipBasketInfo | null;
  trailData: SipOrderTrailItem[];

  // Child orders (mirrors ViewChildState)
  childBasketInfo: SipBasketInfo | null;
  childOrders: SipChildOrderItem[];

  // Client-side filter
  searchQuery: string;
  selectedStatus: number;

  noData: boolean;
  error: string | null;
}

const initialState: SipState = {
  isLoading: false,
  sipData: [],
  sipRequestBook: [],
  trailBasketInfo: null,
  trailData: [],
  childBasketInfo: null,
  childOrders: [],
  searchQuery: '',
  selectedStatus: -1, // -1 = ALL
  noData: false,
  error: null,
};

const sipSlice = createSlice({
  name: 'sip',
  initialState,
  reducers: {
    resetSip(state) {
      Object.assign(state, initialState);
    },
    setSipSearchQuery(state, action: { payload: string }) {
      state.searchQuery = action.payload;
    },
    setSipStatusFilter(state, action: { payload: number }) {
      state.selectedStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSipDataThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSipDataThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sipData = action.payload;
        state.noData = action.payload.length === 0;
      })
      .addCase(fetchSipDataThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'SIP data load failed';
      });

    builder
      .addCase(fetchSipRequestBookThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.noData = false;
      })
      .addCase(fetchSipRequestBookThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sipRequestBook = action.payload;
        state.noData = action.payload.length === 0;
      })
      .addCase(fetchSipRequestBookThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'SIP request book load failed';
      });

    builder
      .addCase(fetchSipOrderTrailThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSipOrderTrailThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trailBasketInfo = action.payload.basketInfo;
        state.trailData = action.payload.trailData;
      })
      .addCase(fetchSipOrderTrailThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'SIP trail load failed';
      });

    builder
      .addCase(fetchSipChildOrdersThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSipChildOrdersThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.childBasketInfo = action.payload.basketInfo;
        state.childOrders = action.payload.childOrders;
      })
      .addCase(fetchSipChildOrdersThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'SIP child orders load failed';
      });
  },
});

export const { resetSip, setSipSearchQuery, setSipStatusFilter } = sipSlice.actions;
export default sipSlice.reducer;
