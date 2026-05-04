// ─── Quote Header ─────────────────────────────────────────────────────────────
// Maps to Flutter: Quote summary header with company name, symbol, LTP, change%
// Used in GetQuoteDetailsScreen top section

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useAppDispatch, useAppSelector, selectStreaming, selectCompany, selectTabsApiEnabled } from '../store/hooks';
import { setTabsApiEnabled } from '../store/getQuoteSlice';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '../constants/UIConstants';
import { Exchange } from '../constants/ApiConstants';

interface Props {
  onExchangeChange?: (exchange: Exchange) => void;
  selectedExchange: Exchange;
}

export const QuoteHeader: React.FC<Props> = ({ onExchangeChange, selectedExchange }) => {
  const dispatch = useAppDispatch();
  const streaming = useAppSelector(selectStreaming);
  const company = useAppSelector(selectCompany);
  const tabsApiEnabled = useAppSelector(selectTabsApiEnabled);

  const isPositive =
    streaming.isPositiveChange === 'YES' || (streaming.percentChange ?? 0) >= 0;
  const changeColor = isPositive ? COLORS.positive : COLORS.negative;
  const changeIndicator = isPositive ? '▲' : '▼';

  return (
    <View style={styles.container}>
      {/* Company Info */}
      <View style={styles.leftSection}>
        <Text style={styles.companyName} numberOfLines={1}>
          {company.name ?? streaming.symbol ?? '—'}
        </Text>
        <View style={styles.symbolRow}>
          <Text style={styles.symbolText}>{streaming.symbol ?? '—'}</Text>
          <View style={styles.sectorBadge}>
            <Text style={styles.sectorText}>{company.sector ?? ''}</Text>
          </View>
        </View>
      </View>

      {/* Price Info */}
      <View style={styles.rightSection}>
        <Text style={styles.ltpText}>
          ₹{streaming.ltp?.toFixed(2) ?? '0.00'}
        </Text>
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: changeColor }]}>
            {changeIndicator} {streaming.changeValue?.toFixed(2) ?? '0.00'}
          </Text>
          <Text style={[styles.changePercent, { color: changeColor }]}>
            {'  '}({Math.abs(streaming.percentChange ?? 0).toFixed(2)}%)
          </Text>
        </View>
        <Text style={styles.timestampText}>{streaming.timestamp ?? ''}</Text>
      </View>

      {/* Exchange Toggle */}
      <View style={styles.exchangeToggle}>
        {(['NSE', 'BSE'] as Exchange[]).map((ex) => (
          <TouchableOpacity
            key={ex}
            style={[
              styles.exchangeBtn,
              selectedExchange === ex && styles.exchangeBtnActive,
            ]}
            onPress={() => onExchangeChange?.(ex)}
          >
            <Text
              style={[
                styles.exchangeBtnText,
                selectedExchange === ex && styles.exchangeBtnTextActive,
              ]}
            >
              {ex}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tabs API Switch */}
      <View style={styles.switchWrapper}>
        <Text style={styles.switchLabel}>Tabs: API</Text>
        <Switch
          value={tabsApiEnabled}
          onValueChange={(val) => { dispatch(setTabsApiEnabled(val)); }}
          trackColor={{ false: COLORS.card, true: COLORS.primary }}
          thumbColor={tabsApiEnabled ? COLORS.surface : COLORS.card}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  leftSection: {
    flex: 1,
    marginBottom: SPACING.xs,
  },
  companyName: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: SPACING.xs,
  },
  symbolText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
  },
  sectorBadge: {
    backgroundColor: COLORS.card,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectorText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
  },
  ltpText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  changeText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  changePercent: {
    fontSize: FONT_SIZE.sm,
  },
  timestampText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  exchangeToggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.card,
    borderRadius: 6,
    overflow: 'hidden',
  },
  exchangeBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  exchangeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  exchangeBtnText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },
  exchangeBtnTextActive: {
    color: COLORS.textPrimary,
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SPACING.xs,
  },
  switchLabel: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xs,
    marginRight: SPACING.xs,
  },
});
