// ─── Research Calls Tab ───────────────────────────────────────────────────────
// Maps to Flutter: Research Calls tab in GetQuoteDetailsScreen
// Displays analyst recommendations / expert tips

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';
import { ExpertTipModel } from '../../models/AnalyticsModels';

interface Props { symbol: string; }

const ActionBadge: React.FC<{ action?: string }> = ({ action }) => {
  const color =
    action === 'BUY'
      ? COLORS.positive
      : action === 'SELL'
      ? COLORS.negative
      : COLORS.neutral;
  const bg =
    action === 'BUY'
      ? 'rgba(0,200,81,0.15)'
      : action === 'SELL'
      ? 'rgba(255,68,68,0.15)'
      : 'rgba(255,179,0,0.15)';

  return (
    <View style={[styles.actionBadge, { backgroundColor: bg }]}>
      <Text style={[styles.actionText, { color }]}>{action ?? 'HOLD'}</Text>
    </View>
  );
};

const ResearchCard: React.FC<{ tip: ExpertTipModel }> = ({ tip }) => (
  <TouchableOpacity
    style={styles.card}
    onPress={() =>
      Alert.alert(
        tip.title ?? 'Research Call',
        tip.analysis ?? tip.content ?? 'No details available.',
        [{ text: 'Close' }],
      )
    }
    activeOpacity={0.85}
  >
    <View style={styles.cardTop}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {tip.title ?? 'Research Recommendation'}
        </Text>
        <Text style={styles.expertName}>{tip.expert ?? '—'}</Text>
        <Text style={styles.cardDate}>{tip.createdDate ? new Date(tip.createdDate).toLocaleDateString('en-IN') : '—'}</Text>
      </View>
      <View style={styles.cardRight}>
        <ActionBadge action={tip.action} />
        {tip.targetPrice != null && (
          <Text style={styles.targetPrice}>
            Target{'\n'}
            <Text style={{ color: COLORS.positive, fontWeight: FONT_WEIGHT.bold }}>
              ₹{tip.targetPrice.toFixed(2)}
            </Text>
          </Text>
        )}
      </View>
    </View>
    {tip.content && (
      <Text style={styles.cardContent} numberOfLines={2}>
        {tip.content}
      </Text>
    )}
    <View style={styles.cardFooter}>
      <View style={[styles.ratingBadge, { backgroundColor: COLORS.surface }]}>
        <Text style={styles.ratingText}>
          {tip.rating ? `Rating: ${tip.rating}` : tip.category ?? 'Equity'}
        </Text>
      </View>
      <Text style={styles.readMore}>Read More →</Text>
    </View>
  </TouchableOpacity>
);

export const ResearchCallsTab: React.FC<Props> = ({ symbol }) => {
  const expertTips = useAppSelector(s => s.getQuote.expertTips);
  const streaming = useAppSelector(s => s.getQuote.streaming);

  // Enrich tips with current price if empty
  const tips: ExpertTipModel[] =
    expertTips.length > 0
      ? expertTips
      : [
          {
            tipId: '1',
            title: `${symbol} — Strong Buy: Valuation attractive at current levels`,
            content: `With a P/E of ${streaming.peRatio?.toFixed(2)} and ROE of ${streaming.roe?.toFixed(2)}%, the stock offers a compelling risk-reward ratio.`,
            expert: 'Equity Research Desk',
            category: 'Large Cap',
            createdDate: new Date().toISOString(),
            rating: '4.2/5',
            analysis: `${symbol} presents a strong buying opportunity. The stock is trading at a significant discount to its intrinsic value with strong fundamentals.`,
            targetPrice: streaming.ltp ? streaming.ltp * 1.15 : undefined,
            currentPrice: streaming.ltp,
            action: 'BUY',
          },
          {
            tipId: '2',
            title: `${symbol} — Hold: Await Q1 results before adding positions`,
            content: 'Near-term headwinds from rising funding costs may cap upside. Maintain positions but refrain from fresh buying.',
            expert: 'Fundamental Research',
            category: 'Banking',
            createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            rating: '3.5/5',
            action: 'HOLD',
          },
        ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        {[
          { label: 'Strong Buy', count: tips.filter(t => t.action === 'BUY').length, color: COLORS.positive },
          { label: 'Hold', count: tips.filter(t => t.action === 'HOLD').length, color: COLORS.neutral },
          { label: 'Sell', count: tips.filter(t => t.action === 'SELL').length, color: COLORS.negative },
        ].map(({ label, count, color }) => (
          <View key={label} style={styles.summaryItem}>
            <Text style={[styles.summaryCount, { color }]}>{count}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Research Cards */}
      {tips.map((tip) => (
        <ResearchCard key={tip.tipId ?? tip.title} tip={tip} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: SPACING.xl },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    marginBottom: SPACING.sm,
  },
  summaryItem: { alignItems: 'center' },
  summaryCount: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold },
  summaryLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.xs,
  },
  cardTop: { flexDirection: 'row', marginBottom: SPACING.xs },
  cardLeft: { flex: 1, marginRight: SPACING.sm },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semiBold,
  },
  expertName: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 4 },
  cardDate: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: SPACING.sm },
  actionBadge: { borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  actionText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },
  targetPrice: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, textAlign: 'right' },
  cardContent: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs, lineHeight: 18, marginBottom: SPACING.sm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratingBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  ratingText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  readMore: { color: COLORS.primary, fontSize: FONT_SIZE.xs },
});
