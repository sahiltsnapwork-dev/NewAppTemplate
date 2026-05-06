// Thunks: Order Cancel / Modify / Confirm
// Delegates to use cases (never calls API or repository directly)

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ThunkExtra } from '../../di/orderBookContainer';
import type { PlaceOrderRequestModel } from '../../domain/entities/PlaceOrder';

// ── Fetch Market Status ────────────────────────────────────────────────────────
export const fetchMarketStatusThunk = createAsyncThunk(
  'orderCancel/fetchMarketStatus',
  async (fromScreen: string, { extra }) => {
    const { getMarketStatusUseCase } = extra as ThunkExtra;
    return getMarketStatusUseCase.execute(fromScreen);
  }
);

// ── Confirm Order Request ─────────────────────────────────────────────────────
export const confirmOrderThunk = createAsyncThunk(
  'orderCancel/confirmOrder',
  async (
    params: { orderRequest: PlaceOrderRequestModel; orderType: string },
    { extra }
  ) => {
    const { orderCancelRepository } = extra as ThunkExtra;
    return orderCancelRepository.confirmOrderRequest(params.orderRequest, params.orderType);
  }
);

// ── Cancel Order ──────────────────────────────────────────────────────────────
export const cancelOrderThunk = createAsyncThunk(
  'orderCancel/cancelOrder',
  async (
    params: { orderRequest: PlaceOrderRequestModel; orderType: string },
    { extra }
  ) => {
    const { cancelOrderUseCase } = extra as ThunkExtra;
    return cancelOrderUseCase.execute(params.orderRequest, params.orderType);
  }
);

// ── Modify Order ──────────────────────────────────────────────────────────────
export const modifyOrderThunk = createAsyncThunk(
  'orderCancel/modifyOrder',
  async (orderRequest: PlaceOrderRequestModel, { extra }) => {
    const { modifyOrderUseCase } = extra as ThunkExtra;
    return modifyOrderUseCase.execute(orderRequest);
  }
);
