// Mock: Order Book data
// Matches new Open API contract (POST /api/v1/book-services/OrderBook)
// Domain entities already mapped — values correspond to the mb-wrapper API fields:
//   Prc → orderPrice, Trsym → lsSymbol, Trantype → orderSide, Status → orderStatus, etc.

import type { OrderBookEntry, OrderBookCount } from '../domain/entities/OrderBookEntry';
import type { TradeBookDetails } from '../domain/entities/TradeBookEntry';
import type { OrderRequestResult } from '../domain/entities/PlaceOrder';

// ── OPEN Orders ───────────────────────────────────────────────────────────────
// Mirrors Status="Open" / "Trigger Pending" from Open API response

const MOCK_OPEN_ORDERS: OrderBookEntry[] = [
  {
    // RELIANCE – Limit BUY pending (maps to API sample order #1 variant)
    exchangeOrderNumber: 'EXCH123456',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '500325',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'RELIANCE',
      lssymbol: 'RELIANCE',
      instrumentName: 'RELIANCE INDUSTRIES',
    },
    orderLegDetails: {
      orderSide: 1,       // BUY (Trantype="BUY")
      orderType: 1,       // Limit (Prctype="L")
      orderValidity: 1,   // DAY
      orderStatus: 1,     // Open
      product: 1,         // NRML (Pcode="NRML")
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 100,       // Qty="100"
    remainingQuantity: 100,   // Unfilledsize="100"
    tradedQuantity: 0,        // Fillshares="0"
    orderPrice: 2480.00,      // Prc="2480.00"
    triggerPrice: 0,          // Trgprc="0"
    disclosedQuantity: 0,     // Dscqty="0"
    averageTradePrice: 0,     // Avgprc="0"
    orderDateTime: '06/05/2026 09:15:00',
    orderStatus: 'Open',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'NRML',
    exchangeName: 'NSE',
  },
  {
    // TCS – Limit SELL open
    exchangeOrderNumber: 'EXCH234567',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '532540',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'TCS',
      lssymbol: 'TCS',
      instrumentName: 'TATA CONSULTANCY SERVICES',
    },
    orderLegDetails: {
      orderSide: 2,       // SELL (Trantype="SELL")
      orderType: 1,       // Limit (Prctype="L")
      orderValidity: 1,   // DAY
      orderStatus: 1,     // Open
      product: 2,         // MIS
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 50,
    remainingQuantity: 50,
    tradedQuantity: 0,
    orderPrice: 4050.00,
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 0,
    orderDateTime: '06/05/2026 09:22:00',
    orderStatus: 'Open',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'MIS',
    exchangeName: 'NSE',
  },
  {
    // INFY – Stop-Loss BUY (trigger pending)
    exchangeOrderNumber: 'EXCH345678',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '500209',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'INFY',
      lssymbol: 'INFY',
      instrumentName: 'INFOSYS LIMITED',
    },
    orderLegDetails: {
      orderSide: 1,       // BUY
      orderType: 3,       // SL (Prctype="SL")
      orderValidity: 1,   // DAY
      orderStatus: 1,     // Trigger Pending
      product: 1,         // NRML
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 75,
    remainingQuantity: 75,
    tradedQuantity: 0,
    orderPrice: 1780.00,
    triggerPrice: 1775.00,
    disclosedQuantity: 0,
    averageTradePrice: 0,
    orderDateTime: '06/05/2026 09:30:00',
    orderStatus: 'Trigger Pending',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'NRML',
    exchangeName: 'NSE',
  },
  {
    // HDFCBANK – Market BUY open (BSE)
    exchangeOrderNumber: 'EXCH456789',
    exchangeIdentity: { exchangeId: 'BSE', exchangeIdType: 2 },
    instrumentIdentity: {
      instrumentId: '500180',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'HDFCBANK',
      lssymbol: 'HDFCBANK',
      instrumentName: 'HDFC BANK LIMITED',
    },
    orderLegDetails: {
      orderSide: 1,       // BUY
      orderType: 2,       // Market (Prctype="M")
      orderValidity: 2,   // IOC
      orderStatus: 1,     // Open
      product: 3,         // CNC
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 30,
    remainingQuantity: 30,
    tradedQuantity: 0,
    orderPrice: 0,        // Market order: Prc="0"
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 0,
    orderDateTime: '06/05/2026 09:45:00',
    orderStatus: 'Open',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'CNC',
    exchangeName: 'BSE',
  },
  {
    // WIPRO – Limit SELL, partially filled
    exchangeOrderNumber: 'EXCH567890',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '507685',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'WIPRO',
      lssymbol: 'WIPRO',
      instrumentName: 'WIPRO LIMITED',
    },
    orderLegDetails: {
      orderSide: 2,       // SELL
      orderType: 1,       // Limit
      orderValidity: 1,   // DAY
      orderStatus: 1,     // Open (partially filled)
      product: 2,         // MIS
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 200,
    remainingQuantity: 120,   // 80 shares already filled
    tradedQuantity: 80,
    orderPrice: 550.00,
    triggerPrice: 0,
    disclosedQuantity: 50,
    averageTradePrice: 549.75,
    orderDateTime: '06/05/2026 10:00:00',
    orderStatus: 'Open',
    orderBookStatus: 'OPEN',
    isAmoOrder: false,
    productDescription: 'MIS',
    exchangeName: 'NSE',
  },
];

// ── CLOSED Orders ─────────────────────────────────────────────────────────────
// Mirrors Status="Filled" | "Cancelled" | "Rejected" from Open API response

const MOCK_CLOSED_ORDERS: OrderBookEntry[] = [
  {
    // RELIANCE – Filled (from API sample, different values)
    exchangeOrderNumber: 'EXCH123456',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '500325',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'RELIANCE',
      lssymbol: 'RELIANCE',
      instrumentName: 'RELIANCE INDUSTRIES',
    },
    orderLegDetails: {
      orderSide: 1,       // BUY (Trantype="BUY")
      orderType: 1,       // Limit
      orderValidity: 1,   // DAY
      orderStatus: 2,     // Filled
      product: 1,         // NRML
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 100,
    remainingQuantity: 0,
    tradedQuantity: 100,
    orderPrice: 2500.00,
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 2500.00,
    orderDateTime: '25/02/2026 10:00:00',
    orderStatus: 'Filled',
    orderBookStatus: 'CLOSED',
    isAmoOrder: false,
    productDescription: 'NRML',
    exchangeName: 'NSE',
  },
  {
    // TCS – Open order carried forward (from API sample)
    exchangeOrderNumber: 'EXCH987654',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '532540',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'TCS',
      lssymbol: 'TCS',
      instrumentName: 'TATA CONSULTANCY SERVICES',
    },
    orderLegDetails: {
      orderSide: 1,       // BUY
      orderType: 1,       // Limit
      orderValidity: 1,   // DAY
      orderStatus: 2,
      product: 1,         // NRML
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 50,
    remainingQuantity: 0,
    tradedQuantity: 50,
    orderPrice: 4000.00,
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 3998.00,
    orderDateTime: '25/02/2026 09:30:00',
    orderStatus: 'Filled',
    orderBookStatus: 'CLOSED',
    isAmoOrder: false,
    productDescription: 'NRML',
    exchangeName: 'NSE',
  },
  {
    // BAJFINANCE – Cancelled by user
    exchangeOrderNumber: 'EXCH111222',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '500034',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'BAJFINANCE',
      lssymbol: 'BAJFINANCE',
      instrumentName: 'BAJAJ FINANCE LIMITED',
    },
    orderLegDetails: {
      orderSide: 2,       // SELL
      orderType: 1,       // Limit
      orderValidity: 1,   // DAY
      orderStatus: 2,
      product: 2,         // MIS
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 10,
    remainingQuantity: 10,
    tradedQuantity: 0,
    orderPrice: 7200.00,
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 0,
    orderDateTime: '05/05/2026 11:20:00',
    orderStatus: 'Cancelled',
    orderBookStatus: 'CLOSED',
    isAmoOrder: false,
    productDescription: 'MIS',
    exchangeName: 'NSE',
  },
  {
    // SBIN – Rejected (insufficient margin)
    exchangeOrderNumber: 'EXCH333444',
    exchangeIdentity: { exchangeId: 'BSE', exchangeIdType: 2 },
    instrumentIdentity: {
      instrumentId: '500112',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'SBIN',
      lssymbol: 'SBIN',
      instrumentName: 'STATE BANK OF INDIA',
    },
    orderLegDetails: {
      orderSide: 1,       // BUY
      orderType: 2,       // Market
      orderValidity: 1,   // DAY
      orderStatus: 2,
      product: 2,         // MIS
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 500,
    remainingQuantity: 500,
    tradedQuantity: 0,
    orderPrice: 0,
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 0,
    orderDateTime: '05/05/2026 13:45:00',
    orderStatus: 'Rejected',
    orderBookStatus: 'CLOSED',
    isAmoOrder: false,
    rejectionReason: 'Insufficient margin',
    productDescription: 'MIS',
    exchangeName: 'BSE',
  },
  {
    // ITC – Filled (SELL, CNC)
    exchangeOrderNumber: 'EXCH555666',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '500875',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'ITC',
      lssymbol: 'ITC',
      instrumentName: 'ITC LIMITED',
    },
    orderLegDetails: {
      orderSide: 2,       // SELL
      orderType: 1,       // Limit
      orderValidity: 1,   // DAY
      orderStatus: 2,     // Filled
      product: 3,         // CNC
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 300,
    remainingQuantity: 0,
    tradedQuantity: 300,
    orderPrice: 468.00,
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 467.80,
    orderDateTime: '05/05/2026 14:10:00',
    orderStatus: 'Filled',
    orderBookStatus: 'CLOSED',
    isAmoOrder: false,
    productDescription: 'CNC',
    exchangeName: 'NSE',
  },
];

// ── GTD Orders ────────────────────────────────────────────────────────────────
// Mirrors Validity="GTD" orders

const MOCK_GTD_ORDERS: OrderBookEntry[] = [
  {
    // MARUTI – GTD Limit BUY
    exchangeOrderNumber: 'EXCH777888',
    exchangeIdentity: { exchangeId: 'NSE', exchangeIdType: 1 },
    instrumentIdentity: {
      instrumentId: '532500',
      instrumentIdType: 42,
      instrumentSegment: 1,
      instrumentType: 1,
      lsSymbol: 'MARUTI',
      lssymbol: 'MARUTI',
      instrumentName: 'MARUTI SUZUKI INDIA LIMITED',
    },
    orderLegDetails: {
      orderSide: 1,       // BUY
      orderType: 1,       // Limit
      orderValidity: 3,   // GTD
      orderStatus: 1,     // Open
      product: 1,         // NRML
    },
    tradingAccountDetails: { tradingAccountNumber: 'GIRISH6-OTPUAT', accountSettlementType: 0 },
    orderQuantity: 5,
    remainingQuantity: 5,
    tradedQuantity: 0,
    orderPrice: 12500.00,
    triggerPrice: 0,
    disclosedQuantity: 0,
    averageTradePrice: 0,
    orderDateTime: '04/05/2026 15:25:00',
    orderStatus: 'Open',
    orderBookStatus: 'GTD',
    isAmoOrder: false,
    productDescription: 'NRML',
    exchangeName: 'NSE',
  },
];

export const MOCK_ORDER_BOOK: Record<'OPEN' | 'CLOSED' | 'GTD', { orders: OrderBookEntry[]; count: OrderBookCount }> = {
  OPEN: {
    orders: MOCK_OPEN_ORDERS,
    count: {
      openCount: MOCK_OPEN_ORDERS.length,
      closedCount: MOCK_CLOSED_ORDERS.length,
      gtdCount: MOCK_GTD_ORDERS.length,
    },
  },
  CLOSED: {
    orders: MOCK_CLOSED_ORDERS,
    count: {
      openCount: MOCK_OPEN_ORDERS.length,
      closedCount: MOCK_CLOSED_ORDERS.length,
      gtdCount: MOCK_GTD_ORDERS.length,
    },
  },
  GTD: {
    orders: MOCK_GTD_ORDERS,
    count: {
      openCount: MOCK_OPEN_ORDERS.length,
      closedCount: MOCK_CLOSED_ORDERS.length,
      gtdCount: MOCK_GTD_ORDERS.length,
    },
  },
};

export const MOCK_TRADE_BOOK: TradeBookDetails[] = [
  {
    exchangeOrderNumber: 'EXCH123456',
    orderSide: 1,
    instrumentId: '500325',
    lsSymbol: 'RELIANCE',
    lssymbol: 'RELIANCE',
    exchangeId: 'NSE',
    product: 1,
    instrumentSegment: 1,
    trades: [
      {
        exchangeOrderNumber: 'EXCH123456',
        tradeNumber: 'T20260225001',
        exchangeTradeNumber: 'ET20260225001',
        internalOrderNumber: 123456789,
        orderSerialNumber: 1,
        tradedQuantity: 100,
        tradePrice: 2500.00,
        tradeDateTime: '2026-02-25T10:00:00',
        orderSide: 1,
        instrumentId: '500325',
        instrumentSegment: 1,
        instrumentType: 1,
        lsSymbol: 'RELIANCE',
        lssymbol: 'RELIANCE',
        exchangeId: 'NSE',
        product: 1,
      },
    ],
    totalTradedQuantity: 100,
    averageTradePrice: 2500.00,
  },
  {
    exchangeOrderNumber: 'EXCH987654',
    orderSide: 1,
    instrumentId: '532540',
    lsSymbol: 'TCS',
    lssymbol: 'TCS',
    exchangeId: 'NSE',
    product: 1,
    instrumentSegment: 1,
    trades: [
      {
        exchangeOrderNumber: 'EXCH987654',
        tradeNumber: 'T20260225002',
        exchangeTradeNumber: 'ET20260225002',
        internalOrderNumber: 987654321,
        orderSerialNumber: 1,
        tradedQuantity: 50,
        tradePrice: 3998.00,
        tradeDateTime: '2026-02-25T09:30:00',
        orderSide: 1,
        instrumentId: '532540',
        instrumentSegment: 1,
        instrumentType: 1,
        lsSymbol: 'TCS',
        lssymbol: 'TCS',
        exchangeId: 'NSE',
        product: 1,
      },
    ],
    totalTradedQuantity: 50,
    averageTradePrice: 3998.00,
  },
  {
    exchangeOrderNumber: 'EXCH555666',
    orderSide: 2,
    instrumentId: '500875',
    lsSymbol: 'ITC',
    lssymbol: 'ITC',
    exchangeId: 'NSE',
    product: 3,
    instrumentSegment: 1,
    trades: [
      {
        exchangeOrderNumber: 'EXCH555666',
        tradeNumber: 'T20260505001',
        exchangeTradeNumber: 'ET20260505001',
        internalOrderNumber: 555666777,
        orderSerialNumber: 1,
        tradedQuantity: 300,
        tradePrice: 467.80,
        tradeDateTime: '2026-05-05T14:10:00',
        orderSide: 2,
        instrumentId: '500875',
        instrumentSegment: 1,
        instrumentType: 1,
        lsSymbol: 'ITC',
        lssymbol: 'ITC',
        exchangeId: 'NSE',
        product: 3,
      },
    ],
    totalTradedQuantity: 300,
    averageTradePrice: 467.80,
  },
];

export const MOCK_CTD_RESULT: OrderRequestResult = {
  statusCode: 'S',
  message: 'Convert to delivery successful (mock)',
};
