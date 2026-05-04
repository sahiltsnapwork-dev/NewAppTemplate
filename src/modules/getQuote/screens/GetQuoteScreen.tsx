// ─── GetQuote Details Screen ─────────────────────────────────────────────────
// Maps to Flutter: get_quote_details_screen.dart (8145 lines)
// Core screen with tab navigation — NSE (12 tabs) / BSE (10 tabs)
// Bootstrapped with Hardcoded_responce.json (HDFCBANK)

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Provider } from 'react-redux';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { store } from '../store/store';
import {
  useAppDispatch,
  useAppSelector,
  selectSelectedExchange,
  selectActiveTab,
  selectCompany,
  selectStreaming,
  selectBidAsk,
  selectChartData,
  selectNews,
  selectEvents,
  selectAnalyticsRatio,
  selectPeers,
  selectTrendAnalytics,
  selectBalanceSheet,
  selectPLStatement,
  selectResults,
  selectShareholding,
  selectCompanyBio,
  selectMFHoldings,
  selectOptionsChain,
  selectFutures,
  selectTabsApiEnabled,
} from '../store/hooks';
import {
  initializeQuote,
  fetchChartData,
  setSelectedExchange,
  setActiveTab,
  fetchNews,
  fetchEvents,
  fetchBulkBlockDeals,
  fetchAnalyticsRatios,
  fetchPeers,
  fetchTrendAnalytics,
  fetchBalanceSheet,
  fetchPLStatement,
  fetchResults,
  fetchShareholding,
  fetchCompanyBio,
  fetchMFHoldings,
  fetchOptionsChain,
  fetchFutures,
  fetchResistanceSupport,
  fetchKeyStats,
  fetchExpertTips,
} from '../store/getQuoteSlice';
import { NSE_TABS, BSE_TABS, Exchange } from '../constants/ApiConstants';
import { COLORS, SPACING } from '../constants/UIConstants';
import { QuoteHeader } from '../components/QuoteHeader';
import { BottomActionMenu } from '../components/BottomActionMenu';

// Tab screen imports
import { OverviewTab } from './tabs/OverviewTab';
import { SwotAnalysisTab } from './tabs/SwotAnalysisTab';
import { FutureTab } from './tabs/FutureTab';
import { OptionTab } from './tabs/OptionTab';
import { TechnicalAnalysisTab } from './tabs/TechnicalAnalysisTab';
import { ResearchCallsTab } from './tabs/ResearchCallsTab';
import { NewsTab } from './tabs/NewsTab';
import { EventsTab } from './tabs/EventsTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { FinancialsTab } from './tabs/FinancialsTab';
import { MFHoldingsTab } from './tabs/MFHoldingsTab';
import { CompanyBioTab } from './tabs/CompanyBioTab';

export interface GetQuoteScreenProps {
  symbol?: string;
  exchange?: Exchange;
  stockType?: string;
  initialTabName?: string;
}

