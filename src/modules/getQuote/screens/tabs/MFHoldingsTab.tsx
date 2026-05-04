// ─── MF Holdings Tab ─────────────────────────────────────────────────────────
// Maps to Flutter: widgets/mf_holdings/presentation/views/mf_holdings_ui.dart

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector, selectMFHoldings } from '../../store/hooks';
import { MfHoldingData } from '../../models/AnalyticsModels';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

const MFCard: React.FC<{ item: MfHoldingData; index: number }> = ({ item, index }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      <View style={styles.fundInfo}>
        <Text style={styles.fundName} numberOfLines={1}>{item.fundName}</Text>
        <Text style={styles.schemeName} numberOfLines={2}>{item.schemeName}</Text>
      </View>
    </View>

    <View style={styles.metricsRow}>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Value</Text>
        <Text style={styles.metricValue}>
          ₹{item.value != null ? (item.value / 100).toFixed(2) : '—'} Cr
        </Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>Units</Text>
        <Text style={styles.metricValue}>
          {item.units?.toLocaleString('en-IN') ?? '—'}
        </Text>
      </View>
      <View style={styles.metric}>
        <Text style={styles.metricLabel}>% of NAV</Text>
        <Text style={styles.metricValue}>
          {item.percentageOfNav?.toFixed(2) ?? '—'}%
        </Text>
      </View>
    </View>

    {item.changeInUnits != null && (
      <View style={styles.changeRow}>
        <Text style={styles.changeLabel}>Change in Units</Text>
        <Text
          style={[
            styles.changeValue,
            { color: item.changeInUnits >= 0 ? COLORS.positive : COLORS.negative },
          ]}
        >
          {item.changeInUnits >= 0 ? '+' : ''}{item.changeInUnits.toLocaleString('en-IN')}
        </Text>
      </View>
    )}

    {item.holdingDate && (
      <Text style={styles.dateText}>
        As of {new Date(item.holdingDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
      </Text>
    )}
  </View>
);

export const MFHoldingsTab: React.FC<Props> = ({ symbol }) => {
  const holdings = useAppSelector(selectMFHoldings);
  const loading = useAppSelector(s => s.getQuote.mfHoldingsLoading);

  if (loading && holdings.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading MF holdings…</Text>
      </View>
    );
  }

  // Summary stats
  const totalValue = holdings.reduce((sum, h) => sum + (h.value ?? 0), 0);

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.summaryLabel}>Funds Holding</Text>
          <Text style={styles.summaryValue}>{holdings.length}</Text>
        </View>
        <View>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>₹{(totalValue / 100).toFixed(0)} Cr</Text>
        </View>
      </View>

      <FlatList
        data={holdings}
        keyExtractor={(item, i) => `${item.fundName ?? ''}${i}`}
        renderItem={({ item, index }) => <MFCard item={item} index={index} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No MF holdings data for {symbol}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  summaryLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, textAlign: 'center' },
  summaryValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, textAlign: 'center', marginTop: 2 },
  listContent: { padding: SPACING.base, paddingBottom: SPACING.xl, gap: SPACING.sm },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  rankBadge: {
    backgroundColor: 'rgba(26,115,232,0.15)',
    borderRadius: 4,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  fundInfo: { flex: 1 },
  fundName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold },
  schemeName: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.divider,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
    marginVertical: SPACING.xs,
  },
  metric: { alignItems: 'center', flex: 1 },
  metricLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  metricValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, marginTop: 2 },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  changeLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  changeValue: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  dateText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 4, textAlign: 'right' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: 60 },
  loadingText: { color: COLORS.textMuted, marginTop: SPACING.sm },
  emptyText: { color: COLORS.textMuted, textAlign: 'center' },
});
