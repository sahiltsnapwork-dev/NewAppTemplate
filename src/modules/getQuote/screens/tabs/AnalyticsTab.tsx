// ─── Analytics Tab ────────────────────────────────────────────────────────────
// Maps to Flutter: Analytics tab → peers_view.dart + ratio_view.dart + trend_analytics_view.dart
// Events: GetQuoteAnalyticsPeersApiEvent, GetQuoteAnalyticsRatioApiEvent, GetTrendAnalyticsApiEvent

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector, selectAnalyticsRatio, selectPeers, selectTrendAnalytics } from '../../store/hooks';
import { PeerData, AnalyticsRatio, TrendAnalyticsData } from '../../models/AnalyticsModels';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

type SubTab = 'peers' | 'ratios' | 'trends';

// ── Peer Comparison ────────────────────────────────────────────────────────────
const PeersView: React.FC<{ peers: PeerData[]; currentSymbol: string }> = ({ peers, currentSymbol }) => {
  const streaming = useAppSelector(s => s.getQuote.streaming);
  const allPeers: PeerData[] = [
    {
      symbol: currentSymbol,
      companyName: useAppSelector(s => s.getQuote.company.name) ?? currentSymbol,
      ltp: streaming.ltp,
      changePercent: streaming.percentChange,
      marketCap: streaming.nseMcap,
      peRatio: streaming.peRatio,
      pbRatio: streaming.pb,
      roe: streaming.roe,
      sector: streaming.sectorName,
    },
    ...peers,
  ];

  return (
    <View>
      <Text style={styles.subSectionTitle}>Peer Comparison</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={styles.peerHeaderRow}>
            {['Company', 'LTP', 'Chg%', 'Mkt Cap', 'P/E', 'P/B', 'ROE%'].map((h) => (
              <Text key={h} style={styles.peerHeaderCell}>{h}</Text>
            ))}
          </View>
          {/* Rows */}
          {allPeers.map((peer, i) => {
            const isCurrentStock = peer.symbol === currentSymbol;
            const chgColor = (peer.changePercent ?? 0) >= 0 ? COLORS.positive : COLORS.negative;
            return (
              <View
                key={peer.symbol ?? i}
                style={[styles.peerRow, isCurrentStock && styles.peerRowHighlight]}
              >
                <View style={[styles.peerCell, { width: 120 }]}>
                  <Text style={[styles.peerSymbol, isCurrentStock && { color: COLORS.primary }]}>
                    {peer.symbol}
                  </Text>
                  <Text style={styles.peerName} numberOfLines={1}>{peer.companyName}</Text>
                </View>
                <Text style={styles.peerCell}>₹{peer.ltp?.toFixed(2) ?? '—'}</Text>
                <Text style={[styles.peerCell, { color: chgColor }]}>
                  {peer.changePercent != null
                    ? `${peer.changePercent >= 0 ? '+' : ''}${peer.changePercent.toFixed(2)}%`
                    : '—'}
                </Text>
                <Text style={styles.peerCell}>
                  {peer.marketCap != null ? `₹${(peer.marketCap / 100).toFixed(0)}Cr` : '—'}
                </Text>
                <Text style={styles.peerCell}>{peer.peRatio?.toFixed(1) ?? '—'}</Text>
                <Text style={styles.peerCell}>{peer.pbRatio?.toFixed(2) ?? '—'}</Text>
                <Text style={styles.peerCell}>{peer.roe?.toFixed(1) ?? '—'}%</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// ── Ratios View ────────────────────────────────────────────────────────────────
const RatiosView: React.FC<{ ratio: AnalyticsRatio | null }> = ({ ratio }) => {
  if (!ratio) return null;
  const sections = [
    {
      title: 'Valuation Ratios',
      items: [
        { label: 'P/E Ratio', value: ratio.peRatio?.toFixed(2) },
        { label: 'P/B Ratio', value: ratio.pbRatio?.toFixed(2) },
        { label: 'EV/EBITDA', value: ratio.evEbitda?.toFixed(2) },
      ],
    },
    {
      title: 'Profitability',
      items: [
        { label: 'ROE', value: ratio.roe != null ? `${ratio.roe.toFixed(2)}%` : undefined },
        { label: 'ROA', value: ratio.roa != null ? `${ratio.roa.toFixed(2)}%` : undefined },
        { label: 'Net Margin', value: ratio.netMargin != null ? `${ratio.netMargin.toFixed(2)}%` : undefined },
        { label: 'Op. Margin', value: ratio.operatingMargin != null ? `${ratio.operatingMargin.toFixed(2)}%` : undefined },
      ],
    },
    {
      title: 'Liquidity',
      items: [
        { label: 'Current Ratio', value: ratio.currentRatio?.toFixed(2) },
        { label: 'Quick Ratio', value: ratio.quickRatio?.toFixed(2) },
      ],
    },
    {
      title: 'Leverage',
      items: [
        { label: 'Debt/Equity', value: ratio.debtToEquity?.toFixed(2) },
        { label: 'Debt/Asset', value: ratio.debtToAsset?.toFixed(2) },
      ],
    },
    {
      title: 'Growth',
      items: [
        { label: 'EPS Growth', value: ratio.epsGrowth != null ? `${ratio.epsGrowth.toFixed(2)}%` : undefined },
        { label: 'Revenue Growth', value: ratio.revenueGrowth != null ? `${ratio.revenueGrowth.toFixed(2)}%` : undefined },
      ],
    },
  ];

  return (
    <View>
      {sections.map((section) => (
        <View key={section.title} style={styles.ratioSection}>
          <Text style={styles.ratioSectionTitle}>{section.title}</Text>
          {section.items.map((item) => (
            <View key={item.label} style={styles.ratioRow}>
              <Text style={styles.ratioLabel}>{item.label}</Text>
              <Text style={styles.ratioValue}>{item.value ?? '—'}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

// ── Trend Analytics ────────────────────────────────────────────────────────────
const TrendView: React.FC<{ trends: TrendAnalyticsData[] }> = ({ trends }) => (
  <View>
    {trends.map((item, i) => {
      const color =
        item.trend === 'Bullish'
          ? COLORS.positive
          : item.trend === 'Bearish'
          ? COLORS.negative
          : COLORS.neutral;
      return (
        <View key={i} style={styles.trendRow}>
          <Text style={styles.trendPeriod}>{item.period}</Text>
          <View style={styles.trendRight}>
            <Text style={[styles.trendSignal, { color }]}>{item.trend}</Text>
            <Text style={styles.trendIndicatorText}>
              {item.indicator}: {item.value?.toFixed(2) ?? '—'}
            </Text>
            <View style={styles.strengthBar}>
              <View
                style={[styles.strengthFill, { width: `${item.strength ?? 0}%`, backgroundColor: color }]}
              />
            </View>
          </View>
        </View>
      );
    })}
  </View>
);

// ── Main Analytics Tab ────────────────────────────────────────────────────────
export const AnalyticsTab: React.FC<Props> = ({ symbol }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('peers');
  const ratio = useAppSelector(selectAnalyticsRatio);
  const peers = useAppSelector(selectPeers);
  const trends = useAppSelector(selectTrendAnalytics);
  const loading = useAppSelector(s => s.getQuote.analyticsLoading);

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'peers', label: 'Peers' },
    { key: 'ratios', label: 'Ratios' },
    { key: 'trends', label: 'Trends' },
  ];

  return (
    <View style={styles.container}>
      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        {subTabs.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.subTabBtn, activeSubTab === key && styles.subTabBtnActive]}
            onPress={() => setActiveSubTab(key)}
          >
            <Text style={[styles.subTabLabel, activeSubTab === key && styles.subTabLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionCard}>
            {activeSubTab === 'peers' && <PeersView peers={peers} currentSymbol={symbol} />}
            {activeSubTab === 'ratios' && <RatiosView ratio={ratio} />}
            {activeSubTab === 'trends' && <TrendView trends={trends} />}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  subTabBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  subTabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  subTabLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  subTabLabelActive: { color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  scrollContent: { paddingBottom: SPACING.xl },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.base,
    padding: SPACING.md,
  },
  subSectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    marginBottom: SPACING.sm,
  },
  // Peers
  peerHeaderRow: { flexDirection: 'row', paddingVertical: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  peerHeaderCell: { width: 80, color: COLORS.textMuted, fontSize: FONT_SIZE.xs, textAlign: 'center' },
  peerRow: { flexDirection: 'row', paddingVertical: SPACING.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider, alignItems: 'center' },
  peerRowHighlight: { backgroundColor: 'rgba(26,115,232,0.05)' },
  peerCell: { width: 80, color: COLORS.textPrimary, fontSize: FONT_SIZE.xs, textAlign: 'center' },
  peerSymbol: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  peerName: { color: COLORS.textMuted, fontSize: 9 },
  // Ratios
  ratioSection: { marginBottom: SPACING.md },
  ratioSectionTitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold, marginBottom: SPACING.xs, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  ratioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  ratioLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  ratioValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  // Trends
  trendRow: { flexDirection: 'row', paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider, alignItems: 'center' },
  trendPeriod: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, width: 100 },
  trendRight: { flex: 1 },
  trendSignal: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, marginBottom: 2 },
  trendIndicatorText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginBottom: 4 },
  strengthBar: { height: 3, backgroundColor: COLORS.cardBorder, borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
