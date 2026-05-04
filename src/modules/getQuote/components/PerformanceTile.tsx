// ─── Performance Tile ─────────────────────────────────────────────────────────
// Maps to Flutter: widgets/performance_tile.dart
// Shows OHLC, circuit limits, volume, ATP, 52W high/low, market cap, etc.

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppSelector, selectStreaming } from '../store/hooks';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../constants/UIConstants';

const MetricRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor,
}) => (
  <View style={styles.metricRow}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, valueColor ? { color: valueColor } : undefined]}>
      {value}
    </Text>
  </View>
);

const fmt = (n?: number, decimals = 2) =>
  n != null ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}` : '—';

const fmtNum = (n?: number) =>
  n != null ? n.toLocaleString('en-IN') : '—';

const fmtCr = (n?: number) =>
  n != null ? `₹${(n / 100).toFixed(2)} Cr` : '—';

export const PerformanceTile: React.FC = () => {
  const s = useAppSelector(selectStreaming);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quote Details</Text>

      {/* Day Range Bar */}
      {s.dayLow != null && s.dayHigh != null && s.ltp != null && (
        <View style={styles.rangeSection}>
          <View style={styles.rangeRow}>
            <Text style={[styles.rangeVal, { color: COLORS.negative }]}>{fmt(s.dayLow)}</Text>
            <Text style={styles.rangeLabel}>Day Range</Text>
            <Text style={[styles.rangeVal, { color: COLORS.positive }]}>{fmt(s.dayHigh)}</Text>
          </View>
          <View style={styles.rangeBar}>
            <View
              style={[
                styles.rangeFill,
                {
                  left: `${((s.dayLow - s.dayLow) / (s.dayHigh - s.dayLow)) * 100}%` as unknown as number,
                  width: `${Math.min(100, Math.max(0, ((s.ltp - s.dayLow) / (s.dayHigh - s.dayLow)) * 100))}%` as unknown as number,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* 52-Week Range */}
      {s.nse52Low != null && s.nse52High != null && (
        <View style={styles.rangeSection}>
          <View style={styles.rangeRow}>
            <Text style={[styles.rangeVal, { color: COLORS.negative }]}>{fmt(s.nse52Low)}</Text>
            <Text style={styles.rangeLabel}>52W Range</Text>
            <Text style={[styles.rangeVal, { color: COLORS.positive }]}>{fmt(s.nse52High)}</Text>
          </View>
        </View>
      )}

      <View style={styles.grid}>
        <View style={styles.gridCol}>
          <MetricRow label="Open" value={fmt(s.openPrice)} />
          <MetricRow label="Prev. Close" value={fmt(s.prevClose)} />
          <MetricRow label="ATP" value={fmt(s.atp)} />
          <MetricRow label="LTQ" value={fmtNum(s.ltq)} />
          <MetricRow label="Volume" value={fmtNum(s.volume)} />
          <MetricRow label="Lower Circuit" value={fmt(s.lowerCircuitLimit)} valueColor={COLORS.negative} />
          <MetricRow label="Upper Circuit" value={fmt(s.upperCircuitLimit)} valueColor={COLORS.positive} />
        </View>
        <View style={styles.gridDivider} />
        <View style={styles.gridCol}>
          <MetricRow label="Face Value" value={fmt(s.faceValue)} />
          <MetricRow label="P/E Ratio" value={s.peRatio?.toFixed(2) ?? '—'} />
          <MetricRow label="P/B Ratio" value={s.pb?.toFixed(2) ?? '—'} />
          <MetricRow label="EPS" value={s.eps?.toFixed(2) ?? '—'} />
          <MetricRow label="ROE" value={s.roe != null ? `${s.roe.toFixed(2)}%` : '—'} />
          <MetricRow label="Div %" value={s.divPercentage != null ? `${s.divPercentage.toFixed(0)}%` : '—'} valueColor={COLORS.positive} />
          <MetricRow label="Mkt Cap" value={s.nseMcap != null ? fmtCr(s.nseMcap) : '—'} />
        </View>
      </View>

      {/* ISIN */}
      {s.isin && (
        <View style={styles.isinRow}>
          <Text style={styles.metricLabel}>ISIN</Text>
          <Text style={styles.isinValue}>{s.isin}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    marginBottom: SPACING.sm,
  },
  rangeSection: {
    marginBottom: SPACING.sm,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rangeVal: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  rangeLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  rangeBar: {
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  rangeFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  grid: {
    flexDirection: 'row',
  },
  gridCol: {
    flex: 1,
  },
  gridDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
    marginHorizontal: SPACING.sm,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    flex: 1,
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    textAlign: 'right',
  },
  isinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: SPACING.xs,
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  isinValue: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: 'monospace',
  },
});
