// GetQuoteDetailsScreen — main screen container
// Converted from Flutter GetQuoteDetailsPage + GetQuoteDetailsScreen
// DraggableScrollableSheet → ScrollView with fullscreen height
// TabController → useState selectedTab
// BlocBuilder → useSelector + useDispatch

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { colors, fonts, spacing, typography } from '../components/styles/tokens';
import {
  selectQuoteData,
  selectIsLoadingQuote,
  selectErrorQuote,
  selectSelectedExchange,
  selectSelectedChartType,
  selectSelectedChartInterval,
  selectPerformanceData,
  selectIsLoadingPerformance,
  selectNews,
  selectAnnouncements,
  selectBulkBlock,
  selectEvents,
  selectExpertTips,
  selectResistanceSupport,
  selectKeyStats,
  selectFnoData,
  selectCompanyBio,
  selectIsLoadingNews,
  selectIsLoadingEvents,
} from '../../state/getQuoteSelectors';
import {
  setSelectedExchange,
  setSelectedChartType,
  setSelectedChartInterval,
  setIsMiniQuote,
  resetQuoteState,
  type Exchange,
  type ChartInterval,
} from '../../state/getQuoteSlice';
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
} from '../../state/getQuoteThunks';
import { MarketDepth } from '../components/MarketDepth';
import { PerformanceTile } from '../components/PerformanceTile';
import { QuoteTabBar } from '../components/QuoteTabBar';
import { BottomMenu } from '../components/BottomMenu';
import { OverviewTab } from '../components/tabs/OverviewTab';
import { SwotAnalysisTab } from '../components/tabs/SwotAnalysisTab';
import { TechnicalAnalysisTab } from '../components/tabs/TechnicalAnalysisTab';
import { NewsTab } from '../components/tabs/NewsTab';
import { EventsTab } from '../components/tabs/EventsTab';
import { AnalyticsTab } from '../components/tabs/AnalyticsTab';
import { FinancialsTab } from '../components/tabs/FinancialsTab';
import { CompanyBioTab } from '../components/tabs/CompanyBioTab';
import { MFHoldingsTab } from '../components/tabs/MFHoldingsTab';

