// ─── GetQuote Redux Slice ─────────────────────────────────────────────────────
// Maps to Flutter: GetQuoteDetailsBloc + GetQuoteDetailsState + GetQuoteDetailsEvent
// Replaces BLoC pattern with Redux Toolkit createSlice + createAsyncThunk

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  GqStreamingModel,
  CompanyQuoteModel,
  BestBidAsk,
} from '../models/QuoteModel';
import {
  GqNewsDetails,
  EventsData,
  BulkBlockData,
  BarChartModel,
  ResistanceSupport,
  KeyStatsData,
  ExpertTipModel,
  AnalyticsRatio,
  PeerData,
  TrendAnalyticsData,
  BalanceSheetData,
  PLData,
  ResultsData,
  ShareholdingData,
  CompanyBioModel,
  MfHoldingData,
  GqFnoModel,
} from '../models/AnalyticsModels';
import {
  HARDCODED_STREAMING,
  HARDCODED_COMPANY,
  HARDCODED_BEST_BID_ASK,
  ChartInterval,
  ChartType,
  Exchange,
} from '../constants';
import { getQuoteRepository } from '../api/GetQuoteRepository';
import { newsEventsRepository } from '../api/NewsEventsRepository';
import { analyticsFinancialsRepository } from '../api/AnalyticsRepository';
import { fnoRepository, OptionsChainRow, ExpiryDate, FuturesData } from '../api/FnoRepository';

// ── State Interface ────────────────────────────────────────────────────────────
export interface GetQuoteState {
  // Core Quote
  streaming: GqStreamingModel;
  company: CompanyQuoteModel;
  bidAsk: BestBidAsk;
  // UI state
  selectedExchange: Exchange;
  selectedChartInterval: ChartInterval;
  selectedChartType: ChartType;
  activeTabIndex: number;
  // Chart
  chartData: BarChartModel[];
  chartLoading: boolean;
  // Resistance/Support
  resistanceSupport: ResistanceSupport[];
  keyStats: KeyStatsData | null;
  expertTips: ExpertTipModel[];
  // News & Events
  news: GqNewsDetails[];
  announcements: GqNewsDetails[];
  events: EventsData[];
  bulkBlockDeals: BulkBlockData[];
  newsLoading: boolean;
  eventsLoading: boolean;
  bulkBlockLoading: boolean;
  // Analytics
  analyticsRatio: AnalyticsRatio | null;
  peers: PeerData[];
  trendAnalytics: TrendAnalyticsData[];
  analyticsLoading: boolean;
  // Financials
  balanceSheet: BalanceSheetData[];
  plStatement: PLData[];
  results: ResultsData[];
  shareholding: ShareholdingData[];
  financialsLoading: boolean;
  // Company Bio
  companyBio: CompanyBioModel | null;
  companyBioLoading: boolean;
  // MF Holdings
  mfHoldings: MfHoldingData[];
  mfHoldingsLoading: boolean;
  // F&O
  optionsChain: OptionsChainRow[];
  optionExpiries: ExpiryDate[];
  futures: FuturesData[];
  fnoLoading: boolean;
  selectedExpiry: string;
  // Feature flags
  tabsApiEnabled: boolean;
  // Loading / Error
  quoteLoading: boolean;
  error: string | null;
}

const initialState: GetQuoteState = {
  streaming: HARDCODED_STREAMING,
  company: HARDCODED_COMPANY,
  bidAsk: HARDCODED_BEST_BID_ASK,
  selectedExchange: 'NSE',
  selectedChartInterval: '1D',
  selectedChartType: 'M',
  activeTabIndex: 0,
  chartData: [],
  chartLoading: false,
  resistanceSupport: [],
  keyStats: null,
  expertTips: [],
  news: [],
  announcements: [],
  events: [],
  bulkBlockDeals: [],
  newsLoading: false,
  eventsLoading: false,
  bulkBlockLoading: false,
  analyticsRatio: null,
  peers: [],
  trendAnalytics: [],
  analyticsLoading: false,
  balanceSheet: [],
  plStatement: [],
  results: [],
  shareholding: [],
  financialsLoading: false,
  companyBio: null,
  companyBioLoading: false,
  mfHoldings: [],
  mfHoldingsLoading: false,
  optionsChain: [],
  optionExpiries: [],
  futures: [],
  fnoLoading: false,
  selectedExpiry: '',
  tabsApiEnabled: false,
  quoteLoading: false,
  error: null,
};

// ── Async Thunks (BLoC Events equivalent) ─────────────────────────────────────

export const initializeQuote = createAsyncThunk(
  'getQuote/initialize',
  async ({ symbol, exchange }: { symbol: string; exchange: Exchange }) => {
    return getQuoteRepository.getQuoteData(symbol, exchange);
  },
);

export const fetchChartData = createAsyncThunk(
  'getQuote/fetchChart',
  async ({ symbol, interval, range }: { symbol: string; interval: string; range?: string }) => {
    return getQuoteRepository.getChartData(symbol, interval, range);
  },
);

