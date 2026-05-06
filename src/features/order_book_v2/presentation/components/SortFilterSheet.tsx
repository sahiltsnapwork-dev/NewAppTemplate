// Component: SortFilterSheet + FilterChipRow
// Source: sort_filter_sheet.dart / filter_chip_row.dart
// Figma: node 13929:49417 – Sort and filter bottom sheet
// Left sidebar categories + right radio options + Clear all / Apply buttons

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

const CATEGORIES = [
  { key: 'sortBy',   label: 'Sort' },
  { key: 'status',   label: 'Status' },
  { key: 'action',   label: 'Transaction' },
  { key: 'product',  label: 'Product' },
  { key: 'exchange', label: 'Exchange' },
];

const CATEGORY_OPTIONS: Record<string, string[]> = {
  sortBy:   ['Alphabetically : A-Z', 'Alphabetically : Z-A', 'Order Value : high to low', 'Order Value : low to high', 'Quantity : high to low', 'Quantity : low to high', 'LTP : high To Low', 'LTP : low to high'],
  status:   ['ALL', 'Pending', 'Traded', 'Cancelled', 'Rejected'],
  action:   ['ALL', 'BUY', 'SELL'],
  product:  ['ALL', 'MIS', 'CNC', 'NRML'],
  exchange: ['ALL', 'NSE', 'BSE'],
};

const DEFAULT_FILTERS: OrderBookFilters = {
  exchange: 'ALL', action: 'ALL', product: 'ALL', status: 'ALL', sortBy: 'Alphabetically : A-Z',
};

const SortFilterSheet: React.FC<Props> = ({ visible, currentFilters, onApply, onDismiss }) => {
  const [filters, setFilters] = useState<OrderBookFilters>(currentFilters);
  const [activeCategory, setActiveCategory] = useState<string>('sortBy');

  const update = (key: keyof OrderBookFilters, val: string) =>
    setFilters((f) => ({ ...f, [key]: val }));

  const currentOptions = CATEGORY_OPTIONS[activeCategory] ?? [];
  const currentValue = filters[activeCategory as keyof OrderBookFilters];

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
          {/* Handle + Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>SORT AND FILTER</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} accessibilityLabel="Close">
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Body: left sidebar + right radio options */}
          <View style={styles.body}>
            {/* Left sidebar – category list */}
            <View style={styles.sidebar}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.sidebarItem, activeCategory === cat.key && styles.sidebarItemActive]}
                  onPress={() => setActiveCategory(cat.key)}
                >
                  <Text style={[styles.sidebarText, activeCategory === cat.key && styles.sidebarTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Vertical divider */}
            <View style={styles.divider} />

            {/* Right – radio options */}
            <ScrollView style={styles.optionsArea} showsVerticalScrollIndicator={false}>
              {currentOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.radioRow}
                  onPress={() => update(activeCategory as keyof OrderBookFilters, opt)}
                >
                  <View style={[styles.radioOuter, currentValue === opt && styles.radioOuterActive]}>
                    {currentValue === opt && <View style={styles.radioInner} />}
                  </View>
                  <Text style={styles.radioLabel}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom buttons: Clear all + Apply */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => setFilters(DEFAULT_FILTERS)}
              accessibilityLabel="Clear all filters"
            >
              <Text style={styles.clearBtnText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => { onApply(filters); onDismiss(); }}
              accessibilityLabel="Apply filters"
            >
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>

          {/* Home indicator */}
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </Modal>
  );
};

// Keep FilterChipRow exported for backward compat
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
        <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>{opt}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#f6f6f6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 8,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: { fontSize: 14, fontWeight: '700', color: '#141e55', lineHeight: 22 },
  closeBtn: {
    width: 18,
    height: 18,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#111e58',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 10, color: '#111e58', lineHeight: 14 },
  body: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 10,
    marginHorizontal: 16,
    height: 341,
    overflow: 'hidden',
  },
  sidebar: {
    width: 116,
    paddingVertical: 0,
  },
  sidebarItem: {
    height: 29,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 5,
  },
  sidebarItemActive: {
    backgroundColor: '#e8e9f0',
  },
  sidebarText: { fontSize: 14, color: '#888fac', lineHeight: 17 },
  sidebarTextActive: { fontSize: 14, fontWeight: '700', color: '#111e58', lineHeight: 22 },
  divider: { width: 1, backgroundColor: '#f1f1f1', marginVertical: 8 },
  optionsArea: { flex: 1, paddingVertical: 4, paddingHorizontal: 12 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#888fac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: '#2541be' },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2541be',
  },
  radioLabel: { fontSize: 11, color: '#000000', lineHeight: 14 },
  actionRow: {
    flexDirection: 'row',
    gap: 15,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  clearBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#2541be',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: '#2541be', lineHeight: 22 },
  applyBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#2541be',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', lineHeight: 22 },
  homeIndicator: {
    width: 133,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#000000',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
    opacity: 0.2,
  },
  // FilterChipRow compat
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#e8e9f0' },
  chipActive: { backgroundColor: '#2541be' },
  chipText: { fontSize: 12, color: '#424b7a', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
});

export default SortFilterSheet;
