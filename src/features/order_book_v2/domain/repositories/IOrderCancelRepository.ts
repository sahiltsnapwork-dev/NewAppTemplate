// Domain Repository Interface: IOrderCancelRepository
// Layer: Domain (zero external dependencies – pure interface contract)

import type { MarketStatus, OrderRequestResult } from '../entities/MarketStatus';
import type { PlaceOrderRequestModel } from '../entities/PlaceOrder';

export interface IOrderCancelRepository {
  getMarketStatus(fromScreen: string): Promise<MarketStatus>;

  confirmOrderRequest(
    orderRequest: PlaceOrderRequestModel,
    orderType: string
  ): Promise<OrderRequestResult>;

  cancelOrder(
    orderRequest: PlaceOrderRequestModel,
    orderType: string
  ): Promise<OrderRequestResult>;

  modifyOrder(orderRequest: PlaceOrderRequestModel): Promise<OrderRequestResult>;
}
