// Domain Entity: OrderBookEntry
// Source: order_book_v2 GSD – order_book_response.dart, OrderStatusList model
// Layer: Domain (zero external dependencies)

export interface OrderBookExchangeIdentity {
  exchangeId: string;
  exchangeIdType: number;
}

export interface OrderBookInstrumentIdentity {
  instrumentId: string;
  instrumentIdType: number;
  instrumentSegment: number;
  instrumentType: number;
  lsSymbol?: string;
  lssymbol?: string; // camelCase + lowercase variant via ?? chaining
  instrumentName?: string;
  expiryDate?: string;
  strikePrice?: number;
  optionType?: string;
}

export interface OrderBookOrderLegDetails {
  orderSide: number;         // 1=Buy, 2=Sell
  orderType: number;
  orderValidity: number;
  orderStatus: number;
  product: number;
  trailOrderType?: number;   // 3=Bracket order (filtered out)
}

export interface OrderBookTradingAccountDetails {
  tradingAccountNumber: string;
  accountSettlementType: number;
}

export interface OrderBookEntry {
  exchangeOrderNumber: string;
  exchangeIdentity: OrderBookExchangeIdentity;
  instrumentIdentity: OrderBookInstrumentIdentity;
  orderLegDetails: OrderBookOrderLegDetails;
  tradingAccountDetails: OrderBookTradingAccountDetails;
  orderQuantity: number;
  remainingQuantity: number;
  tradedQuantity: number;
  orderPrice: number;
  triggerPrice?: number;
  disclosedQuantity?: number;
  averageTradePrice?: number;
  orderDateTime: string;
  orderStatus: string;          // "Pending" | "Traded" | "Cancelled" | etc.
  orderBookStatus: 'OPEN' | 'CLOSED' | 'GTD';
  isAmoOrder: boolean;
  rejectionReason?: string;
  modificationNumber?: number;
  productDescription?: string;
  exchangeName?: string;
}

export interface OrderBookCount {
  openCount: number;
  closedCount: number;
  gtdCount: number;
}
