// Domain Entity: MarketStatus
// Source: order_book_v2 GSD – place_order_repository.dart, MarketStatusResponse
// Layer: Domain (zero external dependencies)

export type MarketStatusCode =
  | 'PRE_OPEN'
  | 'OPEN'
  | 'CLOSE'
  | 'POST_CLOSE'
  | 'HOLIDAY'
  | 'UNKNOWN';

export interface MarketStatus {
  statusCode: MarketStatusCode;
  marketType: string;
  exchangeId: string;
  segment: string;
  description?: string;
}

// Place order response codes
export type OrderResponseCode = 'S' | 'D' | 'FS' | 'QS' | 'ND' | 'ERROR';

export interface OrderRequestResult {
  statusCode: OrderResponseCode;
  message?: string;
  alertTitle?: string;
  alertMessage?: string;
  buttonTitle?: string;
  type?: string;
}
