// Component: StockSipTab
// Source: stock_sip_tab_widget.dart / sip_list_widget.dart
// Shows SIP list with status filter, date range, search, and row actions

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl
} from 'react-native';
import type { StockSipData } from '../../domain/entities/StockSip';

interface Props {
  sips: StockSipData[];
  refreshing: boolean;
  onRefresh: () => void;
  onViewSip: (sip: StockSipData) => void;
  onViewTrail: (sip: StockSipData) => void;
  onViewChildren: (sip: StockSipData) => void;
}

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'PAUSED', 'CANCELLED'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const StockSipTab: React.FC<Props> = ({
  sips,
  refreshing,
  onRefresh,
  onViewSip,
  onViewTrail,
  onViewChildren,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const filtered = sips.filter((s) => {
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchSearch =
      search.length === 0 ||
      s.basketName?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const renderItem = useCallback(
    ({ item }: { item: StockSipData }) => (
      <SipRow
        sip={item}
        onViewSip={() => onViewSip(item)}
        onViewTrail={() => onViewTrail(item)}
        onViewChildren={() => onViewChildren(item)}
      />
    ),
    [onViewSip, onViewTrail, onViewChildren]
  );

  return (
    <View style={styles.container}>
      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((sf) => (
          <TouchableOpacity
            key={sf}
            style={[styles.filterChip, statusFilter === sf && styles.filterChipActive]}
            onPress={() => setStatusFilter(sf)}
            accessibilityLabel={`Filter by ${sf}`}
          >
            <Text style={[styles.filterChipText, statusFilter === sf && styles.filterChipTextActive]}>
              {sf}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search SIP by symbol..."
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          accessibilityLabel="Search SIPs"
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No SIPs found</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.sipReferenceNumber}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const SipRow: React.FC<{
  sip: StockSipData;
  onViewSip: () => void;
  onViewTrail: () => void;
  onViewChildren: () => void;
}> = ({ sip, onViewSip, onViewTrail, onViewChildren }) => {
  const symbolName = sip.basketName ?? sip.sipReferenceNumber;

  const statusColors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: '#D4EDDA', text: '#155724' },
    PAUSED: { bg: '#FFF3CD', text: '#856404' },
    CANCELLED: { bg: '#F8D7DA', text: '#721C24' },
  };
  const colors = statusColors[sip.status] ?? { bg: '#E8E8E8', text: '#444444' };

  return (
    <TouchableOpacity
      style={styles.sipCard}
      onPress={onViewSip}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${symbolName} SIP`}
    >
      <View style={styles.sipTopRow}>
        <Text style={styles.sipSymbol}>{symbolName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{sip.status}</Text>
        </View>
      </View>
      <Text style={styles.sipMeta}>
        {sip.frequency ?? '—'} · ₹{sip.amount?.toFixed(0) ?? '—'} per installment
      </Text>
      <View style={styles.sipActionRow}>
        <TouchableOpacity style={styles.actionChip} onPress={onViewTrail}>
          <Text style={styles.actionChipText}>Trail</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={onViewChildren}>
          <Text style={styles.actionChipText}>Children</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={onViewSip}>
          <Text style={styles.actionChipText}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
  },
  filterChipActive: { backgroundColor: '#0066CC' },
  filterChipText: { fontSize: 12, color: '#666666', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },

  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  searchInput: {
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },

  listContent: { paddingBottom: 16, paddingTop: 4 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  emptyText: { fontSize: 15, color: '#999999' },

  sipCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sipTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sipSymbol: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  sipMeta: { fontSize: 12, color: '#888888', marginBottom: 8 },
  sipActionRow: { flexDirection: 'row', gap: 6 },
  actionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: '#F0F6FF',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  actionChipText: { fontSize: 11, color: '#0066CC', fontWeight: '600' },
});

export default StockSipTab;
