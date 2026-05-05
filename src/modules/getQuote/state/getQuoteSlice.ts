// Redux Slice: getQuoteSlice
// Maps Flutter GetQuoteDetailsBloc states to Redux slice state
// BLoC states → Redux state fields; BLoC events → createAsyncThunk

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { QuoteEntity } from '../domain/entities/QuoteEntity';
import type { BarChartEntity } from '../domain/entities/BarChartEntity';
import type { NewsEntity } from '../domain/entities/NewsEntity';
import type { BulkBlockEntity } from '../domain/entities/BulkBlockEntity';
import type { EventEntity } from '../domain/entities/EventEntity';
import type { ExpertTipEntity } from '../domain/entities/ExpertTipEntity';
import type { ResistanceSupportEntity } from '../domain/entities/ResistanceSupportEntity';
import type { KeyStatsEntity } from '../domain/entities/KeyStatsEntity';
import type { FnoEntity } from '../domain/entities/FnoEntity';
import type { CompanyBioEntity } from '../domain/entities/CompanyBioEntity';
import {
  fetchQuoteData,
  fetchPerformanceData,
  fetchNews,
  fetchBulkBlock,
  fetchAnnouncements,
  fetchEvents,
  fetchExpertTips,
  fetchResistanceSupport,
  fetchKeyStats,
  fetchFnoData,
  fetchCompanyBio,
} from './getQuoteThunks';

export type Exchange = 'NSE' | 'BSE';
export type ChartType = 'M' | 'C' | 'L';   // Mountain, Candle, Line
export type ChartInterval = '1D' | '1W' | '5D' | '1M' | '3M' | '6M' | '1Y' | 'All';

export interface GetQuoteState {
  // Quote data (matches Hardcoded_response.json shape)
  quoteData: QuoteEntity | null;
  performanceData: BarChartEntity[];
  news: NewsEntity[];
  announcements: NewsEntity[];
  bulkBlock: BulkBlockEntity[];
  events: EventEntity[];
  expertTips: ExpertTipEntity[];
  resistanceSupport: ResistanceSupportEntity[];
  keyStats: KeyStatsEntity[];
  fnoData: FnoEntity[];
  companyBio: CompanyBioEntity | null;

  // UI state (mirrors Flutter BLoC control variables)
  selectedExchange: Exchange;
  selectedChartType: ChartType;
  selectedChartInterval: ChartInterval;
  isMiniQuote: boolean;

  // Loading states per data domain
  isLoadingQuote: boolean;
  isLoadingPerformance: boolean;
  isLoadingNews: boolean;
  isLoadingBulkBlock: boolean;
  isLoadingAnnouncements: boolean;
  isLoadingEvents: boolean;
  isLoadingExpertTips: boolean;
  isLoadingResistanceSupport: boolean;
  isLoadingKeyStats: boolean;
  isLoadingFno: boolean;
  isLoadingCompanyBio: boolean;

  // Error states
  errorQuote: string | null;
  errorNews: string | null;
  errorEvents: string | null;
  errorBulkBlock: string | null;
  errorAnnouncements: string | null;
  errorFno: string | null;
}

const initialState: GetQuoteState = {
  quoteData: null,
  performanceData: [],
  news: [],
  announcements: [],
  bulkBlock: [],
  events: [],
  expertTips: [],
  resistanceSupport: [],
  keyStats: [],
  fnoData: [],
  companyBio: null,

  selectedExchange: 'NSE',
  selectedChartType: 'M',
  selectedChartInterval: '1D',
  isMiniQuote: true,

  isLoadingQuote: false,
  isLoadingPerformance: false,
  isLoadingNews: false,
  isLoadingBulkBlock: false,
  isLoadingAnnouncements: false,
  isLoadingEvents: false,
  isLoadingExpertTips: false,
  isLoadingResistanceSupport: false,
  isLoadingKeyStats: false,
  isLoadingFno: false,
  isLoadingCompanyBio: false,

  errorQuote: null,
  errorNews: null,
  errorEvents: null,
  errorBulkBlock: null,
  errorAnnouncements: null,
  errorFno: null,
};

