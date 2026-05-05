// FinancialsTab — P&L, Balance Sheet, Cash Flow (stub with placeholder until API is available)
// Converted from Flutter FinancialsWidget

import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../styles/tokens';

interface Props {
  symbol: string;
  exchange: 'NSE' | 'BSE';
}

type FinancialTab = 'P&L' | 'Balance Sheet' | 'Cash Flow';
const FINANCIAL_TABS: FinancialTab[] = ['P&L', 'Balance Sheet', 'Cash Flow'];

export function FinancialsTab({ symbol, exchange }: Props) {
  const [selectedTab, setSelectedTab] = useState<FinancialTab>('P&L');

  return (
    <View style={styles.container}>
      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        {FINANCIAL_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTab, selectedTab === tab && styles.subTabActive]}
            onPress={() => setSelectedTab(tab)}
            accessibilityLabel={`${tab} tab`}
          >
            <Text style={[styles.subTabText, selectedTab === tab && styles.subTabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>{selectedTab}</Text>
          <Text style={styles.placeholderSubtitle}>{symbol} · {exchange}</Text>
          <Text style={styles.placeholderNote}>
            Detailed financials data will be displayed here.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Alert.alert('Financials', 'Full financials feature not implemented')}
            accessibilityLabel="View full financials"
          >
            <Text style={styles.buttonText}>View Full Financials</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: colors.positive },
  subTabText: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary },
  subTabTextActive: { fontFamily: fonts.medium, color: colors.positive },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  placeholder: { alignItems: 'center', maxWidth: 280 },
  placeholderTitle: {
    fontSize: typography.subheading,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  placeholderSubtitle: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  placeholderNote: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.positive,
  },
  buttonText: { color: colors.positive, fontFamily: fonts.medium, fontSize: typography.body },
});
