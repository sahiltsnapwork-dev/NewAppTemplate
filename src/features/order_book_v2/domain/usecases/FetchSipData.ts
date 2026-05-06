// Use Case: FetchSipData + related SIP flows
// Source: GetStockSipData, SipRequestBookApiEvent, ViewTrailApiEvent, ViewChildApiEvent
// Layer: Domain – delegates to ISipRepository

import type { ISipRepository } from '../repositories/ISipRepository';
import type {
  StockSipData,
  SipRequestBookModel,
  SipBasketInfo,
  SipOrderTrailItem,
  SipChildOrderItem,
} from '../entities/StockSip';

export class FetchSipDataUseCase {
  constructor(private readonly repository: ISipRepository) {}

  async fetchSipData(tradingAccountNumber: string): Promise<StockSipData[]> {
    return this.repository.getStockSipData(tradingAccountNumber);
  }

  async fetchSipRequestBook(
    tradingAccountNumber: string,
    status: number,
    startDate: string,
    endDate: string
  ): Promise<SipRequestBookModel[]> {
    return this.repository.getSipRequestBook(
      tradingAccountNumber,
      status,
      startDate,
      endDate
    );
  }

  async fetchSipOrderTrail(
    tradingAccountNumber: string,
    sipReferenceNumber: string
  ): Promise<{ basketInfo: SipBasketInfo; trailData: SipOrderTrailItem[] }> {
    return this.repository.getSipOrderTrail(tradingAccountNumber, sipReferenceNumber);
  }

  async fetchSipChildOrders(
    tradingAccountNumber: string,
    sipReferenceNumber: string
  ): Promise<{ basketInfo: SipBasketInfo; childOrders: SipChildOrderItem[] }> {
    return this.repository.getSipChildOrders(tradingAccountNumber, sipReferenceNumber);
  }
}
