// ─── Overview Tab ─────────────────────────────────────────────────────────────
// Maps to Flutter: Tab 1 — Overview content in GetQuoteDetailsScreen
// Contains: chart widget, performance tile, market depth, resistance/support

import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/UIConstants';
import { ChartWidget } from '../../components/widgets/ChartWidget';
import { MarketDepthWidget } from '../../components/MarketDepthWidget';
import { PerformanceTile } from '../../components/PerformanceTile';
import { useAppSelector } from '../../store/hooks';

interface Props { symbol: string; }

export const OverviewTab: React.FC<Props> = ({ symbol }) => {
  const resistanceSupport = useAppSelector(s => s.getQuote.resistanceSupport);
  const expertTips = useAppSelector(s => s.getQuote.expertTips);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Interactive Chart */}
      <ChartWidget symbol={symbol} />

      {/* Performance / Quote Details */}
      <PerformanceTile />

      {/* Market Depth (Bid/Ask Order Book) */}
      <MarketDepthWidget />

      {/* Resistance & Support */}
      {resistanceSupport.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resistance & Support</Text>
          {resistanceSupport.map((level, i) => (
            <View key={i} style={styles.rsRow}>
              <View
                style={[
                  styles.rsTypeBadge,
                  {
                    backgroundColor:
                      level.type?.startsWith('R')
                        ? 'rgba(255,68,68,0.15)'
                        : level.type === 'Pivot'
                        ? 'rgba(26,115,232,0.15)'
                        : 'rgba(0,200,81,0.15)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rsType,
                    {
                      color:
                        level.type?.startsWith('R')
                          ? COLORS.negative
                          : level.type === 'Pivot'
                          ? COLORS.primary
                          : COLORS.positive,
                    },
                  ]}
                >
                  {level.type}
                </Text>
              </View>
              <Text style={styles.rsLevel}>₹{level.level?.toFixed(2) ?? '—'}</Text>
              {level.strength != null && (
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthFill, { width: `${level.strength}%` }]} />
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Expert Tips */}
      {expertTips.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expert Recommendations</Text>
          {expertTips.slice(0, 3).map((tip, i) => (
            <View key={i} style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                {tip.action && (
                  <View
                    style={[
                      styles.actionBadge,
                      {
                        backgroundColor:
                          tip.action === 'BUY'
                            ? 'rgba(0,200,81,0.2)'
                            : tip.action === 'SELL'
                            ? 'rgba(255,68,68,0.2)'
                            : 'rgba(255,179,0,0.2)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color:
                            tip.action === 'BUY'
                              ? COLORS.positive
                              : tip.action === 'SELL'
                              ? COLORS.negative
                              : COLORS.neutral,
                        },
                      ]}
                    >
                      {tip.action}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.tipExpert}>{tip.expert}</Text>
              {tip.targetPrice != null && (
                <Text style={styles.tipTarget}>
                  Target: <Text style={{ color: COLORS.positive }}>₹{tip.targetPrice.toFixed(2)}</Text>
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    marginBottom: SPACING.sm,
  },
  rsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  rsTypeBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 48,
    alignItems: 'center',
  },
  rsType: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  rsLevel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    flex: 1,
  },
  strengthBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  tipCard: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  tipTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    flex: 1,
    marginRight: SPACING.sm,
  },
  actionBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  actionText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  tipExpert: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  tipTarget: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
});
