// ─── Financials Tab ───────────────────────────────────────────────────────────
// Maps to Flutter: widgets/financials/ — balencesheet_ui, pl_ui, results_ui, shareholding_pattern_ui
// Sub-tabs: Balance Sheet | P&L | Results | Shareholding

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  useAppSelector,
  selectBalanceSheet,
  selectPLStatement,
  selectResults,
  selectShareholding,
} from '../../store/hooks';
import {
  BalanceSheetData,
  PLData,
  ResultsData,
  ShareholdingData,
} from '../../models/AnalyticsModels';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

type SubTab = 'bs' | 'pl' | 'results' | 'shareholding';

const fmt = (n?: number) =>
  n != null ? `₹${(n / 100).toFixed(0)} Cr` : '—';

const fmtPct = (n?: number) =>
  n != null ? `${n.toFixed(2)}%` : '—';

// ── Balance Sheet ──────────────────────────────────────────────────────────────
const BalanceSheetView: React.FC<{ data: BalanceSheetData[] }> = ({ data }) => (
  <View>
    <Text style={styles.viewTitle}>Balance Sheet (₹ in Crores)</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.labelCell]}>Item</Text>
          {data.map((d) => (
            <Text key={d.period} style={styles.tableCell}>{d.period}</Text>
          ))}
        </View>
        {[
          { label: 'Total Assets', key: 'totalAssets' as keyof BalanceSheetData },
          { label: 'Current Assets', key: 'currentAssets' as keyof BalanceSheetData },
          { label: 'Non-current Assets', key: 'nonCurrentAssets' as keyof BalanceSheetData },
          { label: 'Total Liabilities', key: 'totalLiabilities' as keyof BalanceSheetData },
          { label: 'Current Liabilities', key: 'currentLiabilities' as keyof BalanceSheetData },
          { label: 'Long-term Debt', key: 'longTermDebt' as keyof BalanceSheetData },
          { label: 'Total Equity', key: 'equity' as keyof BalanceSheetData },
          { label: 'Book Value', key: 'bookValue' as keyof BalanceSheetData },
        ].map(({ label, key }) => (
          <View key={label} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.labelCell]}>{label}</Text>
            {data.map((d) => (
              <Text key={d.period} style={styles.tableCell}>
                {key === 'bookValue'
                  ? `₹${(d[key] as number | undefined)?.toFixed(2) ?? '—'}`
                  : fmt(d[key] as number | undefined)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  </View>
);

// ── P&L ───────────────────────────────────────────────────────────────────────
const PLView: React.FC<{ data: PLData[] }> = ({ data }) => (
  <View>
    <Text style={styles.viewTitle}>Profit & Loss (₹ in Crores)</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableCell, styles.labelCell]}>Item</Text>
          {data.map((d) => (
            <Text key={d.period} style={styles.tableCell}>{d.period}</Text>
          ))}
        </View>
        {[
          { label: 'Revenue', key: 'revenue' as keyof PLData },
          { label: 'EBITDA', key: 'ebitda' as keyof PLData },
          { label: 'Depreciation', key: 'depreciation' as keyof PLData },
          { label: 'Interest', key: 'interestExpense' as keyof PLData },
          { label: 'PBT', key: 'pbt' as keyof PLData },
          { label: 'Tax', key: 'tax' as keyof PLData },
          { label: 'Net Profit', key: 'netProfit' as keyof PLData },
          { label: 'EPS (₹)', key: 'eps' as keyof PLData },
        ].map(({ label, key }) => (
          <View key={label} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.labelCell]}>{label}</Text>
            {data.map((d) => (
              <Text key={d.period} style={styles.tableCell}>
                {key === 'eps' || key === 'dilutedEps'
                  ? `₹${(d[key] as number | undefined)?.toFixed(2) ?? '—'}`
                  : fmt(d[key] as number | undefined)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  </View>
);

// ── Results ───────────────────────────────────────────────────────────────────
const ResultsView: React.FC<{ data: ResultsData[] }> = ({ data }) => (
  <View>
    <Text style={styles.viewTitle}>Quarterly Results</Text>
    {data.map((result, i) => (
      <View key={i} style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultQuarter}>{result.quarter}</Text>
          {result.isPositiveSurprise != null && (
            <View
              style={[
                styles.surpriseBadge,
                { backgroundColor: result.isPositiveSurprise ? 'rgba(0,200,81,0.15)' : 'rgba(255,68,68,0.15)' },
              ]}
            >
              <Text
                style={[
                  styles.surpriseText,
                  { color: result.isPositiveSurprise ? COLORS.positive : COLORS.negative },
                ]}
              >
                {result.isPositiveSurprise ? '▲ Beat' : '▼ Miss'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.resultMetrics}>
          {[
            { label: 'Revenue', value: fmt(result.revenue), growth: result.revenueGrowthYoy },
            { label: 'Net Profit', value: fmt(result.netProfit), growth: result.profitGrowthYoy },
            { label: 'EPS', value: `₹${result.eps?.toFixed(2) ?? '—'}` },
          ].map(({ label, value, growth }) => (
            <View key={label} style={styles.resultMetricItem}>
              <Text style={styles.resultMetricLabel}>{label}</Text>
              <Text style={styles.resultMetricValue}>{value}</Text>
              {growth != null && (
                <Text style={[styles.growthText, { color: growth >= 0 ? COLORS.positive : COLORS.negative }]}>
                  {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% YoY
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    ))}
  </View>
);

// ── Shareholding Pattern ────────────────────────────────────────────────────────
const ShareholdingView: React.FC<{ data: ShareholdingData[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const latest = data[0];
  const previous = data[1];

  const segments = [
    { label: 'Promoters', value: latest.promoterHolding ?? 0, change: latest.promoterChange, color: '#1A73E8' },
    { label: 'FII/FPI', value: latest.fiiHolding ?? 0, change: latest.fiiChange, color: '#00C851' },
    { label: 'DII', value: latest.diiHolding ?? 0, change: latest.diiChange, color: '#FFB300' },
    { label: 'Public', value: latest.publicHolding ?? 0, color: '#9C27B0' },
  ];

  return (
    <View>
      <Text style={styles.viewTitle}>Shareholding Pattern</Text>
      <Text style={styles.viewSubtitle}>
        As of {latest.date ? new Date(latest.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
      </Text>

      {/* Stacked bar */}
      <View style={styles.stackedBar}>
        {segments.map((seg) => (
          <View
            key={seg.label}
            style={[styles.stackedSegment, { flex: seg.value / 100, backgroundColor: seg.color }]}
          />
        ))}
      </View>

      {/* Legend */}
      {segments.map((seg) => (
        <View key={seg.label} style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
          <Text style={styles.legendLabel}>{seg.label}</Text>
          <Text style={styles.legendValue}>{seg.value.toFixed(2)}%</Text>
          {seg.change != null && (
            <Text style={[styles.legendChange, { color: seg.change >= 0 ? COLORS.positive : COLORS.negative }]}>
              {seg.change >= 0 ? '+' : ''}{seg.change.toFixed(2)}%
            </Text>
          )}
        </View>
      ))}
    </View>
  );
};

// ── Main Financials Tab ───────────────────────────────────────────────────────
export const FinancialsTab: React.FC<Props> = ({ symbol }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('results');
  const balanceSheet = useAppSelector(selectBalanceSheet);
  const plStatement = useAppSelector(selectPLStatement);
  const results = useAppSelector(selectResults);
  const shareholding = useAppSelector(selectShareholding);
  const loading = useAppSelector(s => s.getQuote.financialsLoading);

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'results', label: 'Results' },
    { key: 'pl', label: 'P&L' },
    { key: 'bs', label: 'Balance Sheet' },
    { key: 'shareholding', label: 'Shareholding' },
  ];

  return (
    <View style={styles.container}>
      {/* Sub-tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabScroll}>
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
      </ScrollView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionCard}>
            {activeSubTab === 'bs' && <BalanceSheetView data={balanceSheet} />}
            {activeSubTab === 'pl' && <PLView data={plStatement} />}
            {activeSubTab === 'results' && <ResultsView data={results} />}
            {activeSubTab === 'shareholding' && <ShareholdingView data={shareholding} />}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  subTabScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  subTabBar: { flexDirection: 'row', paddingHorizontal: SPACING.xs },
  subTabBtn: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, marginRight: 2 },
  subTabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  subTabLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, whiteSpace: 'nowrap' } as any,
  subTabLabelActive: { color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.semiBold },
  scrollContent: { paddingBottom: SPACING.xl },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.base,
    padding: SPACING.md,
  },
  viewTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.base, fontWeight: FONT_WEIGHT.semiBold, marginBottom: SPACING.sm },
  viewSubtitle: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginBottom: SPACING.sm },
  // Table styles
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingVertical: SPACING.xs },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider, paddingVertical: 5 },
  tableCell: { width: 100, color: COLORS.textPrimary, fontSize: FONT_SIZE.xs, textAlign: 'right', paddingHorizontal: 4 },
  labelCell: { width: 150, textAlign: 'left', color: COLORS.textMuted },
  // Result card
  resultCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.sm, padding: SPACING.md, marginBottom: SPACING.sm },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  resultQuarter: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semiBold },
  surpriseBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  surpriseText: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold },
  resultMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
  resultMetricItem: { alignItems: 'center' },
  resultMetricLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  resultMetricValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  growthText: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  // Shareholding
  stackedBar: { height: 20, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', marginBottom: SPACING.sm },
  stackedSegment: { height: '100%' },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, gap: SPACING.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, flex: 1 },
  legendValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  legendChange: { fontSize: FONT_SIZE.xs, width: 60, textAlign: 'right' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
