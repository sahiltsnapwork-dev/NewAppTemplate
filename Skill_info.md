# Skill Execution Log — OrderBookV2 Flutter → React Native Migration

**Project:** HDFC Securities InvestRight v4.7.0 — OrderBookV2 Module
**Target:** React Native TypeScript, Feature-First Clean Architecture
**Base Path:** `src/features/order_book_v2/`

---

## Step 1 — readme-constitution-reader
**Purpose:** Read GSD documentation (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, CONCERNS.md, INTEGRATIONS.md, STACK.md) to extract architecture rules.
**Files Read:** 6 GSD docs + Flutter source directory scan
**Findings:**
- Feature-first clean architecture (domain → data → state → presentation)
- Redux Toolkit (createSlice + createAsyncThunk) replaces Flutter BLoC
- Axios centralized client with interceptors (no raw fetch)
- `lsSymbol ?? lssymbol` dual-casing documented
- AMO order book requires parallel fetch and merge
- SIP "ND" statusCode = no data (not error)
- `statusCode === "000"` = success for order/positions APIs

---

## Step 2 — flutter-parser
**Purpose:** Parse Dart/Flutter source files into structured metadata (widgets, state, API calls, entities).
**Files Analyzed:** ~40+ Dart files from Codebase_OrderBookV2
**Key Extractions:**
- 7 BLoC files mapped to Redux slices
- 16 API endpoint constants extracted from AppConstant.dart
- 6 main screens identified
- 12 reusable widget components identified
- 4 entity types extracted

---

## Step 3 — component-classifier
**Purpose:** Classify Flutter components into clean architecture layers.
**Layers Mapped:**
- Presentation: 7 screens + 12 components
- Domain: 8 entities, 4 repository interfaces, 8 use cases
- Data: 3 DTOs, 3 data sources, 3 repository implementations
- State: 4 slices, 3 thunk files, 3 selector files

---

## Step 4 — layout-converter
**Purpose:** Convert Flutter layout widgets (Column/Row/Expanded/Stack) to React Native Flexbox.
**Key Conversions:**
- `Column` → `View` with `flexDirection: 'column'`
- `Row` → `View` with `flexDirection: 'row'`
- `Expanded` → `flex: 1`
- `ListView.builder` → `FlatList`
- `GestureDetector` → `TouchableOpacity`

---

## Step 5 — styling-converter
**Purpose:** Convert Flutter BoxDecoration/TextStyle/EdgeInsets to React Native StyleSheet.
**Design Tokens Used:**
- Primary: `#0066CC`
- Error: `#CC0000`
- Success: `#009900`
- Background: `#F5F6FA`
- Surface: `#FFFFFF`
- Text primary: `#1A1A2E`

---

## Step 6 — domain-extraction
**Purpose:** Extract pure TypeScript domain layer with zero framework dependencies.
**Files Created:**
- `domain/entities/OrderBookEntry.ts` — OrderBookEntry, OrderBookCount
- `domain/entities/TradeBookEntry.ts` — TradeBookEntry, TradeBookDetails
- `domain/entities/Position.ts` — CumulativePositionList, PositionsSummary
- `domain/entities/MarketStatus.ts` — MarketStatus, OrderRequestResult
- `domain/entities/StockSip.ts` — StockSipData, SipRequestBookModel, SipBasketInfo
- `domain/entities/PlaceOrder.ts` — PlaceOrderRequestModel, ConvertToDeliveryRequest
- `domain/repositories/IOrderBookRepository.ts`
- `domain/repositories/IPositionsRepository.ts`
- `domain/repositories/IOrderCancelRepository.ts`
- `domain/repositories/ISipRepository.ts`
- `domain/usecases/FetchOrderBook.ts` — NRI filter, bracket order removal, descending sort
- `domain/usecases/FetchTradeBook.ts`
- `domain/usecases/CancelOrder.ts`
- `domain/usecases/ModifyOrder.ts`
- `domain/usecases/GetMarketStatus.ts`
- `domain/usecases/FetchPositions.ts` — execute() + executeParallel() via Promise.all
- `domain/usecases/ConvertToDelivery.ts`
- `domain/usecases/FetchSipData.ts` — 4 methods

**Issues Fixed:**
- NRI filtering implemented in FetchOrderBookUseCase (not BLoC)
- Bracket orders (trailOrderType === 3) stripped in use case
- lsSymbol/lssymbol dual-casing pattern used in all mappers

---

