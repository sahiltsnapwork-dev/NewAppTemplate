// DTO: Order Book API response shapes
// Source: order_book_v2 GSD – API_DOCUMENTATION.md, API #1, #2, #3 responses
// All top-level keys in response.data.data are explicitly mapped (no dropped keys)

// ── Open API: mb-wrapper format (POST /api/v1/book-services/OrderBook) ────────

/** Single order entry as returned by the Open API */
export interface OrderDto {
  Prc: string;               // Order price (e.g. "2500.00")
  OrderUserMessage: string;  // Human-readable message (e.g. "Order executed successfully")
  ExpDate: string;           // Expiry date (e.g. "2026-03-31")
  Qty: string;               // Ordered quantity
  Nstordno: string;          // Internal (NST) order number
  OrderedTime: string;       // Order placement time (e.g. "25/02/2026 10:00:00")
  Unfilledsize: string;      // Remaining unfilled quantity
  RejReason: string;         // Rejection reason (empty string if none)
  Prctype: string;           // Price type: "L"=Limit, "M"=Market, "SL"=Stop-Loss, "SL-M"=SL-Market
  Status: string;            // "Filled" | "Open" | "Cancelled" | "Rejected" | "Trigger Pending"
  Scripname: string;         // Full script name (e.g. "RELIANCE INDUSTRIES")
  stat: string;              // Always "Ok" for successful rows
  Exseg: string;             // Exchange segment (e.g. "NSE")
  Sym: string;               // Exchange symbol/token ID (e.g. "500325")
  ExchOrdID: string;         // Exchange order ID
  ExchConfrmtime: string;    // Exchange confirmation timestamp (ISO)
  Pcode: string;             // Product code: "NRML" | "MIS" | "CNC" | "CO" | "BO"
  Dscqty: string;            // Disclosed quantity
  token: string;             // Instrument token
  Exchange: string;          // Exchange name (e.g. "NSE")
  Validity: string;          // "DAY" | "IOC" | "GTD"
  Ordvaldate: string;        // Order validity date (e.g. "2026-02-25")
  accountId: string;         // Trading account ID
  Avgprc: string;            // Average trade price
  Trgprc: string;            // Trigger price (SL orders)
  Trantype: string;          // Transaction type: "BUY" | "SELL"
  Trsym: string;             // Trading symbol (e.g. "RELIANCE")
  Fillshares: string;        // Number of filled shares
  user: string;              // User account ID
}

export interface OrderBookOpenApiResdata {
  stat: string;              // "Ok" | "Not Ok"
  orders: OrderDto[];
}

export interface OrderBookOpenApiResponse {
  mb: {
    operationid: string;
    reqtoken: string | null;
    rs: {
      statuscode: string;    // "200" = success
      response: string;      // "Success" | error message
      resdata: OrderBookOpenApiResdata;
    };
  };
}

export interface OrderBookOpenApiRequest {
  mb: {
    operationid: string;     // Always "orderBook"
    reqtoken: string;        // Auth token
    rq: {
      appinfo: {
        appId: string;       // "ORDERBOOK_SERVICE"
        appVersion: string;  // "1.0.0"
      };
      deviceinfo: {
        deviceId: string;
        deviceType: string;  // "WEB" | "MOBILE"
      };
      reqdata: {
        uid: string;         // User ID
        actid: string;       // Account ID (e.g. "GIRISH6-OTPUAT")
        exch: string;        // Exchange filter (e.g. "NSE" or "ALL")
      };
    };
  };
}

// ── Existing DTO interfaces (legacy / other APIs) ─────────────────────────────

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
