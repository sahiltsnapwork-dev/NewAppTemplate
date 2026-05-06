// Use Case: ModifyOrder
// Source: ModifyOrderRequestEvent (order_cancel_event.dart)
// Layer: Domain – delegates to IOrderCancelRepository

import type { IOrderCancelRepository } from '../repositories/IOrderCancelRepository';
import type { PlaceOrderRequestModel } from '../entities/PlaceOrder';
import type { OrderRequestResult } from '../entities/MarketStatus';

export class ModifyOrderUseCase {
  constructor(private readonly repository: IOrderCancelRepository) {}

  async execute(orderRequest: PlaceOrderRequestModel): Promise<OrderRequestResult> {
    return this.repository.modifyOrder(orderRequest);
  }
}
