// Typed hooks for Redux store
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Selectors
export const selectQuoteState = (state: RootState) => state.getQuote;
export const selectStreaming = (state: RootState) => state.getQuote.streaming;
export const selectCompany = (state: RootState) => state.getQuote.company;
export const selectBidAsk = (state: RootState) => state.getQuote.bidAsk;
export const selectChartData = (state: RootState) => state.getQuote.chartData;
export const selectActiveTab = (state: RootState) => state.getQuote.activeTabIndex;
export const selectSelectedExchange = (state: RootState) => state.getQuote.selectedExchange;
export const selectChartInterval = (state: RootState) => state.getQuote.selectedChartInterval;
export const selectChartType = (state: RootState) => state.getQuote.selectedChartType;
export const selectTabsApiEnabled = (state: RootState) => state.getQuote.tabsApiEnabled;
export const selectNews = (state: RootState) => state.getQuote.news;
export const selectEvents = (state: RootState) => state.getQuote.events;
export const selectBulkBlock = (state: RootState) => state.getQuote.bulkBlockDeals;
export const selectAnalyticsRatio = (state: RootState) => state.getQuote.analyticsRatio;
export const selectPeers = (state: RootState) => state.getQuote.peers;
export const selectTrendAnalytics = (state: RootState) => state.getQuote.trendAnalytics;
export const selectBalanceSheet = (state: RootState) => state.getQuote.balanceSheet;
export const selectPLStatement = (state: RootState) => state.getQuote.plStatement;
export const selectResults = (state: RootState) => state.getQuote.results;
export const selectShareholding = (state: RootState) => state.getQuote.shareholding;
export const selectCompanyBio = (state: RootState) => state.getQuote.companyBio;
export const selectMFHoldings = (state: RootState) => state.getQuote.mfHoldings;
export const selectOptionsChain = (state: RootState) => state.getQuote.optionsChain;
export const selectFutures = (state: RootState) => state.getQuote.futures;
export const selectQuoteLoading = (state: RootState) => state.getQuote.quoteLoading;
export const selectError = (state: RootState) => state.getQuote.error;
