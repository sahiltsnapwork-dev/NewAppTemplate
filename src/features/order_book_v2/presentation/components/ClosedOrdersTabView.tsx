// Component: ClosedOrdersTabView
// Source: closed_orders_tab_view.dart
// Renders Closed / GTD orders (no cancel/modify actions)

import React, { useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';
import OrderBookRow from './OrderBookRow';

interface Props {
  orders: OrderBookEntry[];
  refreshing: boolean;
  onRefresh: () => void;
}

const ClosedOrdersTabView: React.FC<Props> = ({ orders, refreshing, onRefresh }) => {
  const renderItem = useCallback(
    ({ item }: { item: OrderBookEntry }) => (
      <OrderBookRow order={item} onPress={() => {}} />
    ),
    []
  );

  if (orders.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No orders</Text>
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
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48,
  },
  emptyText: { fontSize: 15, color: '#999999' },
});

export default ClosedOrdersTabView;