const getQuoteSlice = createSlice({
  name: 'getQuote',
  initialState,
  reducers: {
    setSelectedExchange(state, action: PayloadAction<Exchange>) {
      state.selectedExchange = action.payload;
    },
    setSelectedChartType(state, action: PayloadAction<ChartType>) {
      state.selectedChartType = action.payload;
    },
    setSelectedChartInterval(state, action: PayloadAction<ChartInterval>) {
      state.selectedChartInterval = action.payload;
    },
    setIsMiniQuote(state, action: PayloadAction<boolean>) {
      state.isMiniQuote = action.payload;
    },
    resetQuoteState() {
      return initialState;
    },
  },
  extraReducers: builder => {
    // fetchQuoteData
    builder
      .addCase(fetchQuoteData.pending, state => {
        state.isLoadingQuote = true;
        state.errorQuote = null;
      })
      .addCase(fetchQuoteData.fulfilled, (state, action) => {
        state.isLoadingQuote = false;
        state.quoteData = action.payload;
      })
      .addCase(fetchQuoteData.rejected, (state, action) => {
        state.isLoadingQuote = false;
        state.errorQuote = action.error.message ?? 'Failed to load quote data';
      });

    // fetchPerformanceData
    builder
      .addCase(fetchPerformanceData.pending, state => {
        state.isLoadingPerformance = true;
      })
      .addCase(fetchPerformanceData.fulfilled, (state, action) => {
        state.isLoadingPerformance = false;
        state.performanceData = action.payload;
      })
      .addCase(fetchPerformanceData.rejected, state => {
        state.isLoadingPerformance = false;
        state.performanceData = [];
      });

    // fetchNews
    builder
      .addCase(fetchNews.pending, state => {
        state.isLoadingNews = true;
        state.errorNews = null;
      })
      .addCase(fetchNews.fulfilled, (state, action) => {
        state.isLoadingNews = false;
        state.news = action.payload;
      })
      .addCase(fetchNews.rejected, (state, action) => {
        state.isLoadingNews = false;
        state.errorNews = action.error.message ?? 'Failed to load news';
      });

    // fetchBulkBlock
    builder
      .addCase(fetchBulkBlock.pending, state => {
        state.isLoadingBulkBlock = true;
        state.errorBulkBlock = null;
      })
      .addCase(fetchBulkBlock.fulfilled, (state, action) => {
        state.isLoadingBulkBlock = false;
        state.bulkBlock = action.payload;
      })
      .addCase(fetchBulkBlock.rejected, (state, action) => {
        state.isLoadingBulkBlock = false;
        state.errorBulkBlock = action.error.message ?? 'Failed to load bulk/block data';
      });

    // fetchAnnouncements
    builder
      .addCase(fetchAnnouncements.pending, state => {
        state.isLoadingAnnouncements = true;
        state.errorAnnouncements = null;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.isLoadingAnnouncements = false;
        state.announcements = action.payload;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.isLoadingAnnouncements = false;
        state.errorAnnouncements = action.error.message ?? 'Failed to load announcements';
      });

    // fetchEvents
    builder
      .addCase(fetchEvents.pending, state => {
        state.isLoadingEvents = true;
        state.errorEvents = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoadingEvents = false;
        state.events = action.payload;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoadingEvents = false;
        state.errorEvents = action.error.message ?? 'Failed to load events';
      });

    // fetchExpertTips
    builder
      .addCase(fetchExpertTips.pending, state => {
        state.isLoadingExpertTips = true;
      })
      .addCase(fetchExpertTips.fulfilled, (state, action) => {
        state.isLoadingExpertTips = false;
        state.expertTips = action.payload;
      })
      .addCase(fetchExpertTips.rejected, state => {
        state.isLoadingExpertTips = false;
        state.expertTips = null;
      });

    // fetchResistanceSupport
    builder
      .addCase(fetchResistanceSupport.pending, state => {
        state.isLoadingResistanceSupport = true;
      })
      .addCase(fetchResistanceSupport.fulfilled, (state, action) => {
        state.isLoadingResistanceSupport = false;
        state.resistanceSupport = action.payload;
      })
      .addCase(fetchResistanceSupport.rejected, state => {
        state.isLoadingResistanceSupport = false;
        state.resistanceSupport = [];
      });

    // fetchKeyStats
    builder
      .addCase(fetchKeyStats.pending, state => {
        state.isLoadingKeyStats = true;
      })
      .addCase(fetchKeyStats.fulfilled, (state, action) => {
        state.isLoadingKeyStats = false;
        state.keyStats = action.payload;
      })
      .addCase(fetchKeyStats.rejected, state => {
        state.isLoadingKeyStats = false;
        state.keyStats = [];
      });

    // fetchFnoData
    builder
      .addCase(fetchFnoData.pending, state => {
        state.isLoadingFno = true;
        state.errorFno = null;
      })
      .addCase(fetchFnoData.fulfilled, (state, action) => {
        state.isLoadingFno = false;
        state.fnoData = action.payload;
      })
      .addCase(fetchFnoData.rejected, (state, action) => {
        state.isLoadingFno = false;
        state.errorFno = action.error.message ?? 'Failed to load F&O data';
      });

    // fetchCompanyBio
    builder
      .addCase(fetchCompanyBio.pending, state => {
        state.isLoadingCompanyBio = true;
      })
      .addCase(fetchCompanyBio.fulfilled, (state, action) => {
        state.isLoadingCompanyBio = false;
        state.companyBio = action.payload;
      })
      .addCase(fetchCompanyBio.rejected, state => {
        state.isLoadingCompanyBio = false;
        state.companyBio = null;
      });
  },
});

export const {
  setSelectedExchange,
  setSelectedChartType,
  setSelectedChartInterval,
  setIsMiniQuote,
  resetQuoteState,
} = getQuoteSlice.actions;

export default getQuoteSlice.reducer;
