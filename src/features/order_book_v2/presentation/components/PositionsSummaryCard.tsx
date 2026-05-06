// Component: PositionsSummaryCard
// Source: positions_summary_card.dart
// Shows total P&L summary at top of Positions screen

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PositionsSummary } from '../../domain/entities/Position';

interface Props {
  summary: PositionsSummary;
}

const PositionsSummaryCard: React.FC<Props> = ({ summary }) => {
  const isProfit = summary.totalPnl >= 0;
  const pnlPercent =
    summary.totalInvested > 0
      ? ((summary.totalPnl / summary.totalInvested) * 100).toFixed(2)
      : '0.00';

  return (
    <View style={styles.card}>
      {/* P&L Row */}
      <View style={styles.pnlRow}>
        <View>
          <Text style={styles.pnlLabel}>Total P&L</Text>
          <Text style={[styles.pnlValue, isProfit ? styles.profitText : styles.lossText]}>
            {isProfit ? '+' : ''}₹{summary.totalPnl.toFixed(2)}
          </Text>
        </View>
        <View style={styles.rightBlock}>
          <Text style={[styles.pnlPct, isProfit ? styles.profitText : styles.lossText]}>
            {isProfit ? '+' : ''}{pnlPercent}%
          </Text>
          <Text style={styles.dayPnlLabel}>
            Day P&L:{' '}
            <Text style={summary.dayPnl >= 0 ? styles.profitText : styles.lossText}>
              ₹{summary.dayPnl.toFixed(2)}
            </Text>
          </Text>
        </View>
      </View>

      {/* Invested / Current Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Invested</Text>
          <Text style={styles.metricValue}>₹{summary.totalInvested.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Current</Text>
          <Text style={styles.metricValue}>₹{summary.totalCurrent.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pnlLabel: { fontSize: 12, color: '#888888', marginBottom: 4 },
  pnlValue: { fontSize: 22, fontWeight: '700' },
  profitText: { color: '#009900' },
  lossText: { color: '#CC0000' },

  rightBlock: { alignItems: 'flex-end' },
  pnlPct: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  dayPnlLabel: { fontSize: 12, color: '#888888' },

  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricBlock: { flex: 1, alignItems: 'center' },
  metricLabel: { fontSize: 11, color: '#AAAAAA', marginBottom: 2 },
  metricValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 8,
  },
});

export default PositionsSummaryCard;
