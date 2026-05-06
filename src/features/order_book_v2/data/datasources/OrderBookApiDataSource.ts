// Data Source: OrderBook API
// Source: order_book_event_v2.dart, NetworkHelperOpenApi.CallApiServer pattern
// Layer: Data – uses apiClient (never raw fetch or axios directly)

import apiClient from '../../../../core/api/apiClient';
import { ORDER_BOOK_ENDPOINTS } from '../../../../core/api/endpoints';
import type {
  OrderBookApiResponse,
  TradeBookApiResponse,
  PlaceOrderApiResponse,
  MarketStatusApiResponse,
  CTDApiResponse,
} from '../dto/OrderBookDto';
import type {
  ConvertToDeliveryRequest,
  ProductConversionRequest,
  PlaceOrderRequestModel,
} from '../../domain/entities/PlaceOrder';

// ── Order Book V2 (by status) – API #1 ───────────────────────────────────────
export async function fetchOrderBookV2(
  tradingAccountNumber: string,
  accountSettlementType: number,
  status: 'OPEN' | 'CLOSED' | 'GTD'
): Promise<OrderBookApiResponse> {
  const response = await apiClient.post<OrderBookApiResponse>(
    ORDER_BOOK_ENDPOINTS.ORDER_BOOK_V2,
    {
      tradingAccountNumber,
      accountSettlementType,
      status,
    }
  );
  return response.data;
}

// ── AMO Order Book – API #2 ───────────────────────────────────────────────────
export async function fetchAmoOrderBook(
  tradingAccountNumber: string,
  accountSettlementType: number,
  status: 'OPEN' | 'CLOSED' | 'GTD'
): Promise<OrderBookApiResponse> {
  const response = await apiClient.post<OrderBookApiResponse>(
    ORDER_BOOK_ENDPOINTS.ORDER_BOOK_AMO,
    {
      tradingAccountNumber,
      accountSettlementType,
      status,
    }
  );
  return response.data;
}

// ── Trade Book – API #4 ────────────────────────────────────────────────────────
export async function fetchTradeBook(
  tradingAccountNumber: string,
  accountSettlementType: number,
  orderNumber?: string,
  exchangeId = 'ALL',
  instrumentSegment = 99
): Promise<TradeBookApiResponse> {
  const response = await apiClient.post<TradeBookApiResponse>(
    ORDER_BOOK_ENDPOINTS.TRADE_BOOK,
    {
      restartTradeBookDetails: {
        restartBuySell: 0,
        restartExchangeIdentity: { restartExchangeId: '', restartExchangeIdType: 0 },
        restartOrderNumber: 0,
        restartTradeNumber: 0,
      },
      tradeBookDetails: {
        orderNumber: orderNumber ?? '',
        exchangeIdentity: { exchangeId, exchangeIdType: 2 },
        instrumentIdentity: {
          instrumentId: '',
          instrumentIdType: 42,
          instrumentSegment,
          instrumentType: 99,
        },
      },
      tradingAccountDetails: {
        accountSettlementType,
        tradingAccountNumber,
      },
    }
  );
  return response.data;
}

// ── Market Status – API #6 ────────────────────────────────────────────────────
export async function fetchMarketStatus(): Promise<MarketStatusApiResponse> {
  const response = await apiClient.post<MarketStatusApiResponse>(
    ORDER_BOOK_ENDPOINTS.MARKET_STATUS,
    {}
  );
  return response.data;
}

// ── Confirm Order Request – API #7 ───────────────────────────────────────────
export async function confirmNewOrderRequest(
  orderRequest: PlaceOrderRequestModel,
  orderType: string
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.post<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.CONFIRM_NEW_ORDER_REQUEST,
    { ...orderRequest, orderType }
  );
  return response.data;
}

// ── Cancel Order – API #8 (DELETE) ───────────────────────────────────────────
export async function cancelOrder(
  orderRequest: PlaceOrderRequestModel,
  orderType: string
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.delete<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.CANCEL_ORDER,
    { data: { ...orderRequest, orderType } }
  );
  return response.data;
}

// ── Modify Order – API #9 (PUT) ───────────────────────────────────────────────
export async function modifyOrder(
  orderRequest: PlaceOrderRequestModel
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.put<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.MODIFY_ORDER,
    orderRequest
  );
  return response.data;
}

// ── Convert To Delivery – API #10 ────────────────────────────────────────────
export async function convertToDelivery(
  request: ConvertToDeliveryRequest
): Promise<CTDApiResponse> {
  const response = await apiClient.post<CTDApiResponse>(
    ORDER_BOOK_ENDPOINTS.CONVERT_TO_DELIVERY,
    request
  );
  return response.data;
}

// ── Product Conversion – API #11 ─────────────────────────────────────────────
export async function productConversion(
  request: ProductConversionRequest
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.post<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.PRODUCT_CONVERSION,
    request
  );
  return response.data;
}
