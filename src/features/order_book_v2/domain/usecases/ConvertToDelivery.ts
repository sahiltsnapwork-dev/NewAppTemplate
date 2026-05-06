// Use Case: ConvertToDelivery
// Source: TradeBookConvertToDeliveryApiEvent (order_book_event_v2.dart)
// Layer: Domain – delegates to IOrderBookRepository

import type { IOrderBookRepository } from '../repositories/IOrderBookRepository';
import type { ConvertToDeliveryRequest, OrderRequestResult } from '../entities/PlaceOrder';

export class ConvertToDeliveryUseCase {
  constructor(private readonly repository: IOrderBookRepository) {}

  async execute(request: ConvertToDeliveryRequest): Promise<OrderRequestResult> {
    return this.repository.convertToDelivery(request);
  }
}
