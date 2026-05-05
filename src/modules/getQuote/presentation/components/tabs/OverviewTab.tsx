// OverviewTab — main overview with key stats, performance, resistance/support
// Converted from Flutter OverviewWidget + QuoteKeyStatsRow + ResistanceSupportView

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../styles/tokens';
import { PerformanceTile } from '../PerformanceTile';
import type { QuoteEntity } from '../../../domain/entities/QuoteEntity';
import type { BarChartEntity } from '../../../domain/entities/BarChartEntity';
import type { ExpertTipEntity } from '../../../domain/entities/ExpertTipEntity';
import type { ResistanceSupportEntity } from '../../../domain/entities/ResistanceSupportEntity';
import type { KeyStatsEntity } from '../../../domain/entities/KeyStatsEntity';
import type { ChartType, ChartInterval } from '../../../state/getQuoteSlice';

interface Props {
  quoteData: QuoteEntity | null;
  performanceData: BarChartEntity[];
  isLoadingPerformance: boolean;
  expertTips: ExpertTipEntity[];
  resistanceSupport: ResistanceSupportEntity[];
  keyStats: KeyStatsEntity[];
  selectedChartType: ChartType;
  selectedChartInterval: ChartInterval;
  onChartTypeChange: (type: ChartType) => void;
  onChartIntervalChange: (interval: ChartInterval) => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const CHART_INTERVALS: ChartInterval[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];

export function OverviewTab({
  quoteData,
  performanceData,
  isLoadingPerformance,
  expertTips,
  resistanceSupport,
  keyStats,
  selectedChartType,
  selectedChartInterval,
  onChartTypeChange,
  onChartIntervalChange,
}: Props) {
  if (!quoteData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const isPositive = (quoteData.isPositiveChange ?? 'NO') === 'YES';
  const changeColor = isPositive ? colors.positive : colors.negative;

  // Key stats rows (price info)
  const priceStats = [
    { label: 'Open', value: `₹${(quoteData.open ?? 0).toFixed(2)}` },
    { label: 'Close', value: `₹${(quoteData.close ?? 0).toFixed(2)}` },
    { label: 'Day High', value: `₹${(quoteData.dayhigh ?? 0).toFixed(2)}` },
    { label: 'Day Low', value: `₹${(quoteData.daylow ?? 0).toFixed(2)}` },
    { label: '52W High', value: `₹${(quoteData.nse52high ?? quoteData.bse52high ?? 0).toFixed(2)}` },
    { label: '52W Low', value: `₹${(quoteData.nse52low ?? quoteData.bse52low ?? 0).toFixed(2)}` },
    { label: 'Volume', value: (quoteData.volume ?? 0).toLocaleString('en-IN') },
    { label: 'Avg Volume', value: (quoteData.averagetradedprice ?? 0).toFixed(2) },
  ];

  const fundamentalStats = [
    { label: 'P/E', value: (quoteData.peratio ?? 0).toFixed(2) },
    { label: 'P/B', value: (quoteData.pb ?? 0).toFixed(2) },
    { label: 'EPS', value: (quoteData.eps ?? 0).toFixed(2) },
    { label: 'ROE (%)', value: (quoteData.roe ?? 0).toFixed(2) },
    {
      label: 'Mkt Cap',
      value: quoteData.nsemcap != null
        ? `₹${quoteData.nsemcap.toLocaleString('en-IN')} Cr`
        : quoteData.bsemcap != null
          ? `₹${quoteData.bsemcap.toLocaleString('en-IN')} Cr`
          : 'N/A',
    },
    { label: 'Sector', value: quoteData.sectorname ?? 'N/A' },
    { label: 'Face Value', value: `₹${(quoteData.facevalue ?? 0).toFixed(2)}` },
    { label: 'Div Yield', value: quoteData.divyield != null ? `${quoteData.divyield}%` : 'N/A' },
  ];

  const safeExpertTips = expertTips ?? [];
  const safeResistanceSupport = resistanceSupport ?? [];
  const safeKeyStats = keyStats ?? [];
  const pivotLevels = safeResistanceSupport.filter(
    r => ['R1', 'R2', 'R3', 'S1', 'S2', 'S3', 'Pivot'].includes(r.type),
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Circuit Limits */}
      {(quoteData.lowercircuitelimit != null || quoteData.uppercircuitelimit != null) && (
        <View style={styles.circuitRow}>
          <Text style={styles.circuitLabel}>Lower Circuit</Text>
          <Text style={[styles.circuitValue, { color: colors.negative }]}>
            ₹{(quoteData.lowercircuitelimit ?? 0).toFixed(2)}
          </Text>
          <Text style={styles.circuitLabel}>Upper Circuit</Text>
          <Text style={[styles.circuitValue, { color: colors.positive }]}>
            ₹{(quoteData.uppercircuitelimit ?? 0).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Performance Chart */}
      <SectionHeader title="Performance" />
      <View style={styles.intervalRow}>
        {CHART_INTERVALS.map(interval => (
          <TouchableOpacity
            key={interval}
            onPress={() => onChartIntervalChange(interval)}
            style={[
              styles.intervalButton,
              selectedChartInterval === interval && styles.intervalButtonActive,
            ]}
            accessibilityLabel={`Chart interval ${interval}`}
          >
            <Text
              style={[
                styles.intervalText,
                selectedChartInterval === interval && styles.intervalTextActive,
              ]}
            >
              {interval}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <PerformanceTile data={performanceData} isLoading={isLoadingPerformance} />

      {/* Price Stats */}
      <SectionHeader title="Price Info" />
      <View style={styles.statsCard}>
        {priceStats.map(stat => (
          <StatRow key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </View>

      {/* Fundamentals */}
      <SectionHeader title="Fundamentals" />
      <View style={styles.statsCard}>
        {fundamentalStats.map(stat => (
          <StatRow key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </View>

      {/* Custom Key Stats from API */}
      {safeKeyStats.length > 0 && (
        <>
          <SectionHeader title="Key Stats" />
          <View style={styles.statsCard}>
            {safeKeyStats.map((stat, i) => (
              <StatRow key={`ks-${i}`} label={stat.label} value={stat.value} />
            ))}
          </View>
        </>
      )}

      {/* Resistance / Support */}
      {pivotLevels.length > 0 && (
        <>
          <SectionHeader title="Resistance & Support" />
          <View style={styles.statsCard}>
            {pivotLevels.map((level, i) => (
              <StatRow
                key={`rs-${i}`}
                label={level.type}
                value={((level.value ?? 0) as number).toFixed(2)}
              />
            ))}
          </View>
        </>
      )}

      {/* Expert Tips */}
      {safeExpertTips.length > 0 && (
        <>
          <SectionHeader title="Expert Tips" />
          {safeExpertTips.map((tip, i) => (
            <View key={`tip-${i}`} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipExpert}>{tip.expert} · {tip.category}</Text>
              <Text style={styles.tipContent} numberOfLines={3}>{tip.content}</Text>
            </View>
          ))}
        </>
      )}

      {/* Bottom padding */}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: colors.textSecondary, fontSize: typography.body, fontFamily: fonts.regular },
  circuitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFF8E1',
    marginBottom: spacing.xs,
  },
  circuitLabel: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary },
  circuitValue: { fontSize: typography.small, fontFamily: fonts.medium },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
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
  intervalRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  intervalButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    backgroundColor: colors.surface,
  },
  intervalButtonActive: {
    borderColor: colors.positive,
    backgroundColor: '#E8F5E9',
  },
  intervalText: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  intervalTextActive: {
    color: colors.positive,
    fontFamily: fonts.medium,
  },
  tipCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 8,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tipTitle: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tipExpert: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  tipContent: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  bottomPad: { height: 24 },
});