export const fetchResistanceSupport = createAsyncThunk(
  'getQuote/fetchResistanceSupport',
  async (symbol: string) => getQuoteRepository.getResistanceSupport(symbol),
);

export const fetchKeyStats = createAsyncThunk(
  'getQuote/fetchKeyStats',
  async (symbol: string) => getQuoteRepository.getKeyStats(symbol),
);

export const fetchExpertTips = createAsyncThunk(
  'getQuote/fetchExpertTips',
  async (symbol: string) => getQuoteRepository.getExpertTips(symbol),
);

export const fetchNews = createAsyncThunk(
  'getQuote/fetchNews',
  async ({ symbol, limit, offset }: { symbol: string; limit?: number; offset?: number }) => {
    return newsEventsRepository.getNews(symbol, limit, offset);
  },
);

export const fetchEvents = createAsyncThunk(
  'getQuote/fetchEvents',
  async (symbol: string) => newsEventsRepository.getEvents(symbol),
);

export const fetchBulkBlockDeals = createAsyncThunk(
  'getQuote/fetchBulkBlock',
  async (symbol: string) => newsEventsRepository.getBulkBlockDeals(symbol),
);

export const fetchAnalyticsRatios = createAsyncThunk(
  'getQuote/fetchRatios',
  async (symbol: string) => analyticsFinancialsRepository.getAnalyticsRatios(symbol),
);

export const fetchPeers = createAsyncThunk(
  'getQuote/fetchPeers',
  async (symbol: string) => analyticsFinancialsRepository.getPeers(symbol),
);

export const fetchTrendAnalytics = createAsyncThunk(
  'getQuote/fetchTrendAnalytics',
  async (symbol: string) => analyticsFinancialsRepository.getTrendAnalytics(symbol),
);

export const fetchBalanceSheet = createAsyncThunk(
  'getQuote/fetchBalanceSheet',
  async (symbol: string) => analyticsFinancialsRepository.getBalanceSheet(symbol),
);

export const fetchPLStatement = createAsyncThunk(
  'getQuote/fetchPL',
  async (symbol: string) => analyticsFinancialsRepository.getPLStatement(symbol),
);

export const fetchResults = createAsyncThunk(
  'getQuote/fetchResults',
  async (symbol: string) => analyticsFinancialsRepository.getResults(symbol),
);

export const fetchShareholding = createAsyncThunk(
  'getQuote/fetchShareholding',
  async (symbol: string) => analyticsFinancialsRepository.getShareholdingPattern(symbol),
);

export const fetchCompanyBio = createAsyncThunk(
  'getQuote/fetchCompanyBio',
  async (symbol: string) => analyticsFinancialsRepository.getCompanyBio(symbol),
);

export const fetchMFHoldings = createAsyncThunk(
  'getQuote/fetchMFHoldings',
  async (symbol: string) => analyticsFinancialsRepository.getMFHoldings(symbol),
);

export const fetchOptionsChain = createAsyncThunk(
  'getQuote/fetchOptions',
  async ({ symbol, expiry }: { symbol: string; expiry?: string }) => {
    return fnoRepository.getOptionsChain(symbol, expiry);
  },
);

