// Domain Repository Interface: IOrderBookRepository
// Layer: Domain (zero external dependencies – pure interface contract)

import type { OrderBookEntry, OrderBookCount } from '../entities/OrderBookEntry';
import type { TradeBookDetails } from '../entities/TradeBookEntry';
import type {
  ConvertToDeliveryRequest,
  ProductConversionRequest,
  OrderRequestResult,
} from '../entities/PlaceOrder';

export type OrderBookStatus = 'OPEN' | 'CLOSED' | 'GTD';

export interface FetchOrderBookParams {
  tradingAccountNumber: string;
  accountSettlementType: number;
  status: OrderBookStatus;
  isAmoEnabled: boolean;
}

export interface FetchTradeBookParams {
  tradingAccountNumber: string;
  accountSettlementType: number;
  orderNumber?: string;
  exchangeId?: string;
  instrumentSegment?: number;
  buySell?: number;
  product?: number;
}

export interface IOrderBookRepository {
  fetchOrderBook(params: FetchOrderBookParams): Promise<{
    orders: OrderBookEntry[];
    count: OrderBookCount;
  }>;

  fetchTradeBook(params: FetchTradeBookParams): Promise<TradeBookDetails[]>;

  convertToDelivery(request: ConvertToDeliveryRequest): Promise<OrderRequestResult>;

  productConversion(request: ProductConversionRequest): Promise<OrderRequestResult>;
}
