// MarketDepth Component
// Converted from Flutter MarketDepthView
// Row → flexDirection row; Column → flexDirection column
// Shows bid/ask depth table with 5 levels (from Hardcoded_response.json)

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing, typography } from './styles/tokens';
import type { QuoteEntity } from '../../domain/entities/QuoteEntity';

interface Props {
  quoteData: QuoteEntity;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '0';
  return value.toLocaleString('en-IN');
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return '0.00';
  return value.toFixed(2);
}

export function MarketDepth({ quoteData }: Props) {
  const buyRows = [
    { price: quoteData.buyprice1, qty: quoteData.bestbuyqty1, orders: quoteData.buynumberoforder1 },
    { price: quoteData.buyprice2, qty: quoteData.bestbuyqty2, orders: quoteData.buynumberoforder2 },
    { price: quoteData.buyprice3, qty: quoteData.bestbuyqty3, orders: quoteData.buynumberoforder3 },
    { price: quoteData.buyprice4, qty: quoteData.bestbuyqty4, orders: quoteData.buynumberoforder4 },
    { price: quoteData.buyprice5, qty: quoteData.bestbuyqty5, orders: quoteData.buynumberoforder5 },
  ];

  const sellRows = [
    { price: quoteData.sellprice1, qty: quoteData.bestsellqty1, orders: quoteData.sellnumberoforder1 },
    { price: quoteData.sellprice2, qty: quoteData.bestsellqty2, orders: quoteData.sellnumberoforder2 },
    { price: quoteData.sellprice3, qty: quoteData.bestsellqty3, orders: quoteData.sellnumberoforder3 },
    { price: quoteData.sellprice4, qty: quoteData.bestsellqty4, orders: quoteData.sellnumberoforder4 },
    { price: quoteData.sellprice5, qty: quoteData.bestsellqty5, orders: quoteData.sellnumberoforder5 },
  ];

  return (
    <View style={styles.container}>
      {/* Buy Side */}
      <View style={styles.side}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>Bid Qty</Text>
          <Text style={[styles.headerText, styles.priceHeader]}>Bid Price ₹</Text>
        </View>
        {buyRows.map((row, i) => (
          <View key={`buy-${i}`} style={styles.dataRow}>
            <Text style={styles.qtyText}>{formatNumber(row.qty)}</Text>
            <Text style={styles.buyPriceText}>{formatPrice(row.price)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatNumber(quoteData.totalbuyqty)}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Sell Side */}
      <View style={styles.side}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerText, styles.priceHeader]}>Ask Price ₹</Text>
          <Text style={styles.headerText}>Ask Qty</Text>
        </View>
        {sellRows.map((row, i) => (
          <View key={`sell-${i}`} style={styles.dataRow}>
            <Text style={styles.sellPriceText}>{formatPrice(row.price)}</Text>
            <Text style={[styles.qtyText, styles.rightAlign]}>{formatNumber(row.qty)}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalValue}>{formatNumber(quoteData.totalsellqty)}</Text>
          <Text style={styles.totalLabel}>Total</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  side: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerText: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  priceHeader: {
    textAlign: 'right',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  qtyText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  rightAlign: {
    textAlign: 'right',
  },
  buyPriceText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.positive,
    textAlign: 'right',
  },
  sellPriceText: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.negative,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  totalValue: {
    fontSize: typography.small,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: spacing.sm,
  },
});
