// ─── Events Tab ───────────────────────────────────────────────────────────────
// Maps to Flutter: Events tab → eventsData + EventsData model + BulkBlock deals
// Events: GetNewsDetailsApiEvent (announcements), GetNewsBulkBlockApiEvent

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { EventsData, BulkBlockData } from '../../models/AnalyticsModels';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

type Tab = 'events' | 'bulk';

const importanceColor = (importance?: string) => {
  if (importance === 'High') return COLORS.negative;
  if (importance === 'Medium') return COLORS.neutral;
  return COLORS.textMuted;
};

const EventItem: React.FC<{ item: EventsData }> = ({ item }) => (
  <View style={styles.eventCard}>
    <View style={styles.eventLeft}>
      <View
        style={[
          styles.importanceDot,
          { backgroundColor: importanceColor(item.importance) },
        ]}
      />
    </View>
    <View style={styles.eventRight}>
      <View style={styles.eventTopRow}>
        <Text style={styles.eventType}>{item.eventType}</Text>
        {item.importance && (
          <View
            style={[
              styles.importanceBadge,
              { borderColor: importanceColor(item.importance) },
            ]}
          >
            <Text
              style={[styles.importanceText, { color: importanceColor(item.importance) }]}
            >
              {item.importance}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.eventTitle}>{item.title}</Text>
      {item.description && (
        <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
      )}
      <Text style={styles.eventDate}>
        {item.eventDate
          ? new Date(item.eventDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
      </Text>
    </View>
  </View>
);

const BulkBlockItem: React.FC<{ item: BulkBlockData }> = ({ item }) => (
  <View style={styles.dealCard}>
    <View style={styles.dealHeader}>
      <View
        style={[
          styles.dealTypeBadge,
          { backgroundColor: item.dealType === 'Block' ? 'rgba(26,115,232,0.15)' : 'rgba(255,179,0,0.15)' },
        ]}
      >
        <Text
          style={[
            styles.dealTypeText,
            { color: item.dealType === 'Block' ? COLORS.primary : COLORS.neutral },
          ]}
        >
          {item.dealType ?? 'Bulk'}
        </Text>
      </View>
      <Text style={styles.dealDate}>
        {item.dealDate ? new Date(item.dealDate).toLocaleDateString('en-IN') : '—'}
      </Text>
    </View>
    <View style={styles.dealRow}>
      <View style={styles.dealParty}>
        <Text style={styles.dealPartyLabel}>Buyer</Text>
        <Text style={styles.dealPartyName}>{item.buyerName ?? '—'}</Text>
      </View>
      <Text style={styles.dealArrow}>→</Text>
      <View style={styles.dealParty}>
        <Text style={styles.dealPartyLabel}>Seller</Text>
        <Text style={styles.dealPartyName}>{item.sellerName ?? '—'}</Text>
      </View>
    </View>
    <View style={styles.dealMetrics}>
      <View style={styles.dealMetric}>
        <Text style={styles.dealMetricLabel}>Price</Text>
        <Text style={styles.dealMetricValue}>
          ₹{item.dealPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) ?? '—'}
        </Text>
      </View>
      <View style={styles.dealMetric}>
        <Text style={styles.dealMetricLabel}>Quantity</Text>
        <Text style={styles.dealMetricValue}>
          {item.dealQuantity?.toLocaleString('en-IN') ?? '—'}
        </Text>
      </View>
      {item.percentageVolume != null && (
        <View style={styles.dealMetric}>
          <Text style={styles.dealMetricLabel}>% Volume</Text>
          <Text style={styles.dealMetricValue}>{item.percentageVolume.toFixed(2)}%</Text>
        </View>
      )}
    </View>
  </View>
);

export const EventsTab: React.FC<Props> = ({ symbol }) => {
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const events = useAppSelector(s => s.getQuote.events);
  const bulkBlock = useAppSelector(s => s.getQuote.bulkBlockDeals);
  const eventsLoading = useAppSelector(s => s.getQuote.eventsLoading);
  const bulkLoading = useAppSelector(s => s.getQuote.bulkBlockLoading);

  const isLoading = activeTab === 'events' ? eventsLoading : bulkLoading;

  return (
    <View style={styles.container}>
      {/* Sub-tabs */}
      <View style={styles.subTabs}>
        {(['events', 'bulk'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTab, activeTab === tab && styles.subTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.subTabText, activeTab === tab && styles.subTabTextActive]}
            >
              {tab === 'events' ? 'Events & Announcements' : 'Bulk & Block Deals'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : activeTab === 'events' ? (
        <FlatList
          data={events}
          keyExtractor={(item, i) => item.eventId ?? `ev_${i}`}
          renderItem={({ item }) => <EventItem item={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No events for {symbol}</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={bulkBlock}
          keyExtractor={(item, i) => item.dealId ?? `deal_${i}`}
          renderItem={({ item }) => <BulkBlockItem item={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No bulk/block deals found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  subTabs: { flexDirection: 'row', backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  subTab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  subTabText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  subTabTextActive: { color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  listContent: { paddingBottom: SPACING.xl },
  eventCard: {
    flexDirection: 'row',
    padding: SPACING.base,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.sm,
  },
  eventLeft: { paddingTop: 4 },
  importanceDot: { width: 8, height: 8, borderRadius: 4 },
  eventRight: { flex: 1 },
  eventTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eventType: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  importanceBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  importanceText: { fontSize: FONT_SIZE.xs },
  eventTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, marginBottom: 2 },
  eventDesc: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, lineHeight: 16, marginBottom: 4 },
  eventDate: { color: COLORS.primary, fontSize: FONT_SIZE.xs },
  dealCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    margin: SPACING.base,
    marginBottom: 0,
  },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  dealTypeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  dealTypeText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  dealDate: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  dealRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  dealParty: { flex: 1 },
  dealPartyLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  dealPartyName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  dealArrow: { color: COLORS.textMuted, fontSize: FONT_SIZE.lg, marginHorizontal: SPACING.sm },
  dealMetrics: { flexDirection: 'row', gap: SPACING.sm },
  dealMetric: { flex: 1 },
  dealMetricLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  dealMetricValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: 60 },
  loadingText: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: SPACING.sm },
  emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZE.base, textAlign: 'center' },
});
