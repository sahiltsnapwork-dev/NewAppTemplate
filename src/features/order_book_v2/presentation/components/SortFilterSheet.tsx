// Component: SortFilterSheet + FilterChipRow
// Source: sort_filter_sheet.dart / filter_chip_row.dart
// Filter bottom sheet for exchange / action / product / status + sort

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
export interface OrderBookFilters {
  exchange: string;
  action: string;
  product: string;
  status: string;
  sortBy: string;
}

interface Props {
  visible: boolean;
  currentFilters: OrderBookFilters;
  onApply: (filters: OrderBookFilters) => void;
  onDismiss: () => void;
}

const EXCHANGE_OPTIONS = ['ALL', 'NSE', 'BSE'];
const ACTION_OPTIONS = ['ALL', 'BUY', 'SELL'];
const PRODUCT_OPTIONS = ['ALL', 'MIS', 'CNC', 'NRML'];
const STATUS_OPTIONS = ['ALL', 'Pending', 'Traded', 'Cancelled', 'Rejected'];
const SORT_OPTIONS = ['LATEST_FIRST', 'OLDEST_FIRST', 'SYMBOL_A_Z', 'SYMBOL_Z_A'];

const SortFilterSheet: React.FC<Props> = ({ visible, currentFilters, onApply, onDismiss }) => {
  const [filters, setFilters] = useState<OrderBookFilters>(currentFilters);

  const update = (key: keyof OrderBookFilters, val: string) =>
    setFilters((f) => ({ ...f, [key]: val }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      accessible
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Sort & Filter</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <FilterSection
              label="Exchange"
              options={EXCHANGE_OPTIONS}
              selected={filters.exchange ?? 'ALL'}
              onSelect={(v) => update('exchange', v)}
            />
            <FilterSection
              label="Action"
              options={ACTION_OPTIONS}
              selected={filters.action ?? 'ALL'}
              onSelect={(v) => update('action', v)}
            />
            <FilterSection
              label="Product"
              options={PRODUCT_OPTIONS}
              selected={filters.product ?? 'ALL'}
              onSelect={(v) => update('product', v)}
            />
            <FilterSection
              label="Status"
              options={STATUS_OPTIONS}
              selected={filters.status ?? 'ALL'}
              onSelect={(v) => update('status', v)}
            />
            <FilterSection
              label="Sort By"
              options={SORT_OPTIONS}
              selected={filters.sortBy ?? 'LATEST_FIRST'}
              onSelect={(v) => update('sortBy', v)}
            />
          </ScrollView>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() =>
                setFilters({ exchange: 'ALL', action: 'ALL', product: 'ALL', status: 'ALL', sortBy: 'LATEST_FIRST' })
              }
            >
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => { onApply(filters); onDismiss(); }}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface FilterSectionProps {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({ label, options, selected, onSelect }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{label}</Text>
    <FilterChipRow options={options} selected={selected} onSelect={onSelect} />
  </View>
);

interface FilterChipRowProps {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}

export const FilterChipRow: React.FC<FilterChipRowProps> = ({ options, selected, onSelect }) => (
  <View style={styles.chipRow}>
    {options.map((opt) => (
      <TouchableOpacity
        key={opt}
        style={[styles.chip, selected === opt && styles.chipActive]}
        onPress={() => onSelect(opt)}
        accessibilityLabel={`Select ${opt}`}
      >
        <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>
          {opt}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDDDDD',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },

  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 13, color: '#888888', marginBottom: 8, fontWeight: '500' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
  },
  chipActive: { backgroundColor: '#0066CC' },
  chipText: { fontSize: 12, color: '#666666', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
  },
  resetBtnText: { fontSize: 14, color: '#666666', fontWeight: '600' },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
});

export default SortFilterSheet;
