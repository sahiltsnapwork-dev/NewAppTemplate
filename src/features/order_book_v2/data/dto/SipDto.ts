// DTO: SIP API response shapes
// Source: order_book_v2 GSD – sip_request_book_model.dart, APIs #12-#15

export interface StockSipApiResponse {
  statusCode: string;
  messageList?: Array<{
    messageCode: string;
    messageDescription: string;
    messageType: string;
  }>;
  data?: {
    sipDataList?: StockSipDataDto[];
  };
}

export interface StockSipDataDto {
  sipReferenceNumber: string;
  basketName: string;
  status: string;
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

export interface SipRequestBookApiResponse {
  statusCode: string;     // "ND" = no data
  messageList?: Array<{
    messageCode: string;
    messageDescription: string;
    messageType: string;
  }>;
  data?: {
    sipRequestBookList?: SipRequestBookDto[];
  };
}

export interface SipRequestBookDto {
  sipReferenceNumber: string;
  basketName: string;
  status: number;
  fromDate: string;
  toDate: string;
  tradingAccountNumber: string;
}

export interface SipOrderTrailApiResponse {
  statusCode: string;
  data?: {
    basketInfoData?: {
      sipReferenceNumber: string;
      basketName: string;
      totalAmount: number;
      status: string;
    };
    basketTrailInfoData?: Array<{
      trailDate: string;
      installmentNumber: number;
      status: string;
      amount: number;
      executedAmount?: number;
    }>;
  };
}

export interface SipChildOrderApiResponse {
  statusCode: string;
  data?: {
    basketInfoData?: {
      sipReferenceNumber: string;
      basketName: string;
      totalAmount: number;
      status: string;
    };
    basketChildInfoData?: Array<{
      exchangeOrderNumber: string;
      instrumentId: string;
      lsSymbol?: string;
      lssymbol?: string;
      quantity: number;
      price: number;
      orderSide: number;
      status: string;
      orderDateTime: string;
    }>;
  };
}
