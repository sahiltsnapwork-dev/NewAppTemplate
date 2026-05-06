// Use Case: GetMarketStatus
// Source: OrderCancelMarketStateEvent (order_cancel_event.dart)
// Layer: Domain – delegates to IOrderCancelRepository

import type { IOrderCancelRepository } from '../repositories/IOrderCancelRepository';
import type { MarketStatus } from '../entities/MarketStatus';

export class GetMarketStatusUseCase {
  constructor(private readonly repository: IOrderCancelRepository) {}

  async execute(fromScreen: string): Promise<MarketStatus> {
    return this.repository.getMarketStatus(fromScreen);
  }
}
