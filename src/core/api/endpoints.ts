// API Endpoints for Order Book V2 module
// Source: AppConstant.dart (order_book_v2 GSD)
// All URLs are resolved from Flutter AppConstant references

// Base URL is configurable via .env (API_BASE_URL)
// These are endpoint PATH constants only — base URL is injected by apiClient

export const ORDER_BOOK_ENDPOINTS = {
  // API #1 – V2 Order Book by status (Open/Closed/GTD)
  ORDER_BOOK_V2: '/orderBookApiV2',

  // API #2 – AMO Order list (After Market Orders)
  ORDER_BOOK_AMO: '/orderBookAmoOrderApi',

  // API #3 – Legacy order book with full filter params
  ORDER_BOOK: '/orderBookApi',

  // API #4 – Trade Book (executed orders list)
  TRADE_BOOK: '/tradeBookApi',

  // API #5 – Legacy trade book with CMP (uses legacy NetworkHelper)
  TRADE_BOOK_WITH_CMP: '/tradeBookWithCMP',

  // API #6 – Market status check
  MARKET_STATUS: '/getMarketStatus',

  // API #7 – Confirm new order request (pre-check)
  CONFIRM_NEW_ORDER_REQUEST: '/newPlaceOrderRequest',

  // API #8 – Cancel order from order book
  CANCEL_ORDER: '/cancelOrderFromOrderBook',

  // API #9 – Modify existing order
  MODIFY_ORDER: '/modifyOrder',

  // API #10 – Convert intraday to delivery (CTD)
  CONVERT_TO_DELIVERY: '/convertToDelivery',

  // API #11 – Product conversion (margin->cash etc.)
  PRODUCT_CONVERSION: '/productConversion',

  // API #12 – SIP request book list
  SIP_REQUEST_BOOK: '/sipRequestBookList',

  // API #13 – Stock SIP data list
  STOCK_SIP_DATA: '/stockSipData',

  // API #14 – SIP order trail
  SIP_ORDER_TRAIL: '/sipOrderTrail',

  // API #15 – SIP child orders
  SIP_CHILD_ORDERS: '/sipChildOrderDetails',

  // API #16 / #17 – Cumulative positions (equity + F&O)
  CUMULATIVE_ALL_POSITIONS: '/cumulativeAllPositionsApi',
} as const;

export type OrderBookEndpointKey = keyof typeof ORDER_BOOK_ENDPOINTS;
