// Component: TradeBookList
// Source: trade_book_widget_v2.dart
// Grouped trade book list (TradeBookDetails) with collapsible legs

import React, { useCallback, useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import type { TradeBookDetails, TradeBookEntry } from '../../domain/entities/TradeBookEntry';

interface Props {
  tradeBook: TradeBookDetails[];
  refreshing: boolean;
  onRefresh: () => void;
}

const TradeBookList: React.FC<Props> = ({ tradeBook, refreshing, onRefresh }) => {
  const renderItem = useCallback(
    ({ item }: { item: TradeBookDetails }) => (
      <TradeBookGroupRow group={item} />
    ),
    []
  );

  if (tradeBook.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No trades for today</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tradeBook}
      keyExtractor={(item) => item.exchangeOrderNumber}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const TradeBookGroupRow: React.FC<{ group: TradeBookDetails }> = ({ group }) => {
  const [expanded, setExpanded] = useState(false);
  const parentEntry = group.trades[0];
  const symbolName =
    group.lsSymbol ??
    group.lssymbol ??
    group.instrumentId;
  const isBuy = group.orderSide === 1;

  return (
    <View style={styles.card}>
      {/* Parent summary row */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
        accessibilityLabel={`${symbolName} trade group, ${expanded ? 'collapse' : 'expand'}`}
      >
        <View style={styles.leftSection}>
          <Text style={[styles.directionDot, isBuy ? styles.buyDot : styles.sellDot]}>●</Text>
          <View>
            <Text style={styles.symbol}>{symbolName}</Text>
            <Text style={styles.exchange}>
              {group.exchangeId} ·{' '}
              {group.trades.length} leg{group.trades.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.avgPrice}>Avg ₹{group.averageTradePrice.toFixed(2)}</Text>
          <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded trade legs */}
      {expanded &&
        group.trades.map((leg: TradeBookEntry, idx: number) => (
          <View key={`${leg.exchangeOrderNumber}-${idx}`} style={styles.legRow}>
            <Text style={styles.legQty}>Qty: {leg.tradedQuantity}</Text>
            <Text style={styles.legPrice}>₹{leg.tradePrice.toFixed(2)}</Text>
            <Text style={styles.legTime}>
              {leg.tradeDateTime
                ? new Date(leg.tradeDateTime).toLocaleTimeString()
                : '—'}
            </Text>
          </View>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 16, paddingTop: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText: { fontSize: 15, color: '#999999' },

  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  directionDot: { fontSize: 12 },
  buyDot: { color: '#009900' },
  sellDot: { color: '#CC0000' },
  symbol: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  exchange: { fontSize: 11, color: '#888888', marginTop: 2 },

  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avgPrice: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  expandIcon: { fontSize: 10, color: '#888888' },

  legRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#F8F9FA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
  },
  legQty: { fontSize: 12, color: '#555555' },
  legPrice: { fontSize: 12, color: '#1A1A2E', fontWeight: '500' },
  legTime: { fontSize: 12, color: '#888888' },
});

export default TradeBookList;
