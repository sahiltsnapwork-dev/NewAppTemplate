// Data Source: OrderBook API
// Source: order_book_event_v2.dart, NetworkHelperOpenApi.CallApiServer pattern
// Layer: Data – uses apiClient (never raw fetch or axios directly)

import apiClient from '../../../../core/api/apiClient';
import { ORDER_BOOK_ENDPOINTS } from '../../../../core/api/endpoints';
import type {
  OrderBookApiResponse,
  TradeBookApiResponse,
  PlaceOrderApiResponse,
  MarketStatusApiResponse,
  CTDApiResponse,
  OrderBookOpenApiRequest,
  OrderBookOpenApiResponse,
} from '../dto/OrderBookDto';
import type {
  ConvertToDeliveryRequest,
  ProductConversionRequest,
  PlaceOrderRequestModel,
} from '../../domain/entities/PlaceOrder';

// ── Open API: OrderBook (mb-wrapper) – Primary endpoint ──────────────────────
// POST http://localhost:9092/api/v1/book-services/OrderBook
export async function fetchOrderBookOpenApi(
  uid: string,
  actid: string,
  reqtoken: string,
  exch = 'NSE'
): Promise<OrderBookOpenApiResponse> {
  const requestBody: OrderBookOpenApiRequest = {
    mb: {
      operationid: 'orderBook',
      reqtoken,
      rq: {
        appinfo: {
          appId: 'ORDERBOOK_SERVICE',
          appVersion: '1.0.0',
        },
        deviceinfo: {
          deviceId: 'MOBILE-APP',
          deviceType: 'MOBILE',
        },
        reqdata: {
          uid,
          actid,
          exch,
        },
      },
    },
  };
  const response ={
  "mb": {
    "operationid": "orderBook",
    "reqtoken": null,
    "rs": {
      "statuscode": "200",
      "response": "Success",
      "resdata": {
        "stat": "Ok",
        "orders": [
          {
            "Prc": "2500.00",
            "OrderUserMessage": "Order executed successfully",
            "ExpDate": "2026-03-31",
            "Qty": "100",
            "Nstordno": "123456789",
            "OrderedTime": "25/02/2026 10:00:00",
            "Unfilledsize": "0",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Filled",
            "Scripname": "RELIANCE INDUSTRIES",
            "stat": "Ok",
            "Exseg": "NSE",
            "Sym": "500325",
            "ExchOrdID": "EXCH123456",
            "ExchConfrmtime": "2026-02-25T10:00:00",
            "Pcode": "NRML",
            "Dscqty": "0",
            "token": "12345",
            "Exchange": "NSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "2500.00",
            "Trgprc": "0",
            "Trantype": "BUY",
            "Trsym": "RELIANCE",
            "Fillshares": "100",
            "user": "GIRISH6-OTPUAT"
          },
          {
            "Prc": "4000.00",
            "OrderUserMessage": "Order pending execution",
            "ExpDate": "2026-03-31",
            "Qty": "50",
            "Nstordno": "987654321",
            "OrderedTime": "25/02/2026 09:30:00",
            "Unfilledsize": "50",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Open",
            "Scripname": "TATA CONSULTANCY SERVICES",
            "stat": "Ok",
            "Exseg": "NSE",
            "Sym": "532540",
            "ExchOrdID": "EXCH654321",
            "ExchConfrmtime": "2026-02-25T09:30:00",
            "Pcode": "NRML",
            "Dscqty": "0",
            "token": "22345",
            "Exchange": "NSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "0.00",
            "Trgprc": "0",
            "Trantype": "BUY",
            "Trsym": "TCS",
            "Fillshares": "0",
            "user": "GIRISH6-OTPUAT"
          },
          {
            "Prc": "1800.00",
            "OrderUserMessage": "Order partially executed",
            "ExpDate": "2026-03-31",
            "Qty": "200",
            "Nstordno": "112233445",
            "OrderedTime": "25/02/2026 11:15:00",
            "Unfilledsize": "50",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Partially Filled",
            "Scripname": "INFOSYS LIMITED",
            "stat": "Ok",
            "Exseg": "NSE",
            "Sym": "500209",
            "ExchOrdID": "EXCH112233",
            "ExchConfrmtime": "2026-02-25T11:15:00",
            "Pcode": "CNC",
            "Dscqty": "0",
            "token": "32345",
            "Exchange": "NSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "1798.50",
            "Trgprc": "0",
            "Trantype": "SELL",
            "Trsym": "INFY",
            "Fillshares": "150",
            "user": "GIRISH6-OTPUAT"
          },
          {
            "Prc": "950.00",
            "OrderUserMessage": "Order rejected due to insufficient funds",
            "ExpDate": "2026-03-31",
            "Qty": "75",
            "Nstordno": "556677889",
            "OrderedTime": "25/02/2026 12:00:00",
            "Unfilledsize": "75",
            "RejReason": "Insufficient balance",
            "Prctype": "L",
            "Status": "Rejected",
            "Scripname": "HDFC BANK",
            "stat": "Not_Ok",
            "Exseg": "NSE",
            "Sym": "500180",
            "ExchOrdID": "EXCH556677",
            "ExchConfrmtime": "2026-02-25T12:00:00",
            "Pcode": "MIS",
            "Dscqty": "0",
            "token": "42345",
            "Exchange": "NSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "0.00",
            "Trgprc": "0",
            "Trantype": "BUY",
            "Trsym": "HDFCBANK",
            "Fillshares": "0",
            "user": "GIRISH6-OTPUAT"
          },
          {
            "Prc": "3200.00",
            "OrderUserMessage": "Order cancelled by user",
            "ExpDate": "2026-03-31",
            "Qty": "40",
            "Nstordno": "667788990",
            "OrderedTime": "25/02/2026 13:20:00",
            "Unfilledsize": "40",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Cancelled",
            "Scripname": "ASIAN PAINTS",
            "stat": "Ok",
            "Exseg": "NSE",
            "Sym": "500820",
            "ExchOrdID": "EXCH667788",
            "ExchConfrmtime": "2026-02-25T13:20:00",
            "Pcode": "NRML",
            "Dscqty": "0",
            "token": "52345",
            "Exchange": "NSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "0.00",
            "Trgprc": "0",
            "Trantype": "SELL",
            "Trsym": "ASIANPAINT",
            "Fillshares": "0",
            "user": "GIRISH6-OTPUAT"
          },

          {
            "Prc": "2850.00",
            "OrderUserMessage": "Order pending execution",
            "ExpDate": "2026-03-31",
            "Qty": "80",
            "Nstordno": "998877665",
            "OrderedTime": "25/02/2026 14:30:00",
            "Unfilledsize": "80",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Open",
            "Scripname": "BHARTI AIRTEL",
            "stat": "Ok",
            "Exseg": "NSE",
            "Sym": "532454",
            "ExchOrdID": "EXCH998877",
            "ExchConfrmtime": "2026-02-25T14:30:00",
            "Pcode": "MIS",
            "Dscqty": "0",
            "token": "72345",
            "Exchange": "NSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "0.00",
            "Trgprc": "0",
            "Trantype": "BUY",
            "Trsym": "BHARTIARTL",
            "Fillshares": "0",
            "user": "GIRISH6-OTPUAT"
          },
          {
            "Prc": "1120.00",
            "OrderUserMessage": "Order pending execution",
            "ExpDate": "2026-03-31",
            "Qty": "150",
            "Nstordno": "887766554",
            "OrderedTime": "25/02/2026 15:00:00",
            "Unfilledsize": "150",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Open",
            "Scripname": "STATE BANK OF INDIA",
            "stat": "Ok",
            "Exseg": "NSE",
            "Sym": "500112",
            "ExchOrdID": "EXCH887766",
            "ExchConfrmtime": "2026-02-25T15:00:00",
            "Pcode": "CNC",
            "Dscqty": "0",
            "token": "82345",
            "Exchange": "NSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "0.00",
            "Trgprc": "0",
            "Trantype": "SELL",
            "Trsym": "SBIN",
            "Fillshares": "0",
            "user": "GIRISH6-OTPUAT"
          },

          {
            "Prc": "1560.00",
            "OrderUserMessage": "Order pending execution",
            "ExpDate": "2026-03-31",
            "Qty": "60",
            "Nstordno": "776655443",
            "OrderedTime": "25/02/2026 15:10:00",
            "Unfilledsize": "60",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Open",
            "Scripname": "ITC LIMITED",
            "stat": "Ok",
            "Exseg": "BSE",
            "Sym": "500875",
            "ExchOrdID": "BSE776655",
            "ExchConfrmtime": "2026-02-25T15:10:00",
            "Pcode": "NRML",
            "Dscqty": "0",
            "token": "92345",
            "Exchange": "BSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "0.00",
            "Trgprc": "0",
            "Trantype": "BUY",
            "Trsym": "ITC",
            "Fillshares": "0",
            "user": "GIRISH6-OTPUAT"
          },
          {
            "Prc": "745.00",
            "OrderUserMessage": "Order executed successfully",
            "ExpDate": "2026-03-31",
            "Qty": "90",
            "Nstordno": "665544332",
            "OrderedTime": "25/02/2026 15:20:00",
            "Unfilledsize": "0",
            "RejReason": "",
            "Prctype": "MKT",
            "Status": "Filled",
            "Scripname": "WIPRO LIMITED",
            "stat": "Ok",
            "Exseg": "BSE",
            "Sym": "507685",
            "ExchOrdID": "BSE665544",
            "ExchConfrmtime": "2026-02-25T15:20:00",
            "Pcode": "CNC",
            "Dscqty": "0",
            "token": "10345",
            "Exchange": "BSE",
            "Validity": "IOC",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "744.50",
            "Trgprc": "0",
            "Trantype": "BUY",
            "Trsym": "WIPRO",
            "Fillshares": "90",
            "user": "GIRISH6-OTPUAT"
          },
          {
            "Prc": "2150.00",
            "OrderUserMessage": "Order pending execution",
            "ExpDate": "2026-03-31",
            "Qty": "70",
            "Nstordno": "554433221",
            "OrderedTime": "25/02/2026 15:35:00",
            "Unfilledsize": "70",
            "RejReason": "",
            "Prctype": "L",
            "Status": "Open",
            "Scripname": "MARUTI SUZUKI INDIA",
            "stat": "Ok",
            "Exseg": "BSE",
            "Sym": "532500",
            "ExchOrdID": "BSE554433",
            "ExchConfrmtime": "2026-02-25T15:35:00",
            "Pcode": "MIS",
            "Dscqty": "0",
            "token": "11345",
            "Exchange": "BSE",
            "Validity": "DAY",
            "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT",
            "Avgprc": "0.00",
            "Trgprc": "0",
            "Trantype": "SELL",
            "Trsym": "MARUTI",
            "Fillshares": "0",
            "user": "GIRISH6-OTPUAT"
          }
        ]
      }
    }
  }
}
  console.log('[OrderBook] Open API response:', JSON.stringify(response, null, 2));
  return response;
}

