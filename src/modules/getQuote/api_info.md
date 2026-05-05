# API Execution Trace — GetQuote Module
## api_info.md — Step 18 Artifact

All API calls used in the GetQuote feature module with resolved URLs, parameters, and classification.

---

## Base URLs

| Variable | Value | Axios Instance |
|---|---|---|
| `API_BASE_URL` | `https://api.hdfcsec.com` | `openApiClient` |
| `MS_UAT_BASE_URL` | `https://msuat.hdfcsec.com` | `msUatClient` |
| `CMOTS_BASE_URL` | `https://cmots.hdfcsec.com/mcontent-services` | `cmotsClient` |

---

## API Endpoints (Standard REST — Not WebView)

All endpoints below are standard JSON REST APIs consumed by Axios. None require WebView.

---

### 1. Fetch Quote Data

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/api/v1/getquote/equity/{exchange}/{symbol}`
- **Full URL:** `https://api.hdfcsec.com/api/v1/getquote/equity/NSE/HDFCBANK`
- **Axios Instance:** `openApiClient`
- **Path Parameters:**
  - `exchange`: `"NSE"` | `"BSE"`
  - `symbol`: `"HDFCBANK"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `QuoteDto` — all fields from Hardcoded_responce.json (ltp, changevalue, percentchange, buyprice1-5, etc.)
- **Mock Key:** `getQuoteData`
- **Mock File:** `mock/responses/mockQuoteData.json`
- **Use Case:** `FetchQuoteDataUseCase`
- **Thunk:** `fetchQuoteData`

---

### 2. Fetch Performance Data

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/api/v1/getquote/performance/{exchange}/{symbol}`
- **Full URL:** `https://api.hdfcsec.com/api/v1/getquote/performance/NSE/HDFCBANK?interval=1M`
- **Axios Instance:** `openApiClient`
- **Path Parameters:**
  - `exchange`: `"NSE"` | `"BSE"`
  - `symbol`: `"HDFCBANK"`
- **Query Parameters:**
  - `interval`: `"1D"` | `"1W"` | `"1M"` | `"3M"` | `"6M"` | `"1Y"` (default: `"1M"`)
- **Request Body:** None
- **Response Shape:** `BarChartDto[]` — `[{ duration, performance, color, open, high, low, close, volume, date }]`
- **Mock Key:** `getPerformanceData`
- **Mock File:** `mock/responses/mockPerformanceData.json`
- **Use Case:** `FetchPerformanceDataUseCase`
- **Thunk:** `fetchPerformanceData`

---

### 3. Fetch Expert Tips

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/api/v1/getquote/expert-tip/{symbol}`
- **Full URL:** `https://api.hdfcsec.com/api/v1/getquote/expert-tip/HDFCBANK`
- **Axios Instance:** `openApiClient`
- **Path Parameters:**
  - `symbol`: `"HDFCBANK"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `ExpertTipDto[]` — `[{ tipId, title, content, expert, category, createdDate, rating, analysis }]`
- **Mock Key:** `getExpertTips`
- **Mock File:** `mock/responses/mockExpertTipsData.json`
- **Use Case:** `FetchExpertTipsUseCase`
- **Thunk:** `fetchExpertTips`

---

### 4. Fetch Resistance & Support

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/api/v1/getquote/resistance-support/{exchange}/{symbol}`
- **Full URL:** `https://api.hdfcsec.com/api/v1/getquote/resistance-support/NSE/HDFCBANK`
- **Axios Instance:** `openApiClient`
- **Path Parameters:**
  - `exchange`: `"NSE"` | `"BSE"`
  - `symbol`: `"HDFCBANK"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `ResistanceSupportDto[]` — `[{ type, value, strength }]` (types: R1, R2, R3, S1, S2, S3, Pivot)
- **Mock Key:** `getResistanceSupport`
- **Use Case:** `FetchResistanceSupportUseCase`
- **Thunk:** `fetchResistanceSupport`

---

### 5. Fetch Key Stats

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/api/v1/getquote/keystats/{exchange}/{symbol}`
- **Full URL:** `https://api.hdfcsec.com/api/v1/getquote/keystats/NSE/HDFCBANK`
- **Axios Instance:** `openApiClient`
- **Path Parameters:**
  - `exchange`: `"NSE"` | `"BSE"`
  - `symbol`: `"HDFCBANK"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `KeyStatsDto[]` — `[{ label, value, type }]`
- **Mock Key:** `getKeyStats`
- **Use Case:** `FetchKeyStatsUseCase`
- **Thunk:** `fetchKeyStats`

---

### 6. Fetch Company Bio

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/api/v1/getquote/company-bio/{symbol}`
- **Full URL:** `https://api.hdfcsec.com/api/v1/getquote/company-bio/HDFCBANK`
- **Axios Instance:** `openApiClient`
- **Path Parameters:**
  - `symbol`: `"HDFCBANK"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `CompanyBioDto` — `{ companyName, description, website, hq, founded, employees, ceo, chairman, boardMembers, industry, subsector, services }`
- **Mock Key:** `getCompanyBio`
- **Use Case:** `FetchCompanyBioUseCase`
- **Thunk:** `fetchCompanyBio`

---

### 7. Fetch News

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/getquote/news/{cmotId}`
- **Full URL:** `https://cmots.hdfcsec.com/mcontent-services/getquote/news/4987`
- **Axios Instance:** `cmotsClient`
- **Path Parameters:**
  - `cmotId`: `"4987"` (from quoteData.cmotid)
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `NewsDto[]` — `[{ id, headline, content, source, publishedDate, link, imageUrl, type, cmotId }]`
- **Mock Key:** `getNews`
- **Mock File:** `mock/responses/mockNewsData.json`
- **Use Case:** `FetchNewsUseCase`
- **Thunk:** `fetchNews`

