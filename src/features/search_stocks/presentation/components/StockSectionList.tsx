import React from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import type { StockEntity } from '../../domain/entities/StockEntity';
import { StockSearchTile } from './StockSearchTile';

interface Props {
  title: string;
  data: StockEntity[];
  onTap: (item: StockEntity) => void;
  onAddToWatchlist: (item: StockEntity) => void;
}

export const StockSectionList: React.FC<Props> = ({
  title,
  data,
  onTap,
  onAddToWatchlist,
}) => {
  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.map((item, index) => (
        <StockSearchTile
          key={`${item.symbol ?? item.companyName}-${index}`}
          item={item}
          onTap={onTap}
          onAddToWatchlist={onAddToWatchlist}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#959aaa',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
