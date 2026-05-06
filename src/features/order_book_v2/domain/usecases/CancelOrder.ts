// Use Case: CancelOrder
// Source: CancelOrderRequestEvent (order_cancel_event.dart)
// Layer: Domain – delegates to IOrderCancelRepository

import type { IOrderCancelRepository } from '../repositories/IOrderCancelRepository';
import type { PlaceOrderRequestModel } from '../entities/PlaceOrder';
import type { OrderRequestResult } from '../entities/MarketStatus';

export class CancelOrderUseCase {
  constructor(private readonly repository: IOrderCancelRepository) {}

  async execute(
    orderRequest: PlaceOrderRequestModel,
    orderType: string
  ): Promise<OrderRequestResult> {
    return this.repository.cancelOrder(orderRequest, orderType);
  }
}
