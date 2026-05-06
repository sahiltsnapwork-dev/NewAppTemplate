// Domain Repository Interface: ISipRepository
// Layer: Domain (zero external dependencies – pure interface contract)

import type {
  StockSipData,
  SipRequestBookModel,
  SipOrderTrailItem,
  SipChildOrderItem,
  SipBasketInfo,
} from '../entities/StockSip';

export interface ISipRepository {
  getStockSipData(tradingAccountNumber: string): Promise<StockSipData[]>;

  getSipRequestBook(
    tradingAccountNumber: string,
    status: number,
    startDate: string,
    endDate: string
  ): Promise<SipRequestBookModel[]>;

  getSipOrderTrail(
    tradingAccountNumber: string,
    sipReferenceNumber: string
  ): Promise<{ basketInfo: SipBasketInfo; trailData: SipOrderTrailItem[] }>;

  getSipChildOrders(
    tradingAccountNumber: string,
    sipReferenceNumber: string
  ): Promise<{ basketInfo: SipBasketInfo; childOrders: SipChildOrderItem[] }>;
}
