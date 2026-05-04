// ─── Option Tab ───────────────────────────────────────────────────────────────
// Maps to Flutter: widgets/option/ — options chain CE/PE display
// Event: GetQuoteFutureOptionApiEvent (options chain part)

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAppSelector, selectOptionsChain, selectStreaming } from '../../store/hooks';
import { OptionsChainRow } from '../../api/FnoRepository';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

const fmtOI = (n?: number) => {
  if (n == null) return '—';
  if (n >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  return n.toLocaleString('en-IN');
};

const OptionsChainHeader: React.FC = () => (
  <View style={styles.chainHeader}>
    {/* CE side */}
    {['OI', 'IV', 'LTP'].map(h => (
      <Text key={`ce_${h}`} style={[styles.headerCell, styles.ceCell]}>{h}</Text>
    ))}
    {/* Strike */}
    <Text style={[styles.headerCell, styles.strikeCell]}>Strike</Text>
    {/* PE side */}
    {['LTP', 'IV', 'OI'].map(h => (
      <Text key={`pe_${h}`} style={[styles.headerCell, styles.peCell]}>{h}</Text>
    ))}
  </View>
);

const OptionsChainRowView: React.FC<{ item: OptionsChainRow }> = ({ item }) => {
  const atmStyle = item.isATM ? styles.atmRow : null;
  return (
    <View style={[styles.chainRow, atmStyle]}>
      {/* CE side */}
      <Text style={[styles.cell, styles.ceCell]}>{fmtOI(item.ceOI)}</Text>
      <Text style={[styles.cell, styles.ceCell]}>
        {item.ceIV != null ? `${item.ceIV.toFixed(1)}%` : '—'}
      </Text>
      <Text style={[styles.cell, styles.ceCell, { color: COLORS.positive }]}>
        {item.ceLTP != null ? `₹${item.ceLTP.toFixed(2)}` : '—'}
      </Text>
      {/* Strike */}
      <Text style={[styles.cell, styles.strikeCell, item.isATM && styles.atmStrike]}>
        {item.strikePrice}
      </Text>
      {/* PE side */}
      <Text style={[styles.cell, styles.peCell, { color: COLORS.negative }]}>
        {item.peLTP != null ? `₹${item.peLTP.toFixed(2)}` : '—'}
      </Text>
      <Text style={[styles.cell, styles.peCell]}>
        {item.peIV != null ? `${item.peIV.toFixed(1)}%` : '—'}
      </Text>
      <Text style={[styles.cell, styles.peCell]}>{fmtOI(item.peOI)}</Text>
    </View>
  );
};

export const OptionTab: React.FC<Props> = ({ symbol }) => {
  const chain = useAppSelector(selectOptionsChain);
  const streaming = useAppSelector(selectStreaming);
  const loading = useAppSelector(s => s.getQuote.fnoLoading);

  // Expiry selector state — use unique dates from chain
  const expiries = Array.from(new Set(chain.map(r => r.expiryDate)));
  const [selectedExpiry, setSelectedExpiry] = useState<string>(expiries[0] ?? '');

  const filteredChain = selectedExpiry
    ? chain.filter(r => r.expiryDate === selectedExpiry)
    : chain;

  // PCR (Put-Call Ratio)
  const totalCEOI = filteredChain.reduce((s, r) => s + (r.ceOI ?? 0), 0);
  const totalPEOI = filteredChain.reduce((s, r) => s + (r.peOI ?? 0), 0);
  const pcr = totalCEOI > 0 ? (totalPEOI / totalCEOI).toFixed(2) : '—';

  return (
    <View style={styles.container}>
      {/* Spot + PCR bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarLabel}>Spot</Text>
          <Text style={styles.topBarValue}>₹{streaming.ltp?.toFixed(2) ?? '—'}</Text>
        </View>
        <View>
          <Text style={styles.topBarLabel}>PCR</Text>
          <Text style={styles.topBarValue}>{pcr}</Text>
        </View>
        <View>
          <Text style={styles.topBarLabel}>CE OI</Text>
          <Text style={[styles.topBarValue, { color: COLORS.positive }]}>{fmtOI(totalCEOI)}</Text>
        </View>
        <View>
          <Text style={styles.topBarLabel}>PE OI</Text>
          <Text style={[styles.topBarValue, { color: COLORS.negative }]}>{fmtOI(totalPEOI)}</Text>
        </View>
      </View>

      {/* Expiry selector */}
      {expiries.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.expiryScroll}
          contentContainerStyle={styles.expiryContent}
        >
          {expiries.map((exp) => (
            <TouchableOpacity
              key={exp}
              style={[styles.expiryBtn, selectedExpiry === exp && styles.expiryBtnActive]}
              onPress={() => setSelectedExpiry(exp)}
            >
              <Text style={[styles.expiryLabel, selectedExpiry === exp && styles.expiryLabelActive]}>
                {exp}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Options chain labels */}
      <View style={styles.sideLabels}>
        <Text style={[styles.sideLabel, { color: COLORS.positive }]}>CALLS</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.sideLabel, { color: COLORS.negative }]}>PUTS</Text>
      </View>

      {loading && filteredChain.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading options chain…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredChain}
          keyExtractor={(item, i) => `${item.strikePrice}_${item.expiryDate}_${i}`}
          ListHeaderComponent={<OptionsChainHeader />}
          stickyHeaderIndices={[0]}
          renderItem={({ item }) => <OptionsChainRowView item={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No options chain data for {symbol}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  topBarLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, textAlign: 'center' },
  topBarValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, textAlign: 'center', marginTop: 2 },
  expiryScroll: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  expiryContent: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, gap: SPACING.xs },
  expiryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  expiryBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  expiryLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  expiryLabelActive: { color: '#fff', fontWeight: FONT_WEIGHT.semiBold },
  sideLabels: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
  },
  sideLabel: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, width: '43%' },
  // Chain
  chainHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  chainRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  atmRow: { backgroundColor: 'rgba(26,115,232,0.05)' },
  headerCell: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, textAlign: 'right' },
  cell: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xs, textAlign: 'right' },
  ceCell: { flex: 1 },
  peCell: { flex: 1 },
  strikeCell: { width: 60, textAlign: 'center', fontWeight: FONT_WEIGHT.medium },
  atmStrike: { color: COLORS.primary, fontWeight: FONT_WEIGHT.bold },
  listContent: { paddingBottom: SPACING.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, marginTop: 60 },
  loadingText: { color: COLORS.textMuted, marginTop: SPACING.sm },
  emptyText: { color: COLORS.textMuted, textAlign: 'center' },
});