## Step 7 — redux-state-generator
**Purpose:** Generate Redux Toolkit slices, thunks, selectors.
**Files Created:**
- `state/slices/orderBookSlice.ts` — loadingIndex, openOrders, closedOrders, gtdOrders, orderCount, tradeBook, appliedFilters, filteredOrders, ctdResult, activeTab; client-side applyFilters reducer
- `state/slices/orderCancelSlice.ts`
- `state/slices/positionsSlice.ts` — toggleCarryForwardView, setSearchQuery, setSegmentFilter
- `state/slices/sipSlice.ts`
- `state/thunks/orderBookThunks.ts` — 8 thunks
- `state/thunks/orderCancelThunks.ts` — 4 thunks
- `state/thunks/positionsThunks.ts` — 2 thunks
- `state/selectors/orderBookSelectors.ts` — 12 selectors
- `state/selectors/orderCancelSelectors.ts` — 9 selectors
- `state/selectors/positionsSelectors.ts` — 18 selectors (9 positions + 9 SIP)

**BLoC → Redux Mapping:**
- BLoC Events → createAsyncThunk
- BLoC States → Redux slice state fields
- emit.forEach → extraReducers pending/fulfilled/rejected

---

## Step 8 — navigation-converter
**Purpose:** Convert Flutter Navigator.push/pushNamed to React Navigation.
**Files Created:**
- `presentation/navigation/OrderBookNavigator.tsx` — 6-screen NativeStack
**Routes:**
- `OrderBook` (main tabs)
- `OrderBookDetails: { order: OrderBookEntry }`
- `OrderBookCancel: { order, action: 'cancel' | 'modify' }`
- `PositionsDetails: { position: CumulativePositionList }`
- `ConvertPosition: { position: CumulativePositionList }`
- `ExitOpenPositions: { position: CumulativePositionList }`

---

## Step 9 — feature-folder-generator
**Purpose:** Scaffold feature-first folder structure.
**Structure Created:**
```
src/features/order_book_v2/
├── core/api/
├── domain/entities/ repositories/ usecases/
├── data/dto/ datasources/ repositories/
├── state/slices/ thunks/ selectors/
├── store/
├── di/
├── mock/
└── presentation/screens/ components/ navigation/
```

---

## Step 10 — api-integration
**Purpose:** Create centralized Axios client with interceptors.
**Files Created:**
- `core/api/apiClient.ts` — Bearer token injection; 401 clears auth; normalizeApiError parses messageList[0].messageDescription
- `core/api/endpoints.ts` — 16 endpoint constants mapped from AppConstant.dart

---

## Step 11 — mock-data-generator
**Purpose:** Create mock data layer with global/per-API toggle flags.
**Files Created:**
- `mock/mockConfig.ts` — USE_MOCK_DATA=true; MOCK_CONFIG entries for all 9 API groups; MOCK_MARKET_STATUS; MOCK_ORDER_RESULT
- `mock/orderBookMock.ts` — MOCK_ORDER_BOOK (3 open, 1 closed, 0 GTD); MOCK_TRADE_BOOK; MOCK_CTD_RESULT
- `mock/positionsMock.ts` — MOCK_POSITIONS (RELIANCE +500 P&L, HDFCBANK +450 P&L)
- `mock/sipMock.ts` — MOCK_SIP_DATA (2 SIPs: Monthly Blue Chip, Weekly Tech); MOCK_SIP_REQUEST_BOOK; MOCK_SIP_TRAIL; MOCK_SIP_CHILDREN

---

## Step 12 — data-layer-builder
**Purpose:** Implement repository interfaces with real API calls and DTO-to-entity mappers.
**Files Created:**
- `data/dto/OrderBookDto.ts`
- `data/dto/PositionsDto.ts`
- `data/dto/SipDto.ts`
- `data/datasources/OrderBookApiDataSource.ts` — 9 functions
- `data/datasources/PositionsApiDataSource.ts`
- `data/datasources/SipApiDataSource.ts`
- `data/repositories/OrderBookRepositoryImpl.ts` — mapOrderStatusDto; parallel AMO merge; trade book grouping by exchangeOrderNumber with avg price
- `data/repositories/OrderCancelRepositoryImpl.ts` — S/D/FS/QS response code mapping
- `data/repositories/PositionsRepositoryImpl.ts` — mapPositionDto; lsSymbol ?? lssymbol
- `data/repositories/SipRepositoryImpl.ts` — "ND" statusCode handling

---

## Step 13 — dependency-injector
**Purpose:** Wire DI container connecting repositories to use cases and thunks.
**Files Created:**
- `di/orderBookContainer.ts` — Creates all 4 repos + 8 use cases; exports ThunkExtra interface + orderBookContainer
- `store/rootReducer.ts` — combineReducers with 4 slices; exports RootState
- `store/store.ts` — configureStore with thunk.extraArgument: orderBookContainer; exports AppDispatch

---

## Step 14 — widget-to-jsx-converter
**Purpose:** Convert Flutter widgets to React Native TSX screens and components.

