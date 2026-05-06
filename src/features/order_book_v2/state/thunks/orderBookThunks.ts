// Thunks: Order Book (fetching, CTD, SIP actions)
// Thunks delegate to use cases only – never call API directly

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { OrderBookStatus } from '../slices/orderBookSlice';
import type { ThunkExtra } from '../../di/orderBookContainer';
import type { ConvertToDeliveryRequest, ProductConversionRequest } from '../../domain/entities/PlaceOrder';
import type { SipRequestBookModel } from '../../domain/entities/StockSip';

// ── Fetch Order Book (Open / Closed / GTD) ────────────────────────────────────
export const fetchOrderBookThunk = createAsyncThunk(
  'orderBook/fetchOrderBook',
  async (
    params: {
      tradingAccountNumber: string;
      accountSettlementType: number;
      status: OrderBookStatus;
      isAmoEnabled: boolean;
      isUserNRI: boolean;
      selectedSettlementType?: number;
      loaderIndex?: number;
    },
    { extra }
  ) => {
    const { fetchOrderBookUseCase } = extra as ThunkExtra;
    const result = await fetchOrderBookUseCase.execute(
      params.tradingAccountNumber,
      params.accountSettlementType,
      params.status,
      params.isAmoEnabled,
      params.isUserNRI,
      params.selectedSettlementType
    );
    return { ...result, status: params.status };
  }
);

// ── Fetch Trade Book ──────────────────────────────────────────────────────────
export const fetchTradeBookThunk = createAsyncThunk(
  'orderBook/fetchTradeBook',
  async (
    params: {
      tradingAccountNumber: string;
      accountSettlementType: number;
      orderNumber?: string;
    },
    { extra }
  ) => {
    const { fetchTradeBookUseCase } = extra as ThunkExtra;
    return fetchTradeBookUseCase.execute(
      params.tradingAccountNumber,
      params.accountSettlementType,
      params.orderNumber
    );
  }
);

// ── Convert To Delivery ───────────────────────────────────────────────────────
export const convertToDeliveryThunk = createAsyncThunk(
  'orderBook/convertToDelivery',
  async (request: ConvertToDeliveryRequest, { extra }) => {
    const { convertToDeliveryUseCase } = extra as ThunkExtra;
    return convertToDeliveryUseCase.execute(request);
  }
);

// ── Product Conversion ────────────────────────────────────────────────────────
export const productConversionThunk = createAsyncThunk(
  'orderBook/productConversion',
  async (request: ProductConversionRequest, { extra }) => {
    const { orderBookRepository } = extra as ThunkExtra;
    return orderBookRepository.productConversion(request);
  }
);

// ── Fetch SIP Data ────────────────────────────────────────────────────────────
export const fetchSipDataThunk = createAsyncThunk(
  'sip/fetchSipData',
  async (tradingAccountNumber: string, { extra }) => {
    const { fetchSipDataUseCase } = extra as ThunkExtra;
    return fetchSipDataUseCase.fetchSipData(tradingAccountNumber);
  }
);

// ── Fetch SIP Request Book ────────────────────────────────────────────────────
export const fetchSipRequestBookThunk = createAsyncThunk(
  'sip/fetchSipRequestBook',
  async (
    params: {
      tradingAccountNumber: string;
      status: number;
      startDate: string;
      endDate: string;
    },
    { extra }
  ) => {
    const { fetchSipDataUseCase } = extra as ThunkExtra;
    return fetchSipDataUseCase.fetchSipRequestBook(
      params.tradingAccountNumber,
      params.status,
      params.startDate,
      params.endDate
    );
  }
);

// ── Fetch SIP Order Trail ─────────────────────────────────────────────────────
export const fetchSipOrderTrailThunk = createAsyncThunk(
  'sip/fetchSipOrderTrail',
  async (
    params: { tradingAccountNumber: string; sipReferenceNumber: string },
    { extra }
  ) => {
    const { fetchSipDataUseCase } = extra as ThunkExtra;
    return fetchSipDataUseCase.fetchSipOrderTrail(
      params.tradingAccountNumber,
      params.sipReferenceNumber
    );
  }
);

// ── Fetch SIP Child Orders ────────────────────────────────────────────────────
export const fetchSipChildOrdersThunk = createAsyncThunk(
  'sip/fetchSipChildOrders',
  async (
    params: { tradingAccountNumber: string; sipReferenceNumber: string },
    { extra }
  ) => {
    const { fetchSipDataUseCase } = extra as ThunkExtra;
    return fetchSipDataUseCase.fetchSipChildOrders(
      params.tradingAccountNumber,
      params.sipReferenceNumber
    );
  }
);
