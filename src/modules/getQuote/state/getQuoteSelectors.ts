// Redux Selectors: getQuoteSelectors
// Typed selectors for all GetQuote state fields

import type { GetQuoteState } from './getQuoteSlice';

// Root state interface — extend with your app's actual RootState
interface RootState {
  getQuote: GetQuoteState;
}

export const selectQuoteData = (state: RootState) => state.getQuote.quoteData;
export const selectPerformanceData = (state: RootState) => state.getQuote.performanceData;
export const selectNews = (state: RootState) => state.getQuote.news;
export const selectAnnouncements = (state: RootState) => state.getQuote.announcements;
export const selectBulkBlock = (state: RootState) => state.getQuote.bulkBlock;
export const selectEvents = (state: RootState) => state.getQuote.events;
export const selectExpertTips = (state: RootState) => state.getQuote.expertTips;
export const selectResistanceSupport = (state: RootState) => state.getQuote.resistanceSupport;
export const selectKeyStats = (state: RootState) => state.getQuote.keyStats;
export const selectFnoData = (state: RootState) => state.getQuote.fnoData;
export const selectCompanyBio = (state: RootState) => state.getQuote.companyBio;

// UI state selectors
export const selectSelectedExchange = (state: RootState) => state.getQuote.selectedExchange;
export const selectSelectedChartType = (state: RootState) => state.getQuote.selectedChartType;
export const selectSelectedChartInterval = (state: RootState) => state.getQuote.selectedChartInterval;
export const selectIsMiniQuote = (state: RootState) => state.getQuote.isMiniQuote;

// Loading selectors
export const selectIsLoadingQuote = (state: RootState) => state.getQuote.isLoadingQuote;
export const selectIsLoadingPerformance = (state: RootState) => state.getQuote.isLoadingPerformance;
export const selectIsLoadingNews = (state: RootState) => state.getQuote.isLoadingNews;
export const selectIsLoadingBulkBlock = (state: RootState) => state.getQuote.isLoadingBulkBlock;
export const selectIsLoadingAnnouncements = (state: RootState) => state.getQuote.isLoadingAnnouncements;
export const selectIsLoadingEvents = (state: RootState) => state.getQuote.isLoadingEvents;
export const selectIsLoadingExpertTips = (state: RootState) => state.getQuote.isLoadingExpertTips;
export const selectIsLoadingFno = (state: RootState) => state.getQuote.isLoadingFno;
export const selectIsLoadingCompanyBio = (state: RootState) => state.getQuote.isLoadingCompanyBio;

// Error selectors
export const selectErrorQuote = (state: RootState) => state.getQuote.errorQuote;
export const selectErrorNews = (state: RootState) => state.getQuote.errorNews;
export const selectErrorEvents = (state: RootState) => state.getQuote.errorEvents;
export const selectErrorBulkBlock = (state: RootState) => state.getQuote.errorBulkBlock;
export const selectErrorAnnouncements = (state: RootState) => state.getQuote.errorAnnouncements;
export const selectErrorFno = (state: RootState) => state.getQuote.errorFno;
