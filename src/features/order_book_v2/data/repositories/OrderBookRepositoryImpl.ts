// Repository Implementation: OrderBook
// Layer: Data – implements IOrderBookRepository interface
// Mock fallback: uses mockConfig.ts globalMockEnabled flag

import type { IOrderBookRepository, FetchOrderBookParams, FetchTradeBookParams } from '../../domain/repositories/IOrderBookRepository';
import type { OrderBookEntry, OrderBookCount } from '../../domain/entities/OrderBookEntry';
import type { TradeBookDetails } from '../../domain/entities/TradeBookEntry';
import type { ConvertToDeliveryRequest, ProductConversionRequest, OrderRequestResult } from '../../domain/entities/PlaceOrder';
import {
  fetchOrderBookV2,
  fetchAmoOrderBook,
  fetchTradeBook,
  convertToDelivery as convertToDeliveryApi,
  productConversion as productConversionApi,
  cancelOrder as cancelOrderApi,
  modifyOrder as modifyOrderApi,
  confirmNewOrderRequest as confirmOrderApi,
  fetchMarketStatus as fetchMarketStatusApi,
} from '../datasources/OrderBookApiDataSource';
import {
  MOCK_ORDER_BOOK,
  MOCK_TRADE_BOOK,
  MOCK_CTD_RESULT,
} from '../../mock/orderBookMock';
import { MOCK_CONFIG } from '../../mock/mockConfig';
import type { OrderStatusListDto } from '../dto/OrderBookDto';

// ─── Mapper: DTO → Domain Entity ─────────────────────────────────────────────
function mapOrderStatusDto(dto: OrderStatusListDto, status: 'OPEN' | 'CLOSED' | 'GTD'): OrderBookEntry {
  return {
    exchangeOrderNumber: dto.exchangeOrderNumber,
    exchangeIdentity: dto.exchangeIdentity,
    instrumentIdentity: {
      instrumentId: dto.instrumentIdentity.instrumentId,
      instrumentIdType: dto.instrumentIdentity.instrumentIdType,
      instrumentSegment: dto.instrumentIdentity.instrumentSegment,
      instrumentType: dto.instrumentIdentity.instrumentType,
      lsSymbol: dto.instrumentIdentity.lsSymbol ?? dto.instrumentIdentity.lssymbol,
      lssymbol: dto.instrumentIdentity.lssymbol ?? dto.instrumentIdentity.lsSymbol,
      instrumentName: dto.instrumentIdentity.instrumentName,
      expiryDate: dto.instrumentIdentity.expiryDate,
      strikePrice: dto.instrumentIdentity.strikePrice,
      optionType: dto.instrumentIdentity.optionType,
    },
    orderLegDetails: dto.orderLegDetails,
    tradingAccountDetails: dto.tradingAccountDetails,
    orderQuantity: dto.orderQuantity,
    remainingQuantity: dto.remainingQuantity,
    tradedQuantity: dto.tradedQuantity,
    orderPrice: dto.orderPrice,
    triggerPrice: dto.triggerPrice,
    disclosedQuantity: dto.disclosedQuantity,
    averageTradePrice: dto.averageTradePrice,
    orderDateTime: dto.orderDateTime,
    orderStatus: dto.orderStatus,
    orderBookStatus: status,
    isAmoOrder: dto.isAmoOrder ?? false,
    rejectionReason: dto.rejectionReason,
    modificationNumber: dto.modificationNumber,
    productDescription: dto.productDescription,
    exchangeName: dto.exchangeName,
  };
}

export class OrderBookRepositoryImpl implements IOrderBookRepository {
  async fetchOrderBook(params: FetchOrderBookParams): Promise<{
    orders: OrderBookEntry[];
    count: OrderBookCount;
  }> {
    if (MOCK_CONFIG.ORDER_BOOK.mockEnabled) {
      return MOCK_ORDER_BOOK[params.status];
    }

    // Parallel API call: main + AMO if enabled
    const calls: ReturnType<typeof fetchOrderBookV2>[] = [
      fetchOrderBookV2(params.tradingAccountNumber, params.accountSettlementType, params.status),
    ];
    if (params.isAmoEnabled) {
      calls.push(fetchAmoOrderBook(params.tradingAccountNumber, params.accountSettlementType, params.status));
    }

    const [mainResult, amoResult] = await Promise.all(calls);

    if (mainResult.statusCode !== '000') {
      const msg = mainResult.messageList?.[0]?.messageDescription ?? 'Order book API error';
      throw new Error(msg);
    }

    const mainOrders: OrderBookEntry[] = (
      mainResult.data?.orderStatusList ?? mainResult.data?.descendingOrderList ?? []
    ).map((dto) => mapOrderStatusDto(dto, params.status));

    const amoOrders: OrderBookEntry[] = amoResult
      ? (amoResult.data?.orderStatusList ?? []).map((dto) => ({
          ...mapOrderStatusDto(dto, params.status),
          isAmoOrder: true,
        }))
      : [];

    const orders = [...mainOrders, ...amoOrders];

    const count: OrderBookCount = {
      openCount: mainResult.data?.orderBookCount?.openCount ?? 0,
      closedCount: mainResult.data?.orderBookCount?.closedCount ?? 0,
      gtdCount: mainResult.data?.orderBookCount?.gtdCount ?? 0,
    };

    return { orders, count };
  }

