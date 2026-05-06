// Use Case: FetchOrderBook
// Source: callOrderBookApiWithStatusEvent (order_book_event_v2.dart)
// Layer: Domain – delegates to IOrderBookRepository

import type { IOrderBookRepository, FetchOrderBookParams, OrderBookStatus } from '../repositories/IOrderBookRepository';
import type { OrderBookEntry, OrderBookCount } from '../entities/OrderBookEntry';

export interface FetchOrderBookResult {
  orders: OrderBookEntry[];
  count: OrderBookCount;
}

export class FetchOrderBookUseCase {
  constructor(private readonly repository: IOrderBookRepository) {}

  async execute(
    tradingAccountNumber: string,
    accountSettlementType: number,
    status: OrderBookStatus,
    isAmoEnabled: boolean,
    isUserNRI: boolean,
    selectedSettlementType?: number
  ): Promise<FetchOrderBookResult> {
    const params: FetchOrderBookParams = {
      tradingAccountNumber,
      accountSettlementType,
      status,
      isAmoEnabled,
    };

    const result = await this.repository.fetchOrderBook(params);

    // NRI filter: remove orders where accountSettlementType != selectedSettlementType
    let filteredOrders = result.orders;
    if (isUserNRI && selectedSettlementType !== undefined) {
      filteredOrders = filteredOrders.filter(
        (o) =>
          o.tradingAccountDetails.accountSettlementType === selectedSettlementType
      );
    }

    // Remove bracket orders (trailOrderType === 3)
    filteredOrders = filteredOrders.filter(
      (o) => o.orderLegDetails.trailOrderType !== 3
    );

    // Sort descending by orderDateTime
    filteredOrders.sort(
      (a, b) =>
        new Date(b.orderDateTime).getTime() - new Date(a.orderDateTime).getTime()
    );

    return { orders: filteredOrders, count: result.count };
  }
}
