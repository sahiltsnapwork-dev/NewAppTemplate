// Component: OpenOrdersTabView
// Source: open_order_book_widget_v2.dart / open_orders_tab_view.dart
// Renders Open orders list with pull-to-refresh and row actions

import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';
import OrderBookRow from './OrderBookRow';

interface Props {
  orders: OrderBookEntry[];
  onRowTap: (order: OrderBookEntry) => void;
  onCancelTap: (order: OrderBookEntry) => void;
  onModifyTap: (order: OrderBookEntry) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

const OpenOrdersTabView: React.FC<Props> = ({
  orders,
  onRowTap,
  onCancelTap,
  onModifyTap,
  refreshing,
  onRefresh,
}) => {
  const renderItem = useCallback(
    ({ item }: { item: OrderBookEntry }) => (
      <OrderBookRow
        order={item}
        onPress={() => onRowTap(item)}
        onCancelPress={item.orderStatus === 'Pending' ? () => onCancelTap(item) : undefined}
        onModifyPress={item.orderStatus === 'Pending' ? () => onModifyTap(item) : undefined}
      />
    ),
    [onRowTap, onCancelTap, onModifyTap]
  );

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No open orders</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.exchangeOrderNumber}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0066CC" />
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 16, paddingTop: 4 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyText: { fontSize: 15, color: '#999999' },
});

export default OpenOrdersTabView;
