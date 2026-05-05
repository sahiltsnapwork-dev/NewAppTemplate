// MFHoldingsTab — mutual fund holdings data
// Converted from Flutter MFHoldingsWidget — placeholder until dedicated API is available

import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fonts, spacing, typography } from '../styles/tokens';

interface Props {
  symbol: string;
  exchange: 'NSE' | 'BSE';
}

export function MFHoldingsTab({ symbol, exchange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Mutual Fund Holdings</Text>
        <Text style={styles.subtitle}>{symbol} · {exchange}</Text>
        <View style={styles.separator} />
        <Text style={styles.bodyText}>
          This section shows mutual fund schemes holding {symbol} stock,
          including number of schemes, total shares held, and percentage of
          total shares outstanding.
        </Text>
        <Text style={styles.noteText}>
          Data is updated monthly based on AMFI disclosures.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert('MF Holdings', 'MF Holdings feature not implemented')}
          accessibilityLabel="View MF Holdings details"
        >
          <Text style={styles.buttonText}>View Full MF Holdings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.xl,
    width: '100%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  title: { fontSize: typography.subheading, fontFamily: fonts.medium, color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary, marginBottom: spacing.md },
  separator: { height: 1, width: '80%', backgroundColor: '#E0E0E0', marginBottom: spacing.md },
  bodyText: {
    fontSize: typography.body,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontStyle: 'italic',
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
