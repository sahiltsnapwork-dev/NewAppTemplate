// Repository Implementation: OrderCancel
// Layer: Data – implements IOrderCancelRepository
// Mock fallback: uses mockConfig

import type { IOrderCancelRepository } from '../../domain/repositories/IOrderCancelRepository';
import type { MarketStatus, OrderRequestResult } from '../../domain/entities/MarketStatus';
import type { PlaceOrderRequestModel } from '../../domain/entities/PlaceOrder';
import {
  fetchMarketStatus,
  confirmNewOrderRequest,
  cancelOrder as cancelOrderApi,
  modifyOrder as modifyOrderApi,
} from '../datasources/OrderBookApiDataSource';
import { MOCK_CONFIG, MOCK_MARKET_STATUS, MOCK_ORDER_RESULT } from '../../mock/mockConfig';

export class OrderCancelRepositoryImpl implements IOrderCancelRepository {
  async getMarketStatus(_fromScreen: string): Promise<MarketStatus> {
    if (MOCK_CONFIG.MARKET_STATUS.mockEnabled) {
      return MOCK_MARKET_STATUS;
    }

    const response = await fetchMarketStatus();
    const statusData = response.data?.marketStatus?.[0];

    return {
      statusCode: (statusData?.status as MarketStatus['statusCode']) ?? 'UNKNOWN',
      marketType: statusData?.marketType ?? '',
      exchangeId: statusData?.exchangeId ?? '',
      segment: statusData?.segment ?? '',
      description: statusData?.description,
    };
  }

  async confirmOrderRequest(
    orderRequest: PlaceOrderRequestModel,
    orderType: string
  ): Promise<OrderRequestResult> {
    if (MOCK_CONFIG.CONFIRM_ORDER.mockEnabled) {
      return MOCK_ORDER_RESULT;
    }

    const response = await confirmNewOrderRequest(orderRequest, orderType);
    return {
      statusCode: response.statusCode as OrderRequestResult['statusCode'],
      message: response.messageList?.[0]?.messageDescription,
      alertTitle: response.alertTitle,
      alertMessage: response.alertMessage,
      buttonTitle: response.btnTitle,
      type: response.type,
    };
  }

  async cancelOrder(
    orderRequest: PlaceOrderRequestModel,
    orderType: string
  ): Promise<OrderRequestResult> {
    if (MOCK_CONFIG.CANCEL_ORDER.mockEnabled) {
      return { statusCode: 'S', message: 'Order cancelled successfully (mock)' };
    }

    const response = await cancelOrderApi(orderRequest, orderType);
    return {
      statusCode: response.statusCode as OrderRequestResult['statusCode'],
      message: response.messageList?.[0]?.messageDescription,
      alertTitle: response.alertTitle,
      alertMessage: response.alertMessage,
      buttonTitle: response.btnTitle,
      type: response.type,
    };
  }

  async modifyOrder(orderRequest: PlaceOrderRequestModel): Promise<OrderRequestResult> {
    if (MOCK_CONFIG.MODIFY_ORDER.mockEnabled) {
      return { statusCode: 'S', message: 'Order modified successfully (mock)' };
    }

    const response = await modifyOrderApi(orderRequest);
    return {
      statusCode: response.statusCode as OrderRequestResult['statusCode'],
      message: response.messageList?.[0]?.messageDescription,
      alertTitle: response.alertTitle,
      alertMessage: response.alertMessage,
      buttonTitle: response.btnTitle,
      type: response.type,
    };
  }
}
