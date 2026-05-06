# API Execution Trace — OrderBookV2 Feature
**Base URL:** `http://localhost:9092` (Open API) / `https://api.hdfcsec.com/v1` (legacy APIs)
**Auth:** Bearer token via `Authorization` header (injected by Axios interceptor in `apiClient.ts`);
also injected as `mb.reqtoken` in the Open API request body.
**Mock Mode:** `USE_MOCK_DATA = true` (overrides all API calls during development)

---

## 0. Fetch Order Book — Open API (PRIMARY) ✅
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.fetchOrderBookOpenApi` |
| **Method** | POST |
| **Path** | `/api/v1/book-services/OrderBook` |
| **Final URL** | `http://localhost:9092/api/v1/book-services/OrderBook` |
| **DTO** | `OrderBookOpenApiRequest` → `OrderBookOpenApiResponse` |
| **Request Body** | `{ mb: { operationid: "orderBook", reqtoken: string, rq: { appinfo, deviceinfo, reqdata: { uid, actid, exch } } } }` |
| **Response** | `{ mb: { rs: { statuscode: "200", resdata: { stat: "Ok", orders: OrderDto[] } } } }` |
| **Mock File** | `mock/orderBookMock.ts → MOCK_ORDER_BOOK` |
| **Mock Flag** | `MOCK_CONFIG.ORDER_BOOK.mockEnabled` |

### Request Body Example
```json
{
  "mb": {
    "operationid": "orderBook",
    "reqtoken": "<auth-token>",
    "rq": {
      "appinfo": { "appId": "ORDERBOOK_SERVICE", "appVersion": "1.0.0" },
      "deviceinfo": { "deviceId": "MOBILE-APP", "deviceType": "MOBILE" },
      "reqdata": { "uid": "qwertyt12dfgf", "actid": "GIRISH6-OTPUAT", "exch": "NSE" }
    }
  }
}
```

### Response Body Example
```json
{
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
            "Prc": "2500.00", "OrderUserMessage": "Order executed successfully",
            "ExpDate": "2026-03-31", "Qty": "100", "Nstordno": "123456789",
            "OrderedTime": "25/02/2026 10:00:00", "Unfilledsize": "0",
            "RejReason": "", "Prctype": "L", "Status": "Filled",
            "Scripname": "RELIANCE INDUSTRIES", "stat": "Ok",
            "Exseg": "NSE", "Sym": "500325", "ExchOrdID": "EXCH123456",
            "ExchConfrmtime": "2026-02-25T10:00:00", "Pcode": "NRML",
            "Dscqty": "0", "token": "12345", "Exchange": "NSE",
            "Validity": "DAY", "Ordvaldate": "2026-02-25",
            "accountId": "GIRISH6-OTPUAT", "Avgprc": "2500.00",
            "Trgprc": "0", "Trantype": "BUY", "Trsym": "RELIANCE",
            "Fillshares": "100", "user": "GIRISH6-OTPUAT"
          }
        ]
      }
    }
  }
}
```

### Field Mapping: `OrderDto` → `OrderBookEntry`
| API Field | Domain Field | Notes |
|---|---|---|
| `ExchOrdID` | `exchangeOrderNumber` | Exchange order identifier |
| `Exchange` / `Exseg` | `exchangeIdentity.exchangeId` | Preferred: `Exchange` |
| `Sym` | `instrumentIdentity.instrumentId` | Exchange symbol/token |
| `Trsym` | `instrumentIdentity.lsSymbol` & `lssymbol` | Trading symbol |
| `Scripname` | `instrumentIdentity.instrumentName` | Full instrument name |
| `ExpDate` | `instrumentIdentity.expiryDate` | Derivatives expiry |
| `Trantype` ("BUY"→1 / "SELL"→2) | `orderLegDetails.orderSide` | |
| `Prctype` ("L"→1 / "M"→2 / "SL"→3 / "SL-M"→4) | `orderLegDetails.orderType` | |
| `Validity` ("DAY"→1 / "IOC"→2 / "GTD"→3) | `orderLegDetails.orderValidity` | |
| `Pcode` ("NRML"→1 / "MIS"→2 / "CNC"→3 / "CO"→4 / "BO"→5) | `orderLegDetails.product` | |
| `accountId` | `tradingAccountDetails.tradingAccountNumber` | |
| `Qty` (string) | `orderQuantity` | Parsed to number |
| `Unfilledsize` (string) | `remainingQuantity` | Parsed to number |
| `Fillshares` (string) | `tradedQuantity` | Parsed to number |
| `Prc` (string) | `orderPrice` | Parsed to float |
| `Trgprc` (string) | `triggerPrice` | Parsed to float |
| `Dscqty` (string) | `disclosedQuantity` | Parsed to float |
| `Avgprc` (string) | `averageTradePrice` | Parsed to float |
| `OrderedTime` | `orderDateTime` | Format: "DD/MM/YYYY HH:mm:ss" |
| `Status` | `orderStatus` | Human-readable status string |
| `Status` (resolved) | `orderBookStatus` | "Open"/"Trigger Pending"→`OPEN`; "Filled"/"Cancelled"/"Rejected"→`CLOSED`; "GTD"→`GTD` |
| `RejReason` | `rejectionReason` | Empty string mapped to `undefined` |
| `Pcode` | `productDescription` | Product code string |

