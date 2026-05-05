// PerformanceTile Component
// Converted from Flutter PerformanceTile + BarChartGraph
// community_charts_flutter/syncfusion → simple bar chart using View widths
// react-native-chart-kit would be preferred; using pure RN for zero-dependency build

import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, spacing, typography } from './styles/tokens';
import type { BarChartEntity } from '../../domain/entities/BarChartEntity';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  data: BarChartEntity[];
  isLoading: boolean;
}

export function PerformanceTile({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.positive} />
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No data available. Please try again later.</Text>
      </View>
    );
  }

  // Find max absolute performance for bar width scaling
  const performances = data.map(d => Math.abs(parseFloat(d.performance ?? '0')));
  const maxPerf = Math.max(...performances, 1);
  const maxBarWidth = SCREEN_WIDTH - 120;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance</Text>
      {data.map((item, index) => {
        const perf = parseFloat(item.performance ?? '0');
        const isPositive = perf >= 0;
        const barColor = isPositive ? colors.positive : colors.negative;
        const barWidth = (Math.abs(perf) / maxPerf) * maxBarWidth;

        return (
          <View key={`bar-${index}`} style={styles.barRow}>
            <Text style={styles.durationLabel}>{item.duration}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { width: barWidth, backgroundColor: barColor }]} />
            </View>
            <Text style={[styles.perfValue, { color: barColor }]}>
              {isPositive ? '+' : ''}{perf.toFixed(2)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 60,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noDataText: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  durationLabel: {
    width: 36,
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  perfValue: {
    width: 60,
    fontSize: typography.small,
    fontFamily: fonts.medium,
    textAlign: 'right',
  },
});
