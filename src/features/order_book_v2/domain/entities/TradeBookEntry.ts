// Domain Entity: TradeBookEntry
// Source: order_book_v2 GSD – trade_book_response.dart, TradeBookList / TradeBookDetails model
// Layer: Domain (zero external dependencies)

export interface TradeBookEntry {
  exchangeOrderNumber: string;
  tradeNumber: string;
  exchangeTradeNumber: string;
  internalOrderNumber: number;
  orderSerialNumber: number;
  tradedQuantity: number;
  tradePrice: number;
  tradeDateTime: string;
  orderSide: number;          // 1=Buy, 2=Sell
  instrumentId: string;
  instrumentSegment: number;
  instrumentType: number;
  lsSymbol?: string;
  lssymbol?: string;
  exchangeId: string;
  product: number;
  emarginDate?: string;
  fromProduct?: number;
  toProduct?: number;
  accountSettlementType?: number;
  tradingAccountNumber?: string;
}

// Grouped by exchangeOrderNumber (V2 grouped format)
export interface TradeBookDetails {
  exchangeOrderNumber: string;
  orderSide: number;
  instrumentId: string;
  lsSymbol?: string;
  lssymbol?: string;
  exchangeId: string;
  product: number;
  instrumentSegment: number;
  trades: TradeBookEntry[];
  totalTradedQuantity: number;
  averageTradePrice: number;
}