export const fetchFutures = createAsyncThunk(
  'getQuote/fetchFutures',
  async (symbol: string) => fnoRepository.getFutures(symbol),
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const getQuoteSlice = createSlice({
  name: 'getQuote',
  initialState,
  reducers: {
    // Maps to Flutter: StreamingDataUpdateEvent
    updateStreaming(state, action: PayloadAction<Partial<GqStreamingModel>>) {
      state.streaming = { ...state.streaming, ...action.payload };
    },
    // Maps to Flutter: ChangeChartIntervalEvent
    setChartInterval(state, action: PayloadAction<ChartInterval>) {
      state.selectedChartInterval = action.payload;
    },
    // Maps to Flutter: ChangeChartTypeEvent
    setChartType(state, action: PayloadAction<ChartType>) {
      state.selectedChartType = action.payload;
    },
    // Maps to Flutter: TabSwitchEvent
    setActiveTab(state, action: PayloadAction<number>) {
      state.activeTabIndex = action.payload;
    },
    // Toggle whether tabs fetch data from API (vs hardcoded fallback)
    setTabsApiEnabled(state, action: PayloadAction<boolean>) {
      state.tabsApiEnabled = action.payload;
    },
    setSelectedExchange(state, action: PayloadAction<Exchange>) {
      state.selectedExchange = action.payload;
    },
    setSelectedExpiry(state, action: PayloadAction<string>) {
      state.selectedExpiry = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize Quote
    builder
      .addCase(initializeQuote.pending, (state) => { state.quoteLoading = true; state.error = null; })
      .addCase(initializeQuote.fulfilled, (state, { payload }) => {
        state.quoteLoading = false;
        state.streaming = payload.streaming;
        state.company = payload.company;
        state.bidAsk = payload.bidAsk;
      })
      .addCase(initializeQuote.rejected, (state, action) => {
        state.quoteLoading = false;
        state.error = action.error.message ?? 'Failed to load quote';
        // Keep hardcoded bootstrap data
      });

    // Chart
    builder
      .addCase(fetchChartData.pending, (state) => { state.chartLoading = true; })
      .addCase(fetchChartData.fulfilled, (state, { payload }) => { state.chartLoading = false; state.chartData = payload; })
      .addCase(fetchChartData.rejected, (state) => { state.chartLoading = false; });

    // Resistance/Support
    builder.addCase(fetchResistanceSupport.fulfilled, (state, { payload }) => { state.resistanceSupport = payload; });
    builder.addCase(fetchKeyStats.fulfilled, (state, { payload }) => { state.keyStats = payload; });
    builder.addCase(fetchExpertTips.fulfilled, (state, { payload }) => { state.expertTips = payload; });

    // News
    builder
      .addCase(fetchNews.pending, (state) => { state.newsLoading = true; })
      .addCase(fetchNews.fulfilled, (state, { payload }) => { state.newsLoading = false; state.news = payload; })
      .addCase(fetchNews.rejected, (state) => { state.newsLoading = false; });

    builder
      .addCase(fetchEvents.pending, (state) => { state.eventsLoading = true; })
      .addCase(fetchEvents.fulfilled, (state, { payload }) => { state.eventsLoading = false; state.events = payload; })
      .addCase(fetchEvents.rejected, (state) => { state.eventsLoading = false; });

    builder
      .addCase(fetchBulkBlockDeals.pending, (state) => { state.bulkBlockLoading = true; })
      .addCase(fetchBulkBlockDeals.fulfilled, (state, { payload }) => { state.bulkBlockLoading = false; state.bulkBlockDeals = payload; })
      .addCase(fetchBulkBlockDeals.rejected, (state) => { state.bulkBlockLoading = false; });

    // Analytics
    builder
      .addCase(fetchAnalyticsRatios.pending, (state) => { state.analyticsLoading = true; })
      .addCase(fetchAnalyticsRatios.fulfilled, (state, { payload }) => { state.analyticsLoading = false; state.analyticsRatio = payload; })
      .addCase(fetchAnalyticsRatios.rejected, (state) => { state.analyticsLoading = false; });

    builder.addCase(fetchPeers.fulfilled, (state, { payload }) => { state.peers = payload; });
    builder.addCase(fetchTrendAnalytics.fulfilled, (state, { payload }) => { state.trendAnalytics = payload; });

    // Financials
    builder
      .addCase(fetchBalanceSheet.pending, (state) => { state.financialsLoading = true; })
      .addCase(fetchBalanceSheet.fulfilled, (state, { payload }) => { state.financialsLoading = false; state.balanceSheet = payload; })
      .addCase(fetchBalanceSheet.rejected, (state) => { state.financialsLoading = false; });

    builder.addCase(fetchPLStatement.fulfilled, (state, { payload }) => { state.plStatement = payload; });
    builder.addCase(fetchResults.fulfilled, (state, { payload }) => { state.results = payload; });
    builder.addCase(fetchShareholding.fulfilled, (state, { payload }) => { state.shareholding = payload; });

    // Company Bio
    builder
      .addCase(fetchCompanyBio.pending, (state) => { state.companyBioLoading = true; })
      .addCase(fetchCompanyBio.fulfilled, (state, { payload }) => { state.companyBioLoading = false; state.companyBio = payload; })
      .addCase(fetchCompanyBio.rejected, (state) => { state.companyBioLoading = false; });

    // MF Holdings
    builder
      .addCase(fetchMFHoldings.pending, (state) => { state.mfHoldingsLoading = true; })
      .addCase(fetchMFHoldings.fulfilled, (state, { payload }) => { state.mfHoldingsLoading = false; state.mfHoldings = payload; })
      .addCase(fetchMFHoldings.rejected, (state) => { state.mfHoldingsLoading = false; });

    // F&O
    builder
      .addCase(fetchOptionsChain.pending, (state) => { state.fnoLoading = true; })
      .addCase(fetchOptionsChain.fulfilled, (state, { payload }) => {
        state.fnoLoading = false;
        state.optionsChain = payload.chain;
        state.optionExpiries = payload.expiries;
        if (!state.selectedExpiry && payload.expiries.length > 0) {
          state.selectedExpiry = payload.expiries[0].date;
        }
      })
      .addCase(fetchOptionsChain.rejected, (state) => { state.fnoLoading = false; });

    builder.addCase(fetchFutures.fulfilled, (state, { payload }) => { state.futures = payload; });
  },
});

export const {
  updateStreaming,
  setChartInterval,
  setChartType,
  setActiveTab,
  setTabsApiEnabled,
  setSelectedExchange,
  setSelectedExpiry,
  clearError,
} = getQuoteSlice.actions;

export default getQuoteSlice.reducer;
