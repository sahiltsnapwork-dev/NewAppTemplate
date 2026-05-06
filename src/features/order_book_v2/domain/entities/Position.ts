// Domain Entity: Position
// Source: order_book_v2 GSD – cumulative_positions_response_model.dart
// Layer: Domain (zero external dependencies)

export interface PositionExchangeIdentity {
  exchangeId: string;
  exchangeIdType: number;
}

export interface PositionInstrumentIdentity {
  instrumentId: string;
  instrumentIdType: number;
  instrumentSegment: number;
  instrumentType: number;
  lsSymbol?: string;
  lssymbol?: string;
  instrumentName?: string;
  expiryDate?: string;
  strikePrice?: number;
  optionType?: string;
}

export interface CumulativePositionList {
  exchangeIdentity: PositionExchangeIdentity;
  instrumentIdentity: PositionInstrumentIdentity;
  tradingAccountNumber: string;
  accountSettlementType: number;
  buyQuantity: number;
  sellQuantity: number;
  netQuantity: number;
  buyAveragePrice: number;
  sellAveragePrice: number;
  buyValue: number;
  sellValue: number;
  mtmValue: number;
  pnlValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  ltp: number;
  product: number;
  carryForwardBuyQuantity?: number;
  carryForwardSellQuantity?: number;
  carryForwardNetQuantity?: number;
  todayBuyQuantity?: number;
  todaySellQuantity?: number;
  todayNetQuantity?: number;
  instrumentSegment: number;
  positionType: 'NET' | 'OPEN';
}

export interface PositionsSummary {
  totalInvested: number;
  totalCurrent: number;
  totalPnl: number;
  totalPnlPercentage: number;
  dayPnl: number;
}