// ── Order Book V2 (by status) – API #1 ───────────────────────────────────────
export async function fetchOrderBookV2(
  tradingAccountNumber: string,
  accountSettlementType: number,
  status: 'OPEN' | 'CLOSED' | 'GTD'
): Promise<OrderBookApiResponse> {
  const response = await apiClient.post<OrderBookApiResponse>(
    ORDER_BOOK_ENDPOINTS.ORDER_BOOK_V2,
    {
      tradingAccountNumber,
      accountSettlementType,
      status,
    }
  );
  return response.data;
}

// ── AMO Order Book – API #2 ───────────────────────────────────────────────────
export async function fetchAmoOrderBook(
  tradingAccountNumber: string,
  accountSettlementType: number,
  status: 'OPEN' | 'CLOSED' | 'GTD'
): Promise<OrderBookApiResponse> {
  const response = await apiClient.post<OrderBookApiResponse>(
    ORDER_BOOK_ENDPOINTS.ORDER_BOOK_AMO,
    {
      tradingAccountNumber,
      accountSettlementType,
      status,
    }
  );
  return response.data;
}

// ── Trade Book – API #4 ────────────────────────────────────────────────────────
export async function fetchTradeBook(
  tradingAccountNumber: string,
  accountSettlementType: number,
  orderNumber?: string,
  exchangeId = 'ALL',
  instrumentSegment = 99
): Promise<TradeBookApiResponse> {
  const response = await apiClient.post<TradeBookApiResponse>(
    ORDER_BOOK_ENDPOINTS.TRADE_BOOK,
    {
      restartTradeBookDetails: {
        restartBuySell: 0,
        restartExchangeIdentity: { restartExchangeId: '', restartExchangeIdType: 0 },
        restartOrderNumber: 0,
        restartTradeNumber: 0,
      },
      tradeBookDetails: {
        orderNumber: orderNumber ?? '',
        exchangeIdentity: { exchangeId, exchangeIdType: 2 },
        instrumentIdentity: {
          instrumentId: '',
          instrumentIdType: 42,
          instrumentSegment,
          instrumentType: 99,
        },
      },
      tradingAccountDetails: {
        accountSettlementType,
        tradingAccountNumber,
      },
    }
  );
  return response.data;
}