---

## 1. Fetch Order Book (Main)
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.fetchOrderBook` |
| **Method** | POST |
| **Path** | `/orderBook/orderbookV2` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/orderbookV2` |
| **Request Body** | `{ tradingAccountNumber: string }` |
| **Response** | `OrderBookApiResponse` — `{ statusCode: "000"\|"400"\|"404", orderStatusList: OrderStatusListDto[] }` |
| **Mock File** | `mock/orderBookMock.ts → MOCK_ORDER_BOOK` |
| **Mock Flag** | `MOCK_CONFIG.ORDER_BOOK.mockEnabled` |

---

## 2. Fetch AMO Order Book
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.fetchAmoOrderBook` |
| **Method** | POST |
| **Path** | `/orderBook/amoorderbookV2` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/amoorderbookV2` |
| **Request Body** | `{ tradingAccountNumber: string }` |
| **Response** | `OrderBookApiResponse` (same schema as main) |
| **Mock File** | `mock/orderBookMock.ts → MOCK_ORDER_BOOK` (merged, tagged `isAmoOrder: true`) |
| **Mock Flag** | `MOCK_CONFIG.ORDER_BOOK.mockEnabled` |

---

## 3. Fetch Trade Book
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.fetchTradeBook` |
| **Method** | POST |
| **Path** | `/orderBook/tradebookV2` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/tradebookV2` |
| **Request Body** | `{ tradingAccountNumber: string }` |
| **Response** | `TradeBookApiResponse` — `{ statusCode, tradeBookList: TradeBookListDto[] }` |
| **Mock File** | `mock/orderBookMock.ts → MOCK_TRADE_BOOK` |
| **Mock Flag** | `MOCK_CONFIG.TRADE_BOOK.mockEnabled` |

---

## 4. Get Market Status
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.getMarketStatus` |
| **Method** | GET |
| **Path** | `/orderBook/marketStatus` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/marketStatus` |
| **Request Body** | none |
| **Response** | `MarketStatusApiResponse` — `{ statusCode: "OPEN"\|"CLOSED"\|"PRE_OPEN"\|"POST_CLOSE" }` |
| **Mock File** | `mock/mockConfig.ts → MOCK_MARKET_STATUS` |
| **Mock Flag** | `MOCK_CONFIG.MARKET_STATUS.mockEnabled` |

---

## 5. Cancel Order
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.cancelOrder` |
| **Method** | DELETE |
| **Path** | `/orderBook/cancelOrder` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/cancelOrder` |
| **Request Body** | `{ exchangeOrderNumber: string, tradingAccountNumber: string }` |
| **Response** | `PlaceOrderApiResponse` — `{ statusCode: "S"\|"D"\|"FS"\|"QS", messageList: [...] }` |
| **Mock File** | `mock/mockConfig.ts → MOCK_ORDER_RESULT` |
| **Mock Flag** | `MOCK_CONFIG.CANCEL_ORDER.mockEnabled` |

---

## 6. Modify Order
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.modifyOrder` |
| **Method** | PUT |
| **Path** | `/orderBook/modifyOrder` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/modifyOrder` |
| **Request Body** | `PlaceOrderRequestModel` |
| **Response** | `PlaceOrderApiResponse` |
| **Mock File** | `mock/mockConfig.ts → MOCK_ORDER_RESULT` |
| **Mock Flag** | `MOCK_CONFIG.MODIFY_ORDER.mockEnabled` |

---

## 7. Confirm Order
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.confirmOrder` |
| **Method** | POST |
| **Path** | `/orderBook/confirmOrder` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/confirmOrder` |
| **Request Body** | `PlaceOrderRequestModel` |
| **Response** | `PlaceOrderApiResponse` |
| **Mock File** | `mock/mockConfig.ts → MOCK_ORDER_RESULT` |
| **Mock Flag** | `MOCK_CONFIG.CONFIRM_ORDER.mockEnabled` |

---

## 8. Convert to Delivery
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.convertToDelivery` |
| **Method** | POST |
| **Path** | `/orderBook/ctd` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/ctd` |
| **Request Body** | `ConvertToDeliveryRequest` |
| **Response** | `CTDApiResponse` — `{ statusCode, messageList }` |
| **Mock File** | `mock/orderBookMock.ts → MOCK_CTD_RESULT` |
| **Mock Flag** | `MOCK_CONFIG.CONVERT_TO_DELIVERY.mockEnabled` |

---

