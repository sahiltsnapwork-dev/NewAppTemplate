// Main Order Book Screen
// Source: order_book_screen_v2.dart → OrderBookScreenV2
// Tabs: Order Book (Open/Closed/GTD) | Positions | Trade Book | Stock SIP | MF Order Book
// State: useSelector/useDispatch + thunks

import React, { useCallback, useEffect, useState } from 'react';
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
import SortFilterButton from '../components/SortFilterButton';

const TAB_LABELS = ['Order Book', 'Positions', 'Trade Book', 'Stock SIP', 'MF Orders'];
const ORDER_BOOK_TABS = ['Open', 'Closed', 'GTD'];

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

  const [orderBookSubTab, setOrderBookSubTab] = useState(0); // 0=Open, 1=Closed, 2=GTD
  const [refreshing, setRefreshing] = useState(false);

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
    (tabIndex: 0 | 1 | 2 | 3 | 4) => {
      dispatch(setActiveTab(tabIndex));
      if (tabIndex === 0 && openOrders.length === 0) loadOrderBook('OPEN');
      if (tabIndex === 1 && positions.length === 0) loadPositions();
      if (tabIndex === 2 && tradeBook.length === 0) loadTradeBook();
      if (tabIndex === 3 && sipData.length === 0) loadSip();
    },
    [dispatch, openOrders.length, positions.length, tradeBook.length, sipData.length, loadOrderBook, loadPositions, loadTradeBook, loadSip]
  );

  // ── Order Book Sub-tab Switch ───────────────────────────────────────────────
  const handleOrderBookSubTab = useCallback(
    (idx: number) => {
      setOrderBookSubTab(idx);
      const statusMap: ('OPEN' | 'CLOSED' | 'GTD')[] = ['OPEN', 'CLOSED', 'GTD'];
      const status = statusMap[idx];
      const ordersMap = [openOrders, closedOrders, gtdOrders];
      if (ordersMap[idx].length === 0) {
        loadOrderBook(status);
      }
    },
    [openOrders, closedOrders, gtdOrders, loadOrderBook]
  );

  // ── Pull to Refresh ─────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 0) {
      const statusMap: ('OPEN' | 'CLOSED' | 'GTD')[] = ['OPEN', 'CLOSED', 'GTD'];
      loadOrderBook(statusMap[orderBookSubTab]);
    } else if (activeTab === 1) {
      loadPositions();
    } else if (activeTab === 2) {
      loadTradeBook();
    }
    setRefreshing(false);
  }, [activeTab, orderBookSubTab, loadOrderBook, loadPositions, loadTradeBook]);

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
      // Order Book tab
      return (
        <View style={styles.flex1}>
          {/* Order Book Sub-tabs: Open | Closed | GTD */}
          <View style={styles.subTabRow}>
            {ORDER_BOOK_TABS.map((label, idx) => (
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
                  {idx === 0 && orderCount.openCount > 0
                    ? ` (${orderCount.openCount})`
                    : idx === 1 && orderCount.closedCount > 0
                    ? ` (${orderCount.closedCount})`
                    : idx === 2 && orderCount.gtdCount > 0
                    ? ` (${orderCount.gtdCount})`
                    : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <SortFilterButton />
          </View>

          {isLoading ? (
            <OrderBookShimmer />
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() =>
                  loadOrderBook(['OPEN', 'CLOSED', 'GTD'][orderBookSubTab] as 'OPEN' | 'CLOSED' | 'GTD')
                }
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : orderBookSubTab === 0 ? (
            <OpenOrdersTabView
              orders={openOrders}
              onRowTap={handleOrderTap}
              onCancelTap={handleCancelOrder}
              onModifyTap={handleModifyOrder}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : orderBookSubTab === 1 ? (
            <ClosedOrdersTabView
              orders={closedOrders}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : (
            <ClosedOrdersTabView
              orders={gtdOrders}
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
      return (
        <TradeBookList
          tradeBook={tradeBook}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      );
    }

    if (activeTab === 3) {
      return (
        <StockSipTab
          sips={sipData ?? []}
          refreshing={sipLoading}
          onRefresh={() => dispatch(fetchSipDataThunk(ACCOUNT.tradingAccountNumber))}
          onViewSip={(sip) => console.log('View SIP', sip.sipReferenceNumber)}
          onViewTrail={(sip) => console.log('View Trail', sip.sipReferenceNumber)}
          onViewChildren={(sip) => console.log('View Children', sip.sipReferenceNumber)}
        />
      );
    }

    if (activeTab === 4) {
      // MF Order Book – placeholder (feature boundary)
      return (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>MF Order Book coming soon</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Main Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.mainTabRow}
        contentContainerStyle={styles.mainTabContent}
      >
        {TAB_LABELS.map((label, idx) => (
          <TouchableOpacity
            key={label}
            style={[styles.mainTab, activeTab === idx && styles.mainTabActive]}
            onPress={() => handleTabSwitch(idx as 0 | 1 | 2 | 3 | 4)}
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
      </ScrollView>

      {/* Tab Content */}
      <View style={styles.flex1}>{renderTabContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  flex1: { flex: 1 },

  // Main tabs
  mainTabRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    flexGrow: 0,
  },
  mainTabContent: {
    paddingHorizontal: 8,
  },
  mainTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 4,
  },
  mainTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  mainTabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '400',
  },
  mainTabTextActive: {
    color: '#0066CC',
    fontWeight: '600',
  },

  // Sub-tabs (Open/Closed/GTD)
  subTabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  subTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  subTabText: {
    fontSize: 13,
    color: '#888888',
  },
  subTabTextActive: {
    color: '#0066CC',
    fontWeight: '600',
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
    color: '#CC0000',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
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
    color: '#999999',
  },
});

export default OrderBookScreen;
