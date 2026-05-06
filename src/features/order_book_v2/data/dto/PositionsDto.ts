// DTO: Positions API response shapes
// Source: order_book_v2 GSD – cumulative_positions_response_model.dart, API #16, #17

export interface CumulativePositionsApiResponse {
  statusCode: string;      // "000" = success
  messageList?: Array<{
    messageCode: string;
    messageDescription: string;
    messageType: string;
  }>;
  data?: {
    cumulativePositionList?: CumulativePositionListDto[];
    cumulativeAllPositionList?: CumulativePositionListDto[];
  };
}

export interface CumulativePositionListDto {
  exchangeIdentity: {
    exchangeId: string;
    exchangeIdType: number;
  };
  instrumentIdentity: {
    instrumentId: string;
    instrumentIdType: number;
    instrumentSegment: number;
    instrumentType: number;
    lsSymbol?: string;
    lssymbol?: string;
    expiryDate?: string;
    strikePrice?: number;
    optionType?: string;
  };
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
}