## 9. Product Conversion
| Field | Value |
|---|---|
| **Source** | `OrderBookApiDataSource.productConversion` |
| **Method** | POST |
| **Path** | `/orderBook/productConversion` |
| **Final URL** | `https://api.hdfcsec.com/v1/orderBook/productConversion` |
| **Request Body** | `ProductConversionRequest` |
| **Response** | `CTDApiResponse` |
| **Mock File** | `mock/orderBookMock.ts → MOCK_CTD_RESULT` |
| **Mock Flag** | `MOCK_CONFIG.CONVERT_TO_DELIVERY.mockEnabled` |

---

## 10. Cumulative Positions (single segment)
| Field | Value |
|---|---|
| **Source** | `PositionsApiDataSource.fetchCumulativePositions` |
| **Method** | POST |
| **Path** | `/positions/cumulativePositions` |
| **Final URL** | `https://api.hdfcsec.com/v1/positions/cumulativePositions` |
| **Request Body** | `{ tradingAccountNumber: string, instrumentSegment: number }` |
| **Response** | `CumulativePositionsApiResponse` — `{ statusCode, positionList: CumulativePositionListDto[] }` |
| **Mock File** | `mock/positionsMock.ts → MOCK_POSITIONS` |
| **Mock Flag** | `MOCK_CONFIG.POSITIONS.mockEnabled` |

---

## 11. All Cumulative Positions (parallel)
| Field | Value |
|---|---|
| **Source** | `PositionsApiDataSource.fetchAllCumulativePositions` |
| **Method** | POST (parallel via `Promise.all`) |
| **Path** | `/positions/cumulativePositions` (called per segment) |
| **Final URL** | `https://api.hdfcsec.com/v1/positions/cumulativePositions` |
| **Request Body** | `{ tradingAccountNumber, instrumentSegment: 1 }`, then `{ ..., instrumentSegment: 2 }` |
| **Response** | Array of `CumulativePositionsApiResponse`, merged |
| **Mock File** | `mock/positionsMock.ts → MOCK_POSITIONS` |
| **Mock Flag** | `MOCK_CONFIG.POSITIONS.mockEnabled` |

---

## 12. Stock SIP Data
| Field | Value |
|---|---|
| **Source** | `SipApiDataSource.fetchStockSipData` |
| **Method** | POST |
| **Path** | `/sip/stockSipData` |
| **Final URL** | `https://api.hdfcsec.com/v1/sip/stockSipData` |
| **Request Body** | `{ tradingAccountNumber: string, status?: string }` |
| **Response** | `StockSipApiResponse` — `{ statusCode, sipList: StockSipDataDto[] }` |
| **Mock File** | `mock/sipMock.ts → MOCK_SIP_DATA` |
| **Mock Flag** | `MOCK_CONFIG.SIP.mockEnabled` |

---

## 13. SIP Request Book
| Field | Value |
|---|---|
| **Source** | `SipApiDataSource.fetchSipRequestBook` |
| **Method** | POST |
| **Path** | `/sip/sipRequestBook` |
| **Final URL** | `https://api.hdfcsec.com/v1/sip/sipRequestBook` |
| **Request Body** | `SipRequestBookModel` |
| **Response** | `SipRequestBookApiResponse` — `{ statusCode: "000"\|"ND", requestList }` |
| **Mock File** | `mock/sipMock.ts → MOCK_SIP_REQUEST_BOOK` |
| **Mock Flag** | `MOCK_CONFIG.SIP.mockEnabled` |

---

## 14. SIP Order Trail
| Field | Value |
|---|---|
| **Source** | `SipApiDataSource.fetchSipOrderTrail` |
| **Method** | POST |
| **Path** | `/sip/sipOrderTrail` |
| **Final URL** | `https://api.hdfcsec.com/v1/sip/sipOrderTrail` |
| **Request Body** | `{ sipId: string, tradingAccountNumber: string }` |
| **Response** | `SipOrderTrailApiResponse` |
| **Mock File** | `mock/sipMock.ts → MOCK_SIP_TRAIL` |
| **Mock Flag** | `MOCK_CONFIG.SIP.mockEnabled` |

---

## 15. SIP Child Orders
| Field | Value |
|---|---|
| **Source** | `SipApiDataSource.fetchSipChildOrders` |
| **Method** | POST |
| **Path** | `/sip/sipChildOrders` |
| **Final URL** | `https://api.hdfcsec.com/v1/sip/sipChildOrders` |
| **Request Body** | `{ sipId: string, parentOrderId: string, tradingAccountNumber: string }` |
| **Response** | `SipChildOrderApiResponse` |
| **Mock File** | `mock/sipMock.ts → MOCK_SIP_CHILDREN` |
| **Mock Flag** | `MOCK_CONFIG.SIP.mockEnabled` |

---

## Response Status Codes Summary

| Code | Meaning |
|---|---|
| `"000"` | Success (Order Book, Positions, SIP) |
| `"400"` / `"404"` | No data / error |
| `"S"` | Order Success |
| `"D"` | Demat debit failure |
| `"FS"` | Fund shortfall |
| `"QS"` | Quantity shortfall |
| `"ND"` | No data (SIP Request Book — treated as empty, not error) |