export interface GetQuoteDetailsParams {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  stockType?: string;
  isMinQuote?: boolean;
  selectedTabName?: string;
  cmotId?: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tabs rendered as WebViews (must NOT be inside ScrollView — needs bounded height)
const WEBVIEW_TABS = new Set(['SWOT', 'Technical']);

// Tab definitions: NSE has 12 tabs, BSE has 10 tabs (no Futures/Options)
const NSE_TABS = [
  'Overview', 'SWOT', 'Futures', 'Options', 'Technical',
  'Research', 'News', 'Events', 'Analytics', 'Financials',
  'MF Holdings', 'Company',
] as const;

const BSE_TABS = [
  'Overview', 'SWOT', 'Technical', 'Research', 'News',
  'Events', 'Analytics', 'Financials', 'MF Holdings', 'Company',
] as const;

interface Props {
  route?: { params?: GetQuoteDetailsParams };
  navigation?: { goBack: () => void };
  // Direct props (when used as embedded component)
  symbol?: string;
  exchange?: 'NSE' | 'BSE';
  stockType?: string;
  isMinQuote?: boolean;
  selectedTabName?: string;
  cmotId?: number;
}

export function GetQuoteDetailsScreen({ route, navigation, ...directProps }: Props) {
  const params: GetQuoteDetailsParams = {
    symbol:          route?.params?.symbol ?? directProps.symbol ?? '',
    exchange:        route?.params?.exchange ?? directProps.exchange ?? 'NSE',
    stockType:       route?.params?.stockType ?? directProps.stockType,
    isMinQuote:      route?.params?.isMinQuote ?? directProps.isMinQuote ?? false,
    selectedTabName: route?.params?.selectedTabName ?? directProps.selectedTabName ?? '',
    cmotId:          route?.params?.cmotId ?? directProps.cmotId,
  };

  const dispatch = useDispatch<React.Dispatch<any>>();

  // Selectors
  const quoteData = useSelector(selectQuoteData);
  const isLoadingQuote = useSelector(selectIsLoadingQuote);
  const errorQuote = useSelector(selectErrorQuote);
  const selectedExchange = useSelector(selectSelectedExchange);
  const selectedChartType = useSelector(selectSelectedChartType);
  const selectedChartInterval = useSelector(selectSelectedChartInterval);
  const performanceData = useSelector(selectPerformanceData);
  const isLoadingPerformance = useSelector(selectIsLoadingPerformance);
  const news = useSelector(selectNews);
  const announcements = useSelector(selectAnnouncements);
  const bulkBlock = useSelector(selectBulkBlock);
  const events = useSelector(selectEvents);
  const expertTips = useSelector(selectExpertTips);
  const resistanceSupport = useSelector(selectResistanceSupport);
  const keyStats = useSelector(selectKeyStats);
  const fnoData = useSelector(selectFnoData);
  const companyBio = useSelector(selectCompanyBio);
  const isLoadingNews = useSelector(selectIsLoadingNews);
  const isLoadingEvents = useSelector(selectIsLoadingEvents);

  // Tab state
  const tabs = selectedExchange === 'NSE' ? NSE_TABS : BSE_TABS;
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [showBottomMenu, setShowBottomMenu] = useState(false);

  const handleTabChange = useCallback(
    (index: number) => {
      const prevTab = tabs[selectedTabIndex];
      const nextTab = tabs[index];
      console.log(`[TabSwitch] ${prevTab} → ${nextTab} (index ${selectedTabIndex} → ${index})`);
      setSelectedTabIndex(index);
    },
    [tabs, selectedTabIndex],
  );

  const cmotIdStr = params.cmotId?.toString() ?? quoteData?.cmotid?.toString() ?? '';

  // Initialize: set exchange, fetch quote + symbol-based data
  useEffect(() => {
    if (params.exchange && params.exchange !== selectedExchange) {
      dispatch(setSelectedExchange(params.exchange));
    }
    if (params.symbol) {
      void (dispatch as React.Dispatch<any>)(fetchQuoteData({
        symbol: params.symbol,
        exchange: params.exchange,
      }));
      void (dispatch as React.Dispatch<any>)(fetchExpertTips({ symbol: params.symbol }));
      void (dispatch as React.Dispatch<any>)(fetchKeyStats({
        symbol: params.symbol,
        exchange: params.exchange,
      }));
    }
    // Jump to selectedTabName if provided
    if (params.selectedTabName) {
      const idx = (tabs as readonly string[]).findIndex(
        t => t.toLowerCase() === params.selectedTabName?.toLowerCase(),
      );
      if (idx >= 0) setSelectedTabIndex(idx);
    }
    return () => {
      dispatch(resetQuoteState());
    };
  }, [params.symbol, params.exchange]);

  // Fetch coCode-based data once cmotIdStr is available (from route param or resolved quoteData)
  useEffect(() => {
    if (!cmotIdStr) return;
    void (dispatch as React.Dispatch<any>)(fetchPerformanceData({
      coCode: cmotIdStr,
      exchange: selectedExchange,
      interval: selectedChartInterval,
    }));
    void (dispatch as React.Dispatch<any>)(fetchResistanceSupport({
      coCode: cmotIdStr,
      exchange: selectedExchange,
    }));
    void (dispatch as React.Dispatch<any>)(fetchCompanyBio({ coCode: cmotIdStr }));
  }, [cmotIdStr]);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    const tabName = tabs[selectedTabIndex];
    if (!cmotIdStr) return;
    if (tabName === 'News') {
      void (dispatch as React.Dispatch<any>)(fetchNews({ cmotId: cmotIdStr }));
      void (dispatch as React.Dispatch<any>)(fetchAnnouncements({
        cmotId: cmotIdStr,
        exchange: selectedExchange,
      }));
      void (dispatch as React.Dispatch<any>)(fetchBulkBlock({
        cmotId: cmotIdStr,
        exchange: selectedExchange,
        perPage: '10',
      }));
    } else if (tabName === 'Events') {
      void (dispatch as React.Dispatch<any>)(fetchEvents({ cmotId: cmotIdStr }));
    } else if (tabName === 'Futures' || tabName === 'Options') {
      if (params.symbol) {
        void (dispatch as React.Dispatch<any>)(fetchFnoData({
          symbol: params.symbol,
          exchange: selectedExchange,
        }));
      }
    }
  }, [selectedTabIndex, cmotIdStr, selectedExchange]);

  const handleExchangeChange = useCallback(
    (exchange: Exchange) => {
      dispatch(setSelectedExchange(exchange));
      if (params.symbol) {
        void (dispatch as React.Dispatch<any>)(fetchQuoteData({
          symbol: params.symbol,
          exchange,
        }));
      }
      if (cmotIdStr) {
        void (dispatch as React.Dispatch<any>)(fetchPerformanceData({
          coCode: cmotIdStr,
          exchange,
          interval: selectedChartInterval,
        }));
      }
    },
    [params.symbol, cmotIdStr, selectedChartInterval],
  );

  const handleIntervalChange = useCallback(
    (interval: ChartInterval) => {
      dispatch(setSelectedChartInterval(interval));
      if (cmotIdStr) {
        void (dispatch as React.Dispatch<any>)(fetchPerformanceData({
          coCode: cmotIdStr,
          exchange: selectedExchange,
          interval,
        }));
      }
    },
    [cmotIdStr, selectedExchange],
  );

  const ltp = quoteData?.ltp ?? 0;
  const changeValue = quoteData?.changevalue ?? 0;
  const percentChange = quoteData?.percentchange ?? 0;
  const isPositive = (quoteData?.isPositiveChange ?? 'NO') === 'YES';
  const changeColor = isPositive ? colors.positive : colors.negative;
  const indicator = quoteData?.netchangeindicator ?? '';

  function renderTabContent() {
    const tabName = tabs[selectedTabIndex];
    console.log(`[renderTabContent] Rendering tab="${tabName}" index=${selectedTabIndex} cmotId="${cmotIdStr}" symbol="${params.symbol}"`);
    switch (tabName) {
      case 'Overview':
        return (
          <OverviewTab
            quoteData={quoteData}
            performanceData={performanceData}
            isLoadingPerformance={isLoadingPerformance}
            expertTips={expertTips}
            resistanceSupport={resistanceSupport}
            keyStats={keyStats}
            selectedChartType={selectedChartType}
            selectedChartInterval={selectedChartInterval}
            onChartTypeChange={type => dispatch(setSelectedChartType(type))}
            onChartIntervalChange={handleIntervalChange}
          />
        );
      case 'SWOT':
        return <SwotAnalysisTab symbol={params.symbol} exchange={selectedExchange} />;
      case 'Technical':
        return (
          <TechnicalAnalysisTab
            symbol={params.symbol}
            exchange={selectedExchange}
            resistanceSupport={resistanceSupport}
          />
        );
      case 'News':
        return (
          <NewsTab
            news={news}
            announcements={announcements}
            bulkBlock={bulkBlock}
            isLoading={isLoadingNews}
          />
        );
      case 'Events':
        return (
          <EventsTab
            events={events}
            isLoading={isLoadingEvents}
          />
        );
      case 'Analytics':
        return (
          <AnalyticsTab
            symbol={params.symbol}
            exchange={selectedExchange}
            keyStats={keyStats}
            resistanceSupport={resistanceSupport}
          />
        );
      case 'Financials':
        return (
          <FinancialsTab
            symbol={params.symbol}
            exchange={selectedExchange}
          />
        );
      case 'Company':
        return <CompanyBioTab companyBio={companyBio} quoteData={quoteData} />;
      case 'MF Holdings':
        return <MFHoldingsTab symbol={params.symbol} exchange={selectedExchange} />;
      case 'Futures':
      case 'Options':
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderText}>
              {tabName} data coming soon
            </Text>
          </View>
        );
      default:
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderText}>Tab content loading...</Text>
          </View>
        );
    }
  }

  if (isLoadingQuote && !quoteData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.positive} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (errorQuote && !quoteData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{errorQuote}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              if (params.symbol) {
                void (dispatch as React.Dispatch<any>)(fetchQuoteData({
                  symbol: params.symbol,
                  exchange: params.exchange,
                }));
              }
            }}
            accessibilityLabel="Retry loading quote data"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={colors.surface} barStyle="dark-content" />

      {/* Header: Back + Company Name + Three-dot menu */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.companyName} numberOfLines={1}>
            {quoteData?.name ?? params.symbol}
          </Text>
          <Text style={styles.symbolExchange}>
            {quoteData?.symbol ?? params.symbol} · {selectedExchange}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Options', 'Price alert, share, watchlist')}
          accessibilityLabel="More options"
          style={styles.menuButton}
        >
          <Text style={styles.menuDots}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Price Summary */}
      <View style={styles.priceSection}>
        <View style={styles.priceLeft}>
          <Text style={styles.ltpText}>₹{ltp.toFixed(2)}</Text>
          <View style={styles.changeRow}>
            <Text style={[styles.changeText, { color: changeColor }]}>
              {indicator}{Math.abs(changeValue).toFixed(2)}
            </Text>
            <Text style={[styles.percentText, { color: changeColor }]}>
              {'  '}({indicator}{Math.abs(percentChange).toFixed(2)}%)
            </Text>
          </View>
          <Text style={styles.timestampText}>{quoteData?.ltt ?? ''}</Text>
        </View>
        {/* Exchange Toggle: NSE / BSE */}
        <View style={styles.exchangeToggle}>
          {(['NSE', 'BSE'] as Exchange[]).map(ex => (
            <TouchableOpacity
              key={ex}
              onPress={() => handleExchangeChange(ex)}
              style={[
                styles.exchangeButton,
                selectedExchange === ex && styles.exchangeButtonActive,
              ]}
              accessibilityLabel={`Switch to ${ex}`}
            >
              <Text
                style={[
                  styles.exchangeButtonText,
                  selectedExchange === ex && styles.exchangeButtonTextActive,
                ]}
              >
                {ex}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Market Depth */}
      {quoteData && (
        <View style={styles.marketDepthContainer}>
          <MarketDepth quoteData={quoteData} />
        </View>
      )}

      {/* Tab Bar */}
      <QuoteTabBar
        tabs={[...tabs]}
        selectedIndex={selectedTabIndex}
        onTabChange={handleTabChange}
      />

      {/* Tab Content — WebView tabs need a View with flex:1, not ScrollView */}
      {WEBVIEW_TABS.has(tabs[selectedTabIndex]) ? (
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>
      ) : (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          {renderTabContent()}
        </ScrollView>
      )}

      {/* Bottom Menu: Buy / Sell / Watchlist / Alert */}
      <BottomMenu
        visible={showBottomMenu}
        onClose={() => setShowBottomMenu(false)}
        onBuy={() => Alert.alert('Trade', 'Buy feature not implemented')}
        onSell={() => Alert.alert('Trade', 'Sell feature not implemented')}
        onWatchlist={() => Alert.alert('Watchlist', 'Watchlist feature not implemented')}
        onAlert={() => Alert.alert('Alert', 'Price alert feature not implemented')}
      />

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.tradeButton, styles.buyButton]}
          onPress={() => Alert.alert('Trade', 'Buy feature not implemented')}
          accessibilityLabel="Buy stock"
        >
          <Text style={styles.tradeButtonText}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowBottomMenu(true)}
          accessibilityLabel="More options"
        >
          <Text style={styles.moreButtonText}>⋮</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tradeButton, styles.sellButton]}
          onPress={() => Alert.alert('Trade', 'Sell feature not implemented')}
          accessibilityLabel="Sell stock"
        >
          <Text style={styles.tradeButtonText}>Sell</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loader: {
    flex: 1,
    alignSelf: 'center',
    marginTop: SCREEN_HEIGHT / 3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  errorText: {
    color: colors.negative,
    fontSize: typography.body,
    fontFamily: fonts.regular,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: colors.positive,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 28,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },
  companyName: {
    fontSize: typography.bodyLarge,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  symbolExchange: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuDots: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  priceLeft: {
    flex: 1,
  },
  ltpText: {
    fontSize: typography.heading,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  changeText: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
  },
  percentText: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
  },
  timestampText: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exchangeToggle: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    overflow: 'hidden',
  },
  exchangeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  exchangeButtonActive: {
    backgroundColor: colors.positive,
  },
  exchangeButtonText: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  exchangeButtonTextActive: {
    color: '#FFFFFF',
  },
  marketDepthContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tabContent: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: colors.surface,
  },
  tradeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: colors.positive,
    marginRight: 8,
  },
  sellButton: {
    backgroundColor: colors.negative,
    marginLeft: 8,
  },
  tradeButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontFamily: fonts.medium,
  },
  moreButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  moreButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
});