**Screens Created:**
- `presentation/screens/OrderBookScreen.tsx` — 5 main tabs; 3 sub-tabs; pull-to-refresh; loading/error/empty states; ACCOUNT placeholder
- `presentation/screens/OrderBookDetailsScreen.tsx` — Trade details on mount; CTD dialog; Cancel/Modify buttons
- `presentation/screens/OrderBookCancelScreen.tsx` — Market status banner; modify form; S/D/FS/QS handlers; validation
- `presentation/screens/PositionsScreen.tsx` — P&L summary; T+1/CF toggle; segment filter; search; FlatList
- `presentation/screens/PositionsDetailsScreen.tsx` — CF/Today toggle; market depth placeholder; Add/Exit/Convert action buttons
- `presentation/screens/ConvertPositionScreen.tsx` — Position convert form with validation
- `presentation/screens/ExitOpenPositionsScreen.tsx` — Exit confirmation with estimated value

**Components Created:**
- `presentation/components/OpenOrdersTabView.tsx` — FlatList with cancel/modify row actions
- `presentation/components/ClosedOrdersTabView.tsx` — Read-only closed orders list
- `presentation/components/OrderBookRow.tsx` — Shared order row with direction badge, status, price, action buttons
- `presentation/components/OrderStatusBadge.tsx` — Color-coded status chip
- `presentation/components/PositionRow.tsx` — Position item with P&L, LTP, Add/Exit buttons
- `presentation/components/PositionsSummaryCard.tsx` — Total P&L + invested/current metrics card
- `presentation/components/TradeBookList.tsx` — Grouped trade book with collapsible legs
- `presentation/components/ConvertToDeliveryDialog.tsx` — Bottom modal with quantity input and validation
- `presentation/components/StockSipTab.tsx` — Status filter chips, search, SIP list with Trail/Children/Details actions
- `presentation/components/OrderBookShimmer.tsx` — Animated loading skeleton
- `presentation/components/SortFilterSheet.tsx` — Filter bottom sheet (exchange/action/product/status/sort) + FilterChipRow

---

## Step 15 — typescript-enforcer
**Status:** Post-creation review
**Key Rules Applied:**
- All props interfaces typed (no `any`)
- All screen props use `NativeStackScreenProps<OrderBookNavigatorParams, 'ScreenName'>`
- All thunks typed with `ThunkExtra`
- All selectors typed with `RootState`
- `lsSymbol ?? lssymbol ?? instrumentId` fallback chain used for all symbol displays

---

## Step 16 — test-generator
**Status:** Pending — test files not yet created
**Planned Tests:**
- `__tests__/usecases/FetchOrderBook.test.ts` — NRI filter, bracket removal, sort
- `__tests__/repositories/OrderBookRepositoryImpl.test.ts` — mock vs real path
- `__tests__/slices/orderBookSlice.test.ts` — reducer actions
- `__tests__/thunks/orderBookThunks.test.ts` — thunk integration

---

## Step 17 — final-validator
**Status:** Pending formal validation
**Pre-Validation Checklist:**
- [x] All 15 API endpoints documented in api_info.md
- [x] All 6 navigator screens have implementations
- [x] All 4 Redux slices created
- [x] DI container wires all 4 repos + 8 use cases
- [x] Mock fallback for all API groups (USE_MOCK_DATA=true)
- [x] lsSymbol/lssymbol dual-casing handled everywhere
- [x] AMO parallel fetch and merge implemented
- [x] NRI filter + bracket order removal in use case
- [x] SIP "ND" status handled as empty (not error)
- [x] S/D/FS/QS response codes mapped in cancel/modify flows
- [ ] Test coverage not yet implemented (Step 16)

---

## Step 18 — api-execution-trace
**Status:** Complete
**Output:** `src/features/order_book_v2/api_info.md`
**APIs Documented:** 15 API calls with final resolved URLs, request bodies, response shapes, mock files, mock flags

---

## Step 19 — env-config-generator
**Status:** Complete
**Files Created:**
- `.env` — `API_BASE_URL=https://api.hdfcsec.com/v1`, `USE_MOCK_DATA=true`
- `.env.example` — placeholder values for production setup

---

## Issues Encountered & Resolutions

| Issue | Resolution |
|---|---|
| Flutter uses both `lsSymbol` and `lssymbol` (case inconsistency) | Applied `lsSymbol ?? lssymbol ?? instrumentId` fallback everywhere |
| AMO orders are a separate API call | Used `Promise.all` for parallel fetch; merged results tagging `isAmoOrder: true` |
| Trade book entries need grouping by order | Grouped `TradeBookListDto[]` by `exchangeOrderNumber`; computed `averageTradePrice` |
| NRI users have extra filter requirement | `FetchOrderBookUseCase` strips orders where `accountSettlementType !== selectedSettlementType` |
| Bracket orders must be hidden | Filtered where `trailOrderType === 3` in use case |
| SIP API returns "ND" for no data | `SipRepositoryImpl` treats "ND" as empty array (not throw) |
| Order cancel response uses letter codes not HTTP | Mapped S/D/FS/QS to `OrderRequestResult` in `OrderCancelRepositoryImpl` |
