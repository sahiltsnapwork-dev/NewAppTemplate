// Component: SortFilterButton
// Header icon button that opens the SortFilterSheet bottom modal

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import SortFilterSheet, { type OrderBookFilters } from './SortFilterSheet';

const DEFAULT_FILTERS: OrderBookFilters = {
  exchange: 'ALL',
  action: 'ALL',
  product: 'ALL',
  status: 'ALL',
  sortBy: 'LATEST_FIRST',
};

const SortFilterButton: React.FC = () => {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [filters, setFilters] = useState<OrderBookFilters>(DEFAULT_FILTERS);

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setSheetVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Sort and filter orders"
      >
        <Text style={styles.icon}>⇅</Text>
      </TouchableOpacity>

      <SortFilterSheet
        visible={sheetVisible}
        currentFilters={filters}
        onApply={(applied) => {
          setFilters(applied);
          setSheetVisible(false);
        }}
        onDismiss={() => setSheetVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#CCDDFF',
  },
  icon: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '700',
  },
});

export default SortFilterButton;
