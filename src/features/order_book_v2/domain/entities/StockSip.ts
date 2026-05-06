// Domain Entity: StockSip
// Source: order_book_v2 GSD – sip_request_book_model.dart, stock_sip_repository.dart
// Layer: Domain (zero external dependencies)

export interface StockSipData {
  sipReferenceNumber: string;
  basketName: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | string;
  frequency: string;
  startDate: string;
  endDate?: string;
  amount: number;
  tradingAccountNumber: string;
  nextInstallmentDate?: string;
  totalInstallments?: number;
  completedInstallments?: number;
  remainingInstallments?: number;
}

export interface SipRequestBookModel {
  sipReferenceNumber: string;
  basketName: string;
  status: number;
  fromDate: string;
  toDate: string;
  tradingAccountNumber: string;
}

export interface SipOrderTrailItem {
  trailDate: string;
  installmentNumber: number;
  status: string;
  amount: number;
  executedAmount?: number;
}

export interface SipChildOrderItem {
  exchangeOrderNumber: string;
  instrumentId: string;
  lsSymbol?: string;
  lssymbol?: string;
  quantity: number;
  price: number;
  orderSide: number;
  status: string;
  orderDateTime: string;
}

export interface SipBasketInfo {
  sipReferenceNumber: string;
  basketName: string;
  totalAmount: number;
  status: string;
}