---

### 8. Fetch Bulk/Block Deals (Two parallel calls)

#### 8a. Bulk Deals
- **Classification:** Standard API
- **Method:** GET
- **Path:** `/{cmotId}/exchange/{exchange}/bulk/recordCount/{perPage}`
- **Full URL:** `https://cmots.hdfcsec.com/mcontent-services/4987/exchange/NSE/bulk/recordCount/10`
- **Axios Instance:** `cmotsClient`

#### 8b. Block Deals
- **Classification:** Standard API
- **Method:** GET
- **Path:** `/{cmotId}/exchange/{exchange}/option/block/recordCount/{perPage}`
- **Full URL:** `https://cmots.hdfcsec.com/mcontent-services/4987/exchange/NSE/option/block/recordCount/10`
- **Axios Instance:** `cmotsClient`
- **Path Parameters:**
  - `cmotId`: `"4987"`
  - `exchange`: `"NSE"` | `"BSE"`
  - `perPage`: `"10"` (default)
- **Fetch Strategy:** `Promise.allSettled([bulk, block])` → merged + sorted by date desc
- **Response Shape:** `BulkBlockDto[]`
- **Mock Key:** `getBulkBlock`
- **Mock File:** `mock/responses/mockBulkBlockData.json`
- **Use Case:** `FetchBulkBlockUseCase`
- **Thunk:** `fetchBulkBlock`

---

### 9. Fetch Announcements

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/getquote/announcements/{exchange}/{cmotId}`
- **Full URL:** `https://cmots.hdfcsec.com/mcontent-services/getquote/announcements/NSE/4987`
- **Axios Instance:** `cmotsClient`
- **Path Parameters:**
  - `exchange`: `"NSE"` | `"BSE"`
  - `cmotId`: `"4987"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `NewsDto[]`
- **Mock Key:** `getAnnouncements`
- **Use Case:** `FetchAnnouncementsUseCase`
- **Thunk:** `fetchAnnouncements`

---

### 10. Fetch Events

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/getquote/events/{cmotId}`
- **Full URL:** `https://cmots.hdfcsec.com/mcontent-services/getquote/events/4987`
- **Axios Instance:** `cmotsClient`
- **Path Parameters:**
  - `cmotId`: `"4987"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `EventDto[]` — `[{ eventId, eventType, title, description, eventDate, importance, impact }]`
- **Mock Key:** `getEvents`
- **Mock File:** `mock/responses/mockEventsData.json`
- **Use Case:** `FetchEventsUseCase`
- **Thunk:** `fetchEvents`

---

### 11. Fetch FNO Data

- **Classification:** Standard API
- **Method:** GET
- **Path:** `/api/v1/getquote/fno/{exchange}/{symbol}`
- **Full URL:** `https://api.hdfcsec.com/api/v1/getquote/fno/NSE/HDFCBANK`
- **Axios Instance:** `openApiClient`
- **Path Parameters:**
  - `exchange`: `"NSE"` | `"BSE"`
  - `symbol`: `"HDFCBANK"`
- **Query Parameters:** None
- **Request Body:** None
- **Response Shape:** `FnoDto[]` — `[{ instrumentType, expiryDate, strikePrice, optionType, oi, iv, price, delta, gamma, theta, vega }]`
- **Mock Key:** `getFnoData`
- **Use Case:** `FetchFnoUseCase`
- **Thunk:** `fetchFnoData`
- **Note:** Only triggered when user navigates to Futures or Options tab (NSE only)

---

## WebView URLs

None. All URLs in this module are standard JSON REST API endpoints consumed via Axios.

The CMOTS base URL (`https://cmots.hdfcsec.com/mcontent-services`) is an API server, not a web page URL, and does not require WebView rendering.

---

## Auth Headers

All requests include:
```
Authorization: Bearer {token}
```
Token is injected by the Axios request interceptor in `data/dataSources/apiClient.ts`.

---

## Summary

| Total Endpoints | Standard API | WebView | Mock-enabled |
|---|---|---|---|
| 12 (incl. 2 parallel) | 12 | 0 | 12 |
