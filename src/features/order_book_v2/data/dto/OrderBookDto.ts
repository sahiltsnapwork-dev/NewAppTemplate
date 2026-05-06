// DTO: Order Book API response shapes
// Source: order_book_v2 GSD – API_DOCUMENTATION.md, API #1, #2, #3 responses
// All top-level keys in response.data.data are explicitly mapped (no dropped keys)

export interface OrderBookApiResponse {
  statusCode: string;      // "000" = success, "400" = error, "404" = not found
  messageList?: Array<{
    messageCode: string;
    messageDescription: string;
    messageType: string;
  }>;
  data?: {
    orderBookCount?: OrderBookCountDto;
    orderStatusList?: OrderStatusListDto[];
    descendingOrderList?: OrderStatusListDto[];
  };
}

export interface OrderBookCountDto {
  openCount: number;
  closedCount: number;
  gtdCount: number;
  totalCount?: number;
}

export interface OrderStatusListDto {
  exchangeOrderNumber: string;
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
    instrumentName?: string;
    expiryDate?: string;
    strikePrice?: number;
    optionType?: string;
  };
  orderLegDetails: {
    orderSide: number;
    orderType: number;
    orderValidity: number;
    orderStatus: number;
    product: number;
    trailOrderType?: number;
  };
  tradingAccountDetails: {
    tradingAccountNumber: string;
    accountSettlementType: number;
  };
  orderQuantity: number;
  remainingQuantity: number;
  tradedQuantity: number;
  orderPrice: number;
  triggerPrice?: number;
  disclosedQuantity?: number;
  averageTradePrice?: number;
  orderDateTime: string;
  orderStatus: string;
  rejectionReason?: string;
  modificationNumber?: number;
  productDescription?: string;
  exchangeName?: string;
  isAmoOrder?: boolean;
}

// Trade Book DTOs (API #4)
export interface TradeBookApiResponse {
  statusCode: string;
  messageList?: Array<{
    messageCode: string;
    messageDescription: string;
    messageType: string;
  }>;
  data?: {
    tradeBookList?: TradeBookListDto[];
  };
}

export interface TradeBookListDto {
  exchangeOrderNumber: string;
  tradeNumber: string;
  exchangeTradeNumber: string;
  internalOrderNumber: number;
  orderSerialNumber: number;
  tradedQuantity: number;
  tradePrice: number;
  tradeDateTime: string;
  orderSide: number;
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

// Place order / cancel / modify response (APIs #7, #8, #9)
export interface PlaceOrderApiResponse {
  statusCode: string;        // "S" | "D" | "FS" | "QS" | error string
  messageList?: Array<{
    messageCode: string;
    messageDescription: string;
    messageType: string;
  }>;
  alertTitle?: string;
  alertMessage?: string;
  btnTitle?: string;
  type?: string;
}

// Market status response (API #6)
export interface MarketStatusApiResponse {
  statusCode: string;
  data?: {
    marketStatus?: Array<{
      marketType: string;
      status: string;
      exchangeId: string;
      segment: string;
      description?: string;
    }>;
  };
}

// CTD response (API #10)
export interface CTDApiResponse {
  statusCode: string;
  messageList?: Array<{
    messageCode: string;
    messageDescription: string;
    messageType: string;
  }>;
}
