// Component: OpenOrdersTabView
// Source: open_order_book_widget_v2.dart / open_orders_tab_view.dart
// Figma: node 13306:73973 – Open order screen
// NSE/BSE toggle + Cancel Orders button + Search bar + order list

import React, { useCallback, useState } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';
import OrderBookRow from './OrderBookRow';

interface Props {
  orders: OrderBookEntry[];
  exchange: 'NSE' | 'BSE';
  onExchangeChange: (ex: 'NSE' | 'BSE') => void;
  onRowTap: (order: OrderBookEntry) => void;
  onCancelTap: (order: OrderBookEntry) => void;
  onModifyTap: (order: OrderBookEntry) => void;
  onCancelAll?: () => void;
  onFilterPress?: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}

const OpenOrdersTabView: React.FC<Props> = ({
  orders,
  exchange,
  onExchangeChange,
  onRowTap,
  onCancelTap,
  onModifyTap,
  onCancelAll,
  onFilterPress,
  refreshing,
  onRefresh,
}) => {
  const [searchText, setSearchText] = useState('');

  const filteredOrders = orders.filter((o) => {
    const matchExchange = o.exchangeIdentity.exchangeId === exchange;
    const matchSearch = searchText.trim() === '' ||
      (o.instrumentIdentity.lsSymbol ?? o.instrumentIdentity.lssymbol ?? o.instrumentIdentity.instrumentId)
        .toLowerCase()
        .includes(searchText.toLowerCase());
    return matchExchange && matchSearch;
  });

  // Group orders by date
  const grouped: { date: string; orders: OrderBookEntry[] }[] = [];
  filteredOrders.forEach((order) => {
    const dateStr = (() => {
      try {
        return new Date(order.orderDateTime).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
      } catch {
        return order.orderDateTime?.slice(0, 10) ?? '';
      }
    })();
    const existing = grouped.find((g) => g.date === dateStr);
    if (existing) existing.orders.push(order);
    else grouped.push({ date: dateStr, orders: [order] });
  });

  type ListItem =
    | { type: 'date'; date: string }
    | { type: 'order'; order: OrderBookEntry };

  const listData: ListItem[] = grouped.flatMap((g) => [
    { type: 'date' as const, date: g.date },
    ...g.orders.map((o) => ({ type: 'order' as const, order: o })),
  ]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'date') {
        return <Text style={styles.dateHeader}>{item.date}</Text>;
      }
      return (
        <OrderBookRow
          order={item.order}
          onPress={() => onRowTap(item.order)}
          onCancelPress={item.order.orderStatus === 'Pending' ? () => onCancelTap(item.order) : undefined}
          onModifyPress={item.order.orderStatus === 'Pending' ? () => onModifyTap(item.order) : undefined}
        />
      );
    },
    [onRowTap, onCancelTap, onModifyTap]
  );

  const Header = (
    <View style={styles.header}>
      {/* Row 1: NSE/BSE toggle + Cancel Orders button */}
      <View style={styles.controlsRow}>
        {/* NSE/BSE segmented control */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentTrack}>
            <TouchableOpacity
              style={[styles.segmentOption, exchange === 'NSE' && styles.segmentActive]}
              onPress={() => onExchangeChange('NSE')}
            >
              <Text style={[styles.segmentText, exchange === 'NSE' && styles.segmentTextActive]}>
                NSE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentOption, exchange === 'BSE' && styles.segmentActive]}
              onPress={() => onExchangeChange('BSE')}
            >
              <Text style={[styles.segmentText, exchange === 'BSE' && styles.segmentTextActive]}>
                BSE
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cancel Orders button */}
        {onCancelAll && (
          <TouchableOpacity style={styles.cancelAllBtn} onPress={onCancelAll}>
            <Text style={styles.cancelAllText}>Cancel Orders  ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2: Search bar + Filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#a0a5bd"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={onFilterPress}>
          <Text style={styles.filterIcon}>⚙</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (filteredOrders.length === 0) {
    return (
      <View style={styles.flex1}>
        {Header}
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No open orders</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={listData}
      keyExtractor={(item, idx) =>
        item.type === 'date' ? `date-${item.date}` : item.order.exchangeOrderNumber + idx
      }
      renderItem={renderItem}
      ListHeaderComponent={Header}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2541be" />
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // NSE/BSE segmented control
  segmentContainer: {},
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 5,
    height: 24,
    overflow: 'hidden',
    width: 96,
  },
  segmentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  segmentActive: {
    backgroundColor: '#001489',
  },
  segmentText: { fontSize: 11, color: '#111e58', lineHeight: 14 },
  segmentTextActive: { color: '#FFFFFF' },
  // Cancel All button
  cancelAllBtn: {
    backgroundColor: '#f5e8ea',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 68,
  },
  cancelAllText: { fontSize: 11, fontWeight: '700', color: '#971b2f', lineHeight: 14 },
  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 5,
    height: 44,
    paddingLeft: 13,
    paddingRight: 17,
  },
  searchIcon: { fontSize: 14, marginRight: 8, color: '#a0a5bd' },
  searchInput: { flex: 1, fontSize: 12, color: '#111e58', height: 44 },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: { fontSize: 16, color: '#424b7a' },
  // Date header
  dateHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111e58',
    lineHeight: 22,
    marginBottom: 8,
  },
  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: { fontSize: 15, color: '#888fac' },
});

export default OpenOrdersTabView;
