// ─── Future Tab ───────────────────────────────────────────────────────────────
// Maps to Flutter: widgets/future/ — futures contracts display
// Event: GetQuoteFutureOptionApiEvent (futures part)

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector, selectFutures, selectStreaming } from '../../store/hooks';
import { FuturesData } from '../../api/FnoRepository';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

const FuturesCard: React.FC<{ item: FuturesData }> = ({ item }) => {
  const chgColor = item.changePercent >= 0 ? COLORS.positive : COLORS.negative;
  const sign = item.changePercent >= 0 ? '+' : '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.expiry}>Expiry: {item.expiryDate}</Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.ltp}>₹{item.ltp.toFixed(2)}</Text>
          <Text style={[styles.change, { color: chgColor }]}>
            {sign}{item.change.toFixed(2)} ({sign}{item.changePercent.toFixed(2)}%)
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.metricsGrid}>
        {[
          { label: 'OI', value: item.openInterest.toLocaleString('en-IN') },
          { label: 'Chg OI', value: item.changeOI > 0 ? `+${item.changeOI.toLocaleString('en-IN')}` : item.changeOI.toLocaleString('en-IN'), color: item.changeOI >= 0 ? COLORS.positive : COLORS.negative },
          { label: 'Volume', value: item.volume.toLocaleString('en-IN') },
          { label: 'Lot Size', value: item.lotSize.toString() },
          { label: 'Bid', value: `₹${item.bid.toFixed(2)}` },
          { label: 'Ask', value: `₹${item.ask.toFixed(2)}` },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.metric}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.premiumRow}>
        <Text style={styles.premiumLabel}>Futures Premium</Text>
        <Text style={[styles.premiumValue, { color: item.premium >= 0 ? COLORS.positive : COLORS.negative }]}>
          {item.premium >= 0 ? '+' : ''}₹{item.premium.toFixed(2)}
        </Text>
      </View>
    </View>
  );
};

export const FutureTab: React.FC<Props> = ({ symbol }) => {
  const futures = useAppSelector(selectFutures);
  const loading = useAppSelector(s => s.getQuote.fnoLoading);
  const streaming = useAppSelector(selectStreaming);

  return (
    <View style={styles.container}>
      {/* Spot price header */}
      <View style={styles.spotHeader}>
        <Text style={styles.spotLabel}>{symbol} Spot Price</Text>
        <Text style={styles.spotLtp}>₹{streaming.ltp?.toFixed(2) ?? '—'}</Text>
        <Text style={[styles.spotChange, { color: (streaming.percentChange ?? 0) >= 0 ? COLORS.positive : COLORS.negative }]}>
          {(streaming.percentChange ?? 0) >= 0 ? '+' : ''}{streaming.percentChange?.toFixed(2) ?? '—'}%
        </Text>
      </View>

      {loading && futures.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading futures data…</Text>
        </View>
      ) : (
        <FlatList
          data={futures}
          keyExtractor={(_, i) => `future_${i}`}
          renderItem={({ item }) => <FuturesCard item={item as FuturesData} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No futures data available for {symbol}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: SPACING.sm,
  },
  spotLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, flex: 1 },
  spotLtp: { color: COLORS.textPrimary, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  spotChange: { fontSize: FONT_SIZE.sm },
  listContent: { padding: SPACING.base, paddingBottom: SPACING.xl, gap: SPACING.sm },
  card: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  symbol: { color: COLORS.textPrimary, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.bold },
  expiry: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  priceBlock: { alignItems: 'flex-end' },
  ltp: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  change: { fontSize: FONT_SIZE.xs },
  divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.sm },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  metric: { width: '30%', marginBottom: SPACING.xs },
  metricLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  metricValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  premiumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  premiumLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  premiumValue: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: 60 },
  loadingText: { color: COLORS.textMuted, marginTop: SPACING.sm },
  emptyText: { color: COLORS.textMuted, textAlign: 'center' },
});
