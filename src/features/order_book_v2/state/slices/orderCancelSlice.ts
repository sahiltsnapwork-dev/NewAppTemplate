// Redux Slice: Order Cancel / Modify
// Source: OrderCancelBloc (order_cancel_bloc.dart) → Redux Toolkit

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MarketStatus, OrderRequestResult } from '../../domain/entities/MarketStatus';
import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';
import {
  fetchMarketStatusThunk,
  cancelOrderThunk,
  modifyOrderThunk,
  confirmOrderThunk,
} from '../thunks/orderCancelThunks';

export type CancelAction = 'cancel' | 'modify';

export interface OrderCancelState {
  isLoading: boolean;

  // Currently selected order for cancel/modify
  selectedOrder: OrderBookEntry | null;
  cancelAction: CancelAction | null;

  // Market status (mirrors OrderCancelMarketStatusApiSuccessState)
  marketStatus: MarketStatus | null;

  // Result codes (mirrors CancelOrderState / ShowAlerDialogState / etc.)
  result: OrderRequestResult | null;

  // Alert dialog data (mirrors ShowAlerDialogState)
  alertDialog: {
    title: string;
    message: string;
    buttonTitle: string;
    type: string;
  } | null;

  // Fund shortfall (mirrors OpenOnlineFundDialogState)
  fundShortfall: string | null;

  // Quantity shortfall (mirrors OpenOnlineQuantityDialogState)
  quantityShortfall: string | null;

  error: string | null;
}

const initialState: OrderCancelState = {
  isLoading: false,
  selectedOrder: null,
  cancelAction: null,
  marketStatus: null,
  result: null,
  alertDialog: null,
  fundShortfall: null,
  quantityShortfall: null,
  error: null,
};

const orderCancelSlice = createSlice({
  name: 'orderCancel',
  initialState,
  reducers: {
    resetOrderCancel(state) {
      Object.assign(state, initialState);
    },

    setSelectedOrder(
      state,
      action: PayloadAction<{ order: OrderBookEntry; action: CancelAction }>
    ) {
      state.selectedOrder = action.payload.order;
      state.cancelAction = action.payload.action;
    },

    clearResult(state) {
      state.result = null;
      state.alertDialog = null;
      state.fundShortfall = null;
      state.quantityShortfall = null;
    },
  },
  extraReducers: (builder) => {
    // ── Market Status ──────────────────────────────────────────────────────
    builder
      .addCase(fetchMarketStatusThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMarketStatusThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.marketStatus = action.payload;
      })
      .addCase(fetchMarketStatusThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Failed to fetch market status';
      });

    // ── Cancel Order ────────────────────────────────────────────────────────
    builder
      .addCase(cancelOrderThunk.pending, (state) => {
        state.isLoading = true;
        state.result = null;
      })
      .addCase(cancelOrderThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const res = action.payload;
        state.result = res;

        if (res.statusCode === 'D') {
          state.alertDialog = {
            title: res.alertTitle ?? 'Alert',
            message: res.alertMessage ?? '',
            buttonTitle: res.buttonTitle ?? 'OK',
            type: res.type ?? '',
          };
        } else if (res.statusCode === 'FS') {
          state.fundShortfall = res.message ?? 'Insufficient funds';
        } else if (res.statusCode === 'QS') {
          state.quantityShortfall = res.message ?? 'Insufficient quantity';
        }
      })
      .addCase(cancelOrderThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Cancel order failed';
      });

    // ── Modify Order ────────────────────────────────────────────────────────
    builder
      .addCase(modifyOrderThunk.pending, (state) => {
        state.isLoading = true;
        state.result = null;
      })
      .addCase(modifyOrderThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const res = action.payload;
        state.result = res;

        if (res.statusCode === 'D') {
          state.alertDialog = {
            title: res.alertTitle ?? 'Alert',
            message: res.alertMessage ?? '',
            buttonTitle: res.buttonTitle ?? 'OK',
            type: res.type ?? '',
          };
        } else if (res.statusCode === 'FS') {
          state.fundShortfall = res.message ?? 'Insufficient funds';
        } else if (res.statusCode === 'QS') {
          state.quantityShortfall = res.message ?? 'Insufficient quantity';
        }
      })
      .addCase(modifyOrderThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Modify order failed';
      });

    // ── Confirm Order ───────────────────────────────────────────────────────
    builder
      .addCase(confirmOrderThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(confirmOrderThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.result = action.payload;
      })
      .addCase(confirmOrderThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Confirm order failed';
      });
  },
});

export const { resetOrderCancel, setSelectedOrder, clearResult } = orderCancelSlice.actions;
export default orderCancelSlice.reducer;