// ── Market Status – API #6 ────────────────────────────────────────────────────
export async function fetchMarketStatus(): Promise<MarketStatusApiResponse> {
  const response = await apiClient.post<MarketStatusApiResponse>(
    ORDER_BOOK_ENDPOINTS.MARKET_STATUS,
    {}
  );
  return response.data;
}

// ── Confirm Order Request – API #7 ───────────────────────────────────────────
export async function confirmNewOrderRequest(
  orderRequest: PlaceOrderRequestModel,
  orderType: string
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.post<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.CONFIRM_NEW_ORDER_REQUEST,
    { ...orderRequest, orderType }
  );
  return response.data;
}

// ── Cancel Order – API #8 (DELETE) ───────────────────────────────────────────
export async function cancelOrder(
  orderRequest: PlaceOrderRequestModel,
  orderType: string
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.delete<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.CANCEL_ORDER,
    { data: { ...orderRequest, orderType } }
  );
  return response.data;
}

// ── Modify Order – API #9 (PUT) ───────────────────────────────────────────────
export async function modifyOrder(
  orderRequest: PlaceOrderRequestModel
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.put<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.MODIFY_ORDER,
    orderRequest
  );
  return response.data;
}

// ── Convert To Delivery – API #10 ────────────────────────────────────────────
export async function convertToDelivery(
  request: ConvertToDeliveryRequest
): Promise<CTDApiResponse> {
  const response = await apiClient.post<CTDApiResponse>(
    ORDER_BOOK_ENDPOINTS.CONVERT_TO_DELIVERY,
    request
  );
  return response.data;
}

// ── Product Conversion – API #11 ─────────────────────────────────────────────
export async function productConversion(
  request: ProductConversionRequest
): Promise<PlaceOrderApiResponse> {
  const response = await apiClient.post<PlaceOrderApiResponse>(
    ORDER_BOOK_ENDPOINTS.PRODUCT_CONVERSION,
    request
  );
  return response.data;
}