// ── Inner Screen (inside Provider) ────────────────────────────────────────────
const GetQuoteScreenInner: React.FC<GetQuoteScreenProps> = ({
  symbol = 'HDFCBANK',
  exchange = 'NSE',
  stockType = 'EQ',
  initialTabName = 'Overview',
}) => {
  const dispatch = useAppDispatch();
  const selectedExchange = useAppSelector(selectSelectedExchange);
  const activeTabIndex = useAppSelector(selectActiveTab);

  // Selectors for logging API responses after tab switch
  const company = useAppSelector(selectCompany);
  const streaming = useAppSelector(selectStreaming);
  const bidAsk = useAppSelector(selectBidAsk);
  const chartData = useAppSelector(selectChartData);
  const news = useAppSelector(selectNews);
  const events = useAppSelector(selectEvents);
  const analyticsRatio = useAppSelector(selectAnalyticsRatio);
  const peers = useAppSelector(selectPeers);
  const trendAnalytics = useAppSelector(selectTrendAnalytics);
  const balanceSheet = useAppSelector(selectBalanceSheet);
  const plStatement = useAppSelector(selectPLStatement);
  const results = useAppSelector(selectResults);
  const shareholding = useAppSelector(selectShareholding);
  const companyBio = useAppSelector(selectCompanyBio);
  const mfHoldings = useAppSelector(selectMFHoldings);
  const optionsChain = useAppSelector(selectOptionsChain);
  const futures = useAppSelector(selectFutures);
  const tabsApiEnabled = useAppSelector(selectTabsApiEnabled);

  const tabTitles = selectedExchange === 'NSE' ? NSE_TABS : BSE_TABS;

  const routes = tabTitles.map((title, i) => ({ key: `tab_${i}`, title }));

  // Initial data load
  useEffect(() => {
    dispatch(setSelectedExchange(exchange));
    // Only perform network initialization when tabsApiEnabled is true
    if (!tabsApiEnabled) return;

    dispatch(initializeQuote({ symbol, exchange }));
    dispatch(fetchChartData({ symbol, interval: '1D' }));
    dispatch(fetchResistanceSupport(symbol));
    dispatch(fetchKeyStats(symbol));
    dispatch(fetchExpertTips(symbol));
    // Lazy-load other sections (when API is enabled)
    dispatch(fetchNews({ symbol }));
    dispatch(fetchEvents(symbol));
    dispatch(fetchBulkBlockDeals(symbol));
    dispatch(fetchAnalyticsRatios(symbol));
    dispatch(fetchPeers(symbol));
    dispatch(fetchTrendAnalytics(symbol));
    dispatch(fetchBalanceSheet(symbol));
    dispatch(fetchPLStatement(symbol));
    dispatch(fetchResults(symbol));
    dispatch(fetchShareholding(symbol));
    dispatch(fetchCompanyBio(symbol));
    dispatch(fetchMFHoldings(symbol));
    if (exchange === 'NSE') {
      dispatch(fetchOptionsChain({ symbol }));
      dispatch(fetchFutures(symbol));
    }
  }, [symbol, exchange, tabsApiEnabled, dispatch]);

  const handleExchangeChange = useCallback(
    (ex: Exchange) => {
      dispatch(setSelectedExchange(ex));
      dispatch(setActiveTab(0));
      if (tabsApiEnabled) {
        dispatch(initializeQuote({ symbol, exchange: ex }));
        if (ex === 'NSE') {
          dispatch(fetchOptionsChain({ symbol }));
          dispatch(fetchFutures(symbol));
        }
      }
    },
    [dispatch, symbol, tabsApiEnabled],
  );

  // Conditional per-tab API fetches when the feature flag is enabled
  useEffect(() => {
    if (!tabsApiEnabled) return;
    const title = tabTitles[activeTabIndex];
    if (!title) return;
    switch (title) {
      case 'Analytics':
        dispatch(fetchAnalyticsRatios(symbol));
        dispatch(fetchPeers(symbol));
        dispatch(fetchTrendAnalytics(symbol));
        break;
      case 'Financials':
        dispatch(fetchBalanceSheet(symbol));
        dispatch(fetchPLStatement(symbol));
        dispatch(fetchResults(symbol));
        dispatch(fetchShareholding(symbol));
        break;
      case 'News':
        dispatch(fetchNews({ symbol }));
        break;
      case 'Events':
        dispatch(fetchEvents(symbol));
        dispatch(fetchBulkBlockDeals(symbol));
        break;
      case 'MF Holdings':
        dispatch(fetchMFHoldings(symbol));
        break;
      case 'Company Bio':
        dispatch(fetchCompanyBio(symbol));
        break;
      case 'Option':
        if (selectedExchange === 'NSE') {
          dispatch(fetchOptionsChain({ symbol }));
        }
        break;
      case 'Future':
        if (selectedExchange === 'NSE') {
          dispatch(fetchFutures(symbol));
        }
        break;
      case 'Overview':
        dispatch(fetchChartData({ symbol, interval: '1D' }));
        dispatch(fetchResistanceSupport(symbol));
        dispatch(fetchKeyStats(symbol));
        dispatch(fetchExpertTips(symbol));
        break;
      default:
        break;
    }
  }, [activeTabIndex, tabTitles, tabsApiEnabled, dispatch, symbol, selectedExchange]);

  const renderScene = useCallback(
    ({ route }: { route: { key: string; title?: string } }) => {
      const title = route.title as typeof NSE_TABS[number];
      switch (title) {
        case 'Overview': return <OverviewTab symbol={symbol} />;
        case 'SWOT Analysis': return <SwotAnalysisTab symbol={symbol} />;
        case 'Future': return <FutureTab symbol={symbol} />;
        case 'Option': return <OptionTab symbol={symbol} />;
        case 'Technical Analysis': return <TechnicalAnalysisTab symbol={symbol} />;
        case 'Research Calls': return <ResearchCallsTab symbol={symbol} />;
        case 'News': return <NewsTab symbol={symbol} />;
        case 'Events': return <EventsTab symbol={symbol} />;
        case 'Analytics': return <AnalyticsTab symbol={symbol} />;
        case 'Financials': return <FinancialsTab symbol={symbol} />;
        case 'MF Holdings': return <MFHoldingsTab symbol={symbol} />;
        case 'Company Bio': return <CompanyBioTab symbol={symbol} />;
        default: return <OverviewTab symbol={symbol} />;
      }
    },
    [symbol],
  );

  const renderTabBar = useCallback(
    (props: Parameters<typeof TabBar>[0]) => (
      <TabBar
        {...props}
        scrollEnabled
        style={styles.tabBar}
        tabStyle={styles.tab}

        indicatorStyle={styles.tabIndicator}
        activeColor={COLORS.tabActive}
        inactiveColor={COLORS.tabInactive}
      />
    ),
    [],
  );

  // Log tab switches and current data snapshot
  useEffect(() => {
    const title = tabTitles[activeTabIndex] ?? 'Unknown';
    console.log(`[TabSwitch] Switched to tab: ${title} (index ${activeTabIndex})`);
  }, [activeTabIndex, tabTitles]);

  // When Analytics tab is active, log analytics-related API responses
  useEffect(() => {
    const analyticsIndex = (tabTitles as readonly string[]).indexOf('Analytics');
    if (activeTabIndex === analyticsIndex) {
      console.log('[API RESPONSE][Analytics] analyticsRatio ->', analyticsRatio);
      console.log('[API RESPONSE][Analytics] peers ->', peers);
      console.log('[API RESPONSE][Analytics] trendAnalytics ->', trendAnalytics);
    }
  }, [activeTabIndex, tabTitles, analyticsRatio, peers, trendAnalytics]);

  // News tab
  useEffect(() => {
    const newsIndex = (tabTitles as readonly string[]).indexOf('News');
    if (activeTabIndex === newsIndex) {
      console.log('[API RESPONSE][News] news ->', news);
    }
  }, [activeTabIndex, tabTitles, news]);

  // Events tab
  useEffect(() => {
    const eventsIndex = (tabTitles as readonly string[]).indexOf('Events');
    if (activeTabIndex === eventsIndex) {
      console.log('[API RESPONSE][Events] events ->', events);
    }
  }, [activeTabIndex, tabTitles, events]);

  // Financials tab
  useEffect(() => {
    const finIndex = (tabTitles as readonly string[]).indexOf('Financials');
    if (activeTabIndex === finIndex) {
      console.log('[API RESPONSE][Financials] balanceSheet ->', balanceSheet);
      console.log('[API RESPONSE][Financials] plStatement ->', plStatement);
      console.log('[API RESPONSE][Financials] results ->', results);
      console.log('[API RESPONSE][Financials] shareholding ->', shareholding);
    }
  }, [activeTabIndex, tabTitles, balanceSheet, plStatement, results, shareholding]);

  // MF Holdings
  useEffect(() => {
    const mfIndex = (tabTitles as readonly string[]).indexOf('MF Holdings');
    if (activeTabIndex === mfIndex) {
      console.log('[API RESPONSE][MF Holdings] mfHoldings ->', mfHoldings);
    }
  }, [activeTabIndex, tabTitles, mfHoldings]);

  // Company Bio
  useEffect(() => {
    const bioIndex = (tabTitles as readonly string[]).indexOf('Company Bio');
    if (activeTabIndex === bioIndex) {
      console.log('[API RESPONSE][Company Bio] companyBio ->', companyBio);
    }
  }, [activeTabIndex, tabTitles, companyBio]);

  // Options & Futures
  useEffect(() => {
    const optIndex = (tabTitles as readonly string[]).indexOf('Option');
    const futIndex = (tabTitles as readonly string[]).indexOf('Future');
    if (activeTabIndex === optIndex) {
      console.log('[API RESPONSE][Option] optionsChain ->', optionsChain);
    }
    if (activeTabIndex === futIndex) {
      console.log('[API RESPONSE][Future] futures ->', futures);
    }
  }, [activeTabIndex, tabTitles, optionsChain, futures]);

  // Overview
  useEffect(() => {
    const ovIndex = (tabTitles as readonly string[]).indexOf('Overview');
    if (activeTabIndex === ovIndex) {
      console.log('[API RESPONSE][Overview] company ->', company);
      console.log('[API RESPONSE][Overview] streaming ->', streaming);
      console.log('[API RESPONSE][Overview] bidAsk ->', bidAsk);
      console.log('[API RESPONSE][Overview] chartData ->', chartData);
    }
  }, [activeTabIndex, tabTitles, company, streaming, bidAsk, chartData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Quote Header */}
      <QuoteHeader
        selectedExchange={selectedExchange}
        onExchangeChange={handleExchangeChange}
      />

      {/* Tab Navigator */}
      <View style={styles.tabContainer}>
        <TabView
          navigationState={{ index: activeTabIndex, routes }}
          renderScene={renderScene}
          renderTabBar={renderTabBar}
          onIndexChange={(index) => dispatch(setActiveTab(index))}
          lazy
        />
      </View>

      {/* Bottom Action Menu */}
      <BottomActionMenu />
    </SafeAreaView>
  );
};

// ── Provider Wrapper ───────────────────────────────────────────────────────────
export const GetQuoteScreen: React.FC<GetQuoteScreenProps> = (props) => (
  <Provider store={store}>
    <GetQuoteScreenInner {...props} />
  </Provider>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    elevation: 0,
    shadowOpacity: 0,
  },
  tab: {
    width: 'auto',
    paddingHorizontal: SPACING.md,
    minWidth: 80,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'none',
  },
  tabIndicator: {
    backgroundColor: COLORS.tabIndicator,
    height: 2,
  },
});
