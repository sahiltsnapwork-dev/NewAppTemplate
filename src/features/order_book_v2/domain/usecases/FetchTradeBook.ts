// Use Case: FetchTradeBook
// Source: TradeBookWithCMPApiEvent / GetTradeDetails (order_book_event_v2.dart)
// Layer: Domain – delegates to IOrderBookRepository

import type { IOrderBookRepository, FetchTradeBookParams } from '../repositories/IOrderBookRepository';
import type { TradeBookDetails } from '../entities/TradeBookEntry';

export class FetchTradeBookUseCase {
  constructor(private readonly repository: IOrderBookRepository) {}

  async execute(
    tradingAccountNumber: string,
    accountSettlementType: number,
    orderNumber?: string,
    exchangeId?: string,
    instrumentSegment?: number
  ): Promise<TradeBookDetails[]> {
    const params: FetchTradeBookParams = {
      tradingAccountNumber,
      accountSettlementType,
      orderNumber,
      exchangeId: exchangeId ?? 'ALL',
      instrumentSegment: instrumentSegment ?? 99,
    };
    return this.repository.fetchTradeBook(params);
  }
}
