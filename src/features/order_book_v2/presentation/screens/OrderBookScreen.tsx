// Main Order Book Screen
// Source: order_book_screen_v2.dart → OrderBookScreenV2
// Figma: 13306:73973, 13521:30796, 15050:81989, 15050:81651, 13891:48711
// Tabs: Orderbook (Open/Closed) | Positions | Mutual Funds | IPO
// State: useSelector/useDispatch + thunks

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OrderBookNavigatorParams } from '../navigation/OrderBookNavigator';
import type { AppDispatch } from '../../../../store/store';
import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';

import {
  fetchOrderBookThunk,
  fetchTradeBookThunk,
  fetchSipDataThunk,
} from '../../state/thunks/orderBookThunks';
import { fetchAllPositionsThunk } from '../../state/thunks/positionsThunks';
import {
  selectOpenOrders,
  selectClosedOrders,
  selectGtdOrders,
  selectOrderBookIsLoading,
  selectOrderCount,
  selectTradeBook,
  selectOrderBookError,
  selectActiveTab,
} from '../../state/selectors/orderBookSelectors';
import {
  selectPositions,
  selectPositionsIsLoading,
  selectPositionsSummary,
  selectSipData,
  selectSipIsLoading,
} from '../../state/selectors/positionsSelectors';
import { setActiveTab, resetOrderBook } from '../../state/slices/orderBookSlice';

import OpenOrdersTabView from '../components/OpenOrdersTabView';
import ClosedOrdersTabView from '../components/ClosedOrdersTabView';
import PositionsList from '../screens/PositionsScreen';
import TradeBookList from '../components/TradeBookList';
import StockSipTab from '../components/StockSipTab';
import OrderBookShimmer from '../components/OrderBookShimmer';
import SortFilterSheet from '../components/SortFilterSheet';
import type { OrderBookFilters } from '../components/SortFilterSheet';

// Figma: 4 main tabs – Orderbook | Positions | Mutual Funds | IPO
const TAB_LABELS = ['Orderbook', 'Positions', 'Mutual Funds', 'IPO'];
const ORDER_BOOK_TABS = ['Open', 'Closed'];

// Placeholder account details – replace with auth store
const ACCOUNT = { tradingAccountNumber: '12345678', accountSettlementType: 0 };

type Props = NativeStackScreenProps<OrderBookNavigatorParams, 'OrderBook'>;

const OrderBookScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const activeTab = useSelector(selectActiveTab);
  const isLoading = useSelector(selectOrderBookIsLoading);

  const openOrders = useSelector(selectOpenOrders);
  const closedOrders = useSelector(selectClosedOrders);
  const gtdOrders = useSelector(selectGtdOrders);
  const orderCount = useSelector(selectOrderCount);
  const tradeBook = useSelector(selectTradeBook);
  const error = useSelector(selectOrderBookError);

  const positions = useSelector(selectPositions);
  const positionsLoading = useSelector(selectPositionsIsLoading);
  const positionsSummary = useSelector(selectPositionsSummary);

  const sipData = useSelector(selectSipData);
  const sipLoading = useSelector(selectSipIsLoading);

  const [orderBookSubTab, setOrderBookSubTab] = useState(0); // 0=Open, 1=Closed
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<OrderBookFilters>({
    exchange: 'ALL', action: 'ALL', product: 'ALL', status: 'ALL', sortBy: 'Alphabetically : A-Z',
  });

  // ── Apply filters + sort ────────────────────────────────────────────────────
  const applyFiltersAndSort = useCallback(
    (orders: OrderBookEntry[]): OrderBookEntry[] => {
      let result = [...orders];

      // action: BUY / SELL
      if (activeFilters.action !== 'ALL') {
        const side = activeFilters.action === 'BUY' ? 1 : 2;
        result = result.filter((o) => o.orderLegDetails.orderSide === side);
      }
      // product: MIS / CNC / NRML
      if (activeFilters.product !== 'ALL') {
        result = result.filter(
          (o) => (o.productDescription ?? '').toUpperCase() === activeFilters.product.toUpperCase()
        );
      }
      // status: Pending / Traded / Cancelled / Rejected
      if (activeFilters.status !== 'ALL') {
        result = result.filter(
          (o) => o.orderStatus.toLowerCase() === activeFilters.status.toLowerCase()
        );
      }

      // sort
      const sym = (o: OrderBookEntry) =>
        (o.instrumentIdentity.lsSymbol ?? o.instrumentIdentity.lssymbol ?? o.instrumentIdentity.instrumentId).toLowerCase();
      switch (activeFilters.sortBy) {
        case 'Alphabetically : A-Z':
          result.sort((a, b) => sym(a).localeCompare(sym(b)));
          break;
        case 'Alphabetically : Z-A':
          result.sort((a, b) => sym(b).localeCompare(sym(a)));
          break;
        case 'Order Value : high to low':
          result.sort((a, b) => b.orderPrice * b.orderQuantity - a.orderPrice * a.orderQuantity);
          break;
        case 'Order Value : low to high':
          result.sort((a, b) => a.orderPrice * a.orderQuantity - b.orderPrice * b.orderQuantity);
          break;
        case 'Quantity : high to low':
          result.sort((a, b) => b.orderQuantity - a.orderQuantity);
          break;
        case 'Quantity : low to high':
          result.sort((a, b) => a.orderQuantity - b.orderQuantity);
          break;
        case 'LTP : high To Low':
          result.sort((a, b) => (b.averageTradePrice ?? b.orderPrice) - (a.averageTradePrice ?? a.orderPrice));
          break;
        case 'LTP : low to high':
          result.sort((a, b) => (a.averageTradePrice ?? a.orderPrice) - (b.averageTradePrice ?? b.orderPrice));
          break;
      }
      return result;
    },
    [activeFilters]
  );

  const filteredOpenOrders = useMemo(() => applyFiltersAndSort(openOrders), [applyFiltersAndSort, openOrders]);
  const filteredClosedOrders = useMemo(() => applyFiltersAndSort(closedOrders), [applyFiltersAndSort, closedOrders]);

  // ── Initial Load ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadOrderBook('OPEN');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrderBook = useCallback(
    (status: 'OPEN' | 'CLOSED' | 'GTD') => {
      dispatch(
        fetchOrderBookThunk({
          tradingAccountNumber: ACCOUNT.tradingAccountNumber,
          accountSettlementType: ACCOUNT.accountSettlementType,
          status,
          isAmoEnabled: false,
          isUserNRI: false,
          loaderIndex: 0,
        })
      );
    },
    [dispatch]
  );

  const loadPositions = useCallback(() => {
    dispatch(
      fetchAllPositionsThunk({
        tradingAccountNumber: ACCOUNT.tradingAccountNumber,
        accountSettlementType: ACCOUNT.accountSettlementType,
        isFOPrivilege: false,
        isCurrencyDerivativePrivilege: false,
      })
    );
  }, [dispatch]);

  const loadTradeBook = useCallback(() => {
    dispatch(
      fetchTradeBookThunk({
        tradingAccountNumber: ACCOUNT.tradingAccountNumber,
        accountSettlementType: ACCOUNT.accountSettlementType,
      })
    );
  }, [dispatch]);

  const loadSip = useCallback(() => {
    dispatch(fetchSipDataThunk(ACCOUNT.tradingAccountNumber));
  }, [dispatch]);

  // ── Tab Switch ──────────────────────────────────────────────────────────────
  const handleTabSwitch = useCallback(
    (tabIndex: 0 | 1 | 2 | 3) => {
      dispatch(setActiveTab(tabIndex));
      if (tabIndex === 0 && openOrders.length === 0) loadOrderBook('OPEN');
      if (tabIndex === 1 && positions.length === 0) loadPositions();
    },
    [dispatch, openOrders.length, positions.length, loadOrderBook, loadPositions]
  );

  // ── Order Book Sub-tab Switch ───────────────────────────────────────────────
  const handleOrderBookSubTab = useCallback(
    (idx: number) => {
      setOrderBookSubTab(idx);
      const statusMap: ('OPEN' | 'CLOSED')[] = ['OPEN', 'CLOSED'];
      const status = statusMap[idx];
      const ordersMap = [openOrders, closedOrders];
      if (ordersMap[idx].length === 0) {
        loadOrderBook(status);
      }
    },
    [openOrders, closedOrders, loadOrderBook]
  );

  // ── Pull to Refresh ─────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 0) {
      const statusMap: ('OPEN' | 'CLOSED')[] = ['OPEN', 'CLOSED'];
      loadOrderBook(statusMap[orderBookSubTab]);
    } else if (activeTab === 1) {
      loadPositions();
    }
    setRefreshing(false);
  }, [activeTab, orderBookSubTab, loadOrderBook, loadPositions]);

  // ── Row Tap Handlers ────────────────────────────────────────────────────────
  const handleOrderTap = useCallback(
    (order: OrderBookEntry) => {
      navigation.navigate('OrderBookDetails', { order });
    },
    [navigation]
  );

  const handleCancelOrder = useCallback(
    (order: OrderBookEntry) => {
      navigation.navigate('OrderBookCancel', { order, action: 'cancel' });
    },
    [navigation]
  );

  const handleModifyOrder = useCallback(
    (order: OrderBookEntry) => {
      navigation.navigate('OrderBookCancel', { order, action: 'modify' });
    },
    [navigation]
  );

  // ── Render Tab Content ──────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (activeTab === 0) {
      const openCount = filteredOpenOrders.filter(o => o.exchangeIdentity.exchangeId === exchange).length;
      const closedCount = filteredClosedOrders.filter(o => o.exchangeIdentity.exchangeId === exchange).length;
      const subTabLabels = [
        `Open${openCount > 0 ? ` (${openCount})` : ''}`,
        `Closed${closedCount > 0 ? ` (${closedCount})` : ''}`,
      ];
      // Orderbook tab – Open / Closed sub-tabs
      return (
        <View style={styles.flex1}>
          {/* Open/Closed sub-tab row (Figma underline style) */}
          <View style={styles.subTabRow}>
            {subTabLabels.map((label, idx) => (
              <TouchableOpacity
                key={label}
                style={[styles.subTab, orderBookSubTab === idx && styles.subTabActive]}
                onPress={() => handleOrderBookSubTab(idx)}
                accessibilityRole="tab"
                accessibilityState={{ selected: orderBookSubTab === idx }}
              >
                <Text
                  style={[styles.subTabText, orderBookSubTab === idx && styles.subTabTextActive]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <OrderBookShimmer />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() =>
                  loadOrderBook(['OPEN', 'CLOSED'][orderBookSubTab] as 'OPEN' | 'CLOSED')
                }
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : orderBookSubTab === 0 ? (
            <OpenOrdersTabView
              orders={filteredOpenOrders}
              exchange={exchange}
              onExchangeChange={setExchange}
              onRowTap={handleOrderTap}
              onCancelTap={handleCancelOrder}
              onModifyTap={handleModifyOrder}
              onCancelAll={() => navigation.navigate('OrderBookCancel', { order: openOrders[0], action: 'cancel' })}
              onFilterPress={() => setFilterVisible(true)}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : (
            <ClosedOrdersTabView
              orders={filteredClosedOrders}
              exchange={exchange}
              onExchangeChange={setExchange}
              onRowTap={handleOrderTap}
              onFilterPress={() => setFilterVisible(true)}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          )}
        </View>
      );
    }

    if (activeTab === 1) {
      return (
        <PositionsList
          positions={positions}
          summary={positionsSummary}
          isLoading={positionsLoading}
          onPositionTap={(pos) => navigation.navigate('PositionsDetails', { position: pos })}
          onExitTap={(pos) => navigation.navigate('ExitOpenPositions', { position: pos })}
          onConvertTap={(pos) => navigation.navigate('ConvertPosition', { position: pos })}
          onAddTap={() => console.log('Launch Trade screen – feature not implemented')}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      );
    }

    if (activeTab === 2) {
      // Mutual Funds – placeholder
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Mutual Funds coming soon</Text>
        </View>
      );
    }

    if (activeTab === 3) {
      // IPO – placeholder
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>IPO coming soon</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Main Tab Bar – Figma pill style (white card, active = gradient button) */}
      <View style={styles.mainTabWrapper}>
        <View style={styles.mainTabRow}>
          {TAB_LABELS.map((label, idx) => (
            <TouchableOpacity
              key={label}
              style={[styles.mainTab, activeTab === idx && styles.mainTabActive]}
              onPress={() => handleTabSwitch(idx as 0 | 1 | 2 | 3)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === idx }}
            >
              <Text
                style={[styles.mainTabText, activeTab === idx && styles.mainTabTextActive]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.flex1}>{renderTabContent()}</View>

      {/* Sort & Filter bottom sheet */}
      <SortFilterSheet
        visible={filterVisible}
        currentFilters={activeFilters}
        onApply={(f) => {
          setActiveFilters(f);
          if (f.exchange !== 'ALL') setExchange(f.exchange as 'NSE' | 'BSE');
        }}
        onDismiss={() => setFilterVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  flex1: { flex: 1 },

  // Main tab bar – Figma: grey wrapper, inner white card
  mainTabWrapper: {
    backgroundColor: '#f6f6f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 5,
    padding: 0,
  },
  mainTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  mainTabActive: {
    backgroundColor: '#001489',
    borderRadius: 5,
  },
  mainTabText: {
    fontSize: 14,
    color: '#888fac',
    lineHeight: 17,
  },
  mainTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Sub-tabs (Open/Closed) – Figma: grey bg, centered, underline active
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: '#f6f6f6',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
    gap: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e9f0',
  },
  subTab: {
    paddingBottom: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#2a3569',
  },
  subTabText: {
    fontSize: 14,
    color: '#888fac',
    lineHeight: 22,
  },
  subTabTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2a3569',
    lineHeight: 22,
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#971b2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2541be',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Placeholder
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888fac',
  },
});

export default OrderBookScreen;
