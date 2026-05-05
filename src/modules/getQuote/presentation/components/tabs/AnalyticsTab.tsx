// AnalyticsTab — key stats, OI charts, delivery data
// Converted from Flutter AnalyticsWidget

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../styles/tokens';
import type { KeyStatsEntity } from '../../../domain/entities/KeyStatsEntity';
import type { ResistanceSupportEntity } from '../../../domain/entities/ResistanceSupportEntity';

interface Props {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  keyStats: KeyStatsEntity[];
  resistanceSupport: ResistanceSupportEntity[];
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function AnalyticsTab({ symbol, exchange, keyStats, resistanceSupport }: Props) {
  // Separate custom key stats by type
  const valuation = keyStats.filter(s => s.type === 'valuation');
  const delivery = keyStats.filter(s => s.type === 'delivery');
  const other = keyStats.filter(s => !['valuation', 'delivery'].includes(s.type ?? ''));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>{symbol} · {exchange} Analytics</Text>

      {/* Valuation Metrics */}
      {valuation.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Valuation</Text>
          {valuation.map((s, i) => <StatItem key={i} label={s.label} value={s.value} />)}
        </View>
      )}

      {/* Delivery Data */}
      {delivery.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery</Text>
          {delivery.map((s, i) => <StatItem key={i} label={s.label} value={s.value} />)}
        </View>
      )}

      {/* Other Stats */}
      {other.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Key Metrics</Text>
          {other.map((s, i) => <StatItem key={i} label={s.label} value={s.value} />)}
        </View>
      )}

      {keyStats.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No analytics data available</Text>
        </View>
      )}

      {/* Pivot + Levels Summary */}
      {resistanceSupport.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pivot Summary</Text>
          {resistanceSupport.map((r, i) => (
            <StatItem
              key={i}
              label={r.type}
              value={`₹${(r.value ?? 0).toFixed(2)}`}
            />
          ))}
        </View>
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: spacing.md },
  header: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardTitle: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statLabel: { fontSize: typography.body, fontFamily: fonts.regular, color: colors.textSecondary },
  statValue: { fontSize: typography.body, fontFamily: fonts.medium, color: colors.textPrimary },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: colors.textSecondary, fontSize: typography.body, fontFamily: fonts.regular },
});
