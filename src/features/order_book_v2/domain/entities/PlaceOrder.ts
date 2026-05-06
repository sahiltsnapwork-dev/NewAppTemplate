// Domain Entity: PlaceOrder (shared for cancel/modify/confirm flows)
// Source: order_book_v2 GSD – place_order_repository.dart, PlaceOrderRequestModel
// Layer: Domain (zero external dependencies)

export interface PlaceOrderExchangeIdentity {
  exchangeId: string;
  exchangeIdType: number;
}

export interface PlaceOrderInstrumentIdentity {
  instrumentId: string;
  instrumentIdType: number;
  instrumentSegment: number;
  instrumentType: number;
}

export interface PlaceOrderLegDetails {
  orderSide: number;
  orderType: number;
  orderValidity: number;
  orderStatus: number;
  product: number;
  trailOrderType?: number;
}

export interface PlaceOrderTradingAccountDetails {
  tradingAccountNumber: string;
  accountSettlementType: number;
}

export interface PlaceOrderRequestModel {
  exchangeIdentity: PlaceOrderExchangeIdentity;
  instrumentIdentity: PlaceOrderInstrumentIdentity;
  orderLegDetails: PlaceOrderLegDetails;
  tradingAccountDetails: PlaceOrderTradingAccountDetails;
  exchangeOrderNumber: string;
  orderQuantity: number;
  orderPrice: number;
  triggerPrice?: number;
  disclosedQuantity?: number;
}

export interface ConvertToDeliveryRequest {
  convertToDeliveryDetails: {
    exchangeIdentity: PlaceOrderExchangeIdentity;
    fromProduct: number;
    instrumentIdentity: PlaceOrderInstrumentIdentity;
    orderTradeDetails: {
      emarginDate: string;
      exchangeOrderNumber: string;
      exchangeTradeNumber: string;
      internalOrderNumber: number;
      orderSerialNumber: number;
      orderSide: number;
    };
    toProduct: number;
    tradePriceDetails: { tradePrice: number };
    tradeQuantityDetails: { quantity: number };
  };
  tradingAccountDetails: PlaceOrderTradingAccountDetails;
}

export interface ProductConversionRequest {
  fromProduct: number;
  toProduct: number;
  exchangeIdentity: PlaceOrderExchangeIdentity;
  instrumentIdentity: PlaceOrderInstrumentIdentity;
  tradingAccountDetails: PlaceOrderTradingAccountDetails;
  quantity: number;
}

// Re-export OrderRequestResult so consumers can import it from either entity file
export type { OrderRequestResult } from './MarketStatus';
