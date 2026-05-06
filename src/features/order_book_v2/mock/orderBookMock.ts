// Mock: Order Book data
// Matches real API contract (API #1, #2) exactly
// Source: order_book_utility.dart getOrderStatusStaticResponse()

import type { OrderBookEntry, OrderBookCount } from '../domain/entities/OrderBookEntry';
import type { TradeBookDetails } from '../domain/entities/TradeBookEntry';
import type { OrderRequestResult } from '../domain/entities/PlaceOrder';

const MOCK_OPEN_ORDERS: OrderBookEntry[] = [
  {
    exchangeOrderNumber: '1100000012345678',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '2885',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'RELIANCE',
      lssymbol: 'RELIANCE',
      instrumentName: 'Reliance Industries Ltd',
    },
    orderLegDetails: {
      orderSide: 1,    // Buy
      orderType: 1,    // Limit
      orderValidity: 1,
      orderStatus: 1,  // Pending
      product: 1,      // Cash
    },
    tradingAccountDetails: { tradingAccountNumber: '12345678', accountSettlementType: 0 },
    orderQuantity: 10,
    remainingQuantity: 10,
    tradedQuantity: 0,
    orderPrice: 2450.50,
    triggerPrice: 0,
    disclosedQuantity: 0,
    orderDateTime: new Date().toISOString(),
    orderStatus: 'Pending',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'Cash',
    exchangeName: 'NSE',
  },
  {
    exchangeOrderNumber: '1100000012345679',
    exchangeIdentity: { exchangeId: 'BSE', exchangeIdType: 2 },
    instrumentIdentity: {
      instrumentId: '500325',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'RELIANCE',
      lssymbol: 'RELIANCE',
      instrumentName: 'Reliance Industries Ltd',
    },
    orderLegDetails: {
      orderSide: 2,    // Sell
      orderType: 2,    // Market
      orderValidity: 1,
      orderStatus: 1,
      product: 2,      // Margin
    },
    tradingAccountDetails: { tradingAccountNumber: '12345678', accountSettlementType: 0 },
    orderQuantity: 5,
    remainingQuantity: 5,
    tradedQuantity: 0,
    orderPrice: 0,
    orderDateTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    orderStatus: 'Pending',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'Margin',
    exchangeName: 'BSE',
  },
  {
    exchangeOrderNumber: '1100000012345680',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '1660',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'HDFCBANK',
      lssymbol: 'HDFCBANK',
      instrumentName: 'HDFC Bank Ltd',
    },
    orderLegDetails: {
      orderSide: 1,
      orderType: 1,
      orderValidity: 1,
      orderStatus: 1,
      product: 1,
    },
    tradingAccountDetails: { tradingAccountNumber: '12345678', accountSettlementType: 0 },
    orderQuantity: 20,
    remainingQuantity: 20,
    tradedQuantity: 0,
    orderPrice: 1650.00,
    orderDateTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    orderStatus: 'Pending',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'Cash',
    exchangeName: 'NSE',
  },
];

const MOCK_CLOSED_ORDERS: OrderBookEntry[] = [
  {
    exchangeOrderNumber: '1100000012345670',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '3045',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'TCS',
      lssymbol: 'TCS',
      instrumentName: 'Tata Consultancy Services Ltd',
    },
    orderLegDetails: {
      orderSide: 1,
      orderType: 1,
      orderValidity: 1,
      orderStatus: 2,  // Traded
      product: 1,
    },
    tradingAccountDetails: { tradingAccountNumber: '12345678', accountSettlementType: 0 },
    orderQuantity: 5,
    remainingQuantity: 0,
    tradedQuantity: 5,
    orderPrice: 3400.00,
    averageTradePrice: 3398.50,
    orderDateTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    orderStatus: 'Traded',
    orderBookStatus: 'CLOSED',
    isAmoOrder: false,
    productDescription: 'Cash',
    exchangeName: 'NSE',
  },
];

const MOCK_GTD_ORDERS: OrderBookEntry[] = [];

export const MOCK_ORDER_BOOK: Record<'OPEN' | 'CLOSED' | 'GTD', { orders: OrderBookEntry[]; count: OrderBookCount }> = {
  OPEN: {
    orders: MOCK_OPEN_ORDERS,
    count: { openCount: MOCK_OPEN_ORDERS.length, closedCount: 1, gtdCount: 0 },
  },
  CLOSED: {
    orders: MOCK_CLOSED_ORDERS,
    count: { openCount: MOCK_OPEN_ORDERS.length, closedCount: MOCK_CLOSED_ORDERS.length, gtdCount: 0 },
  },
  GTD: {
    orders: MOCK_GTD_ORDERS,
    count: { openCount: MOCK_OPEN_ORDERS.length, closedCount: 1, gtdCount: 0 },
  },
};

export const MOCK_TRADE_BOOK: TradeBookDetails[] = [
  {
    exchangeOrderNumber: '1100000012345670',
    orderSide: 1,
    instrumentId: '3045',
    lsSymbol: 'TCS',
    lssymbol: 'TCS',
    exchangeId: 'NSE',
    product: 1,
    instrumentSegment: 1,
    trades: [
      {
        exchangeOrderNumber: '1100000012345670',
        tradeNumber: 'T001',
        exchangeTradeNumber: 'ET001',
        internalOrderNumber: 12345,
        orderSerialNumber: 1,
        tradedQuantity: 5,
        tradePrice: 3398.50,
        tradeDateTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        orderSide: 1,
        instrumentId: '3045',
        instrumentSegment: 1,
        instrumentType: 1,
        lsSymbol: 'TCS',
        lssymbol: 'TCS',
        exchangeId: 'NSE',
        product: 1,
      },
    ],
    totalTradedQuantity: 5,
    averageTradePrice: 3398.50,
  },
];

export const MOCK_CTD_RESULT: OrderRequestResult = {
  statusCode: 'S',
  message: 'Convert to delivery successful (mock)',
};