  async fetchTradeBook(params: FetchTradeBookParams): Promise<TradeBookDetails[]> {
    if (MOCK_CONFIG.TRADE_BOOK.mockEnabled) {
      return MOCK_TRADE_BOOK;
    }

    const response = await fetchTradeBook(
      params.tradingAccountNumber,
      params.accountSettlementType,
      params.orderNumber,
      params.exchangeId,
      params.instrumentSegment
    );

    if (response.statusCode !== '000') return [];

    const tradeList = response.data?.tradeBookList ?? [];

    // Group by exchangeOrderNumber
    const grouped = new Map<string, TradeBookDetails>();
    for (const t of tradeList) {
      const key = t.exchangeOrderNumber;
      const entry: import('../../domain/entities/TradeBookEntry').TradeBookEntry = {
        exchangeOrderNumber: t.exchangeOrderNumber,
        tradeNumber: t.tradeNumber,
        exchangeTradeNumber: t.exchangeTradeNumber,
        internalOrderNumber: t.internalOrderNumber,
        orderSerialNumber: t.orderSerialNumber,
        tradedQuantity: t.tradedQuantity,
        tradePrice: t.tradePrice,
        tradeDateTime: t.tradeDateTime,
        orderSide: t.orderSide,
        instrumentId: t.instrumentId,
        instrumentSegment: t.instrumentSegment,
        instrumentType: t.instrumentType,
        lsSymbol: t.lsSymbol ?? t.lssymbol,
        lssymbol: t.lssymbol ?? t.lsSymbol,
        exchangeId: t.exchangeId,
        product: t.product,
        emarginDate: t.emarginDate,
        fromProduct: t.fromProduct,
        toProduct: t.toProduct,
        accountSettlementType: t.accountSettlementType,
        tradingAccountNumber: t.tradingAccountNumber,
      };

      if (!grouped.has(key)) {
        grouped.set(key, {
          exchangeOrderNumber: key,
          orderSide: t.orderSide,
          instrumentId: t.instrumentId,
          lsSymbol: t.lsSymbol ?? t.lssymbol,
          lssymbol: t.lssymbol ?? t.lsSymbol,
          exchangeId: t.exchangeId,
          product: t.product,
          instrumentSegment: t.instrumentSegment,
          trades: [],
          totalTradedQuantity: 0,
          averageTradePrice: 0,
        });
      }

      const detail = grouped.get(key)!;
      detail.trades.push(entry);
      detail.totalTradedQuantity += t.tradedQuantity;
    }

    // Compute average trade price
    for (const detail of grouped.values()) {
      const totalValue = detail.trades.reduce(
        (sum, t) => sum + t.tradePrice * t.tradedQuantity,
        0
      );
      detail.averageTradePrice =
        detail.totalTradedQuantity > 0 ? totalValue / detail.totalTradedQuantity : 0;
    }

    return Array.from(grouped.values());
  }

  async convertToDelivery(request: ConvertToDeliveryRequest): Promise<OrderRequestResult> {
    if (MOCK_CONFIG.CONVERT_TO_DELIVERY.mockEnabled) {
      return MOCK_CTD_RESULT;
    }

    const response = await convertToDeliveryApi(request);
    if (response.statusCode === '000') {
      return { statusCode: 'S' };
    }
    if (response.statusCode === '404') {
      return {
        statusCode: 'ERROR',
        message: response.messageList?.[0]?.messageDescription ?? 'CTD failed',
      };
    }
    return {
      statusCode: 'ERROR',
      message: response.messageList?.[0]?.messageDescription ?? 'CTD error',
    };
  }

  async productConversion(request: ProductConversionRequest): Promise<OrderRequestResult> {
    const response = await productConversionApi(request);
    if (response.statusCode === 'S') return { statusCode: 'S', message: response.messageList?.[0]?.messageDescription };
    return { statusCode: response.statusCode as OrderRequestResult['statusCode'], message: response.messageList?.[0]?.messageDescription };
  }
}
