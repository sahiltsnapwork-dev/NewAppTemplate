import React from 'react';
import { View, FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { StockEntity } from '../../domain/entities/StockEntity';
import { StockSearchTile } from './StockSearchTile';

interface Props {
  data: StockEntity[];
  activeFilter: string;
  isLoading: boolean;
  onTap: (item: StockEntity) => void;
  onAddToWatchlist: (item: StockEntity) => void;
}

function applyFilter(stocks: StockEntity[], filter: string): StockEntity[] {
  if (filter.toLowerCase() === 'all') return stocks;
  return stocks.filter(
    (s) => (s.instrumentName ?? '').toLowerCase() === filter.toLowerCase(),
  );
}

export const SearchResultsList: React.FC<Props> = ({
  data,
  activeFilter,
  isLoading,
  onTap,
  onAddToWatchlist,
}) => {
  const filtered = applyFilter(data, activeFilter);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (filtered.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No matching stocks found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filtered}
      keyExtractor={(item, index) =>
        `${item.symbol ?? item.companyName ?? ''}-${item.exchange ?? ''}-${index}`
      }
      renderItem={({ item }) => (
        <StockSearchTile
          item={item}
          onTap={onTap}
          onAddToWatchlist={onAddToWatchlist}
        />
      )}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
