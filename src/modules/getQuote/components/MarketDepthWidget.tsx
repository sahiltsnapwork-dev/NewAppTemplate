// ─── Market Depth Widget ───────────────────────────────────────────────────────
// Maps to Flutter: widgets/market_depth.dart
// Shows 5-level bid/ask order book with depth bars

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../constants/UIConstants';

export const MarketDepthWidget: React.FC = () => {
  const bidAsk = useAppSelector((s) => s.getQuote.bidAsk);
  const streaming = useAppSelector((s) => s.getQuote.streaming);

  const totalBuyQty = streaming.totalBuyQty ?? 0;
  const totalSellQty = streaming.totalSellQty ?? 0;
  const maxQty = Math.max(totalBuyQty / 5, totalSellQty / 5, 1);

  const bidLevels = [
    { price: bidAsk.buyPrice1, qty: bidAsk.bestBuyQty1, orders: bidAsk.buyNumberOfOrder1 },
    { price: bidAsk.buyPrice2, qty: bidAsk.bestBuyQty2, orders: bidAsk.buyNumberOfOrder2 },
    { price: bidAsk.buyPrice3, qty: bidAsk.bestBuyQty3, orders: bidAsk.buyNumberOfOrder3 },
    { price: bidAsk.buyPrice4, qty: bidAsk.bestBuyQty4, orders: bidAsk.buyNumberOfOrder4 },
    { price: bidAsk.buyPrice5, qty: bidAsk.bestBuyQty5, orders: bidAsk.buyNumberOfOrder5 },
  ];

  const askLevels = [
    { price: bidAsk.sellPrice1, qty: bidAsk.bestSellQty1, orders: bidAsk.sellNumberOfOrder1 },
    { price: bidAsk.sellPrice2, qty: bidAsk.bestSellQty2, orders: bidAsk.sellNumberOfOrder2 },
    { price: bidAsk.sellPrice3, qty: bidAsk.bestSellQty3, orders: bidAsk.sellNumberOfOrder3 },
    { price: bidAsk.sellPrice4, qty: bidAsk.bestSellQty4, orders: bidAsk.sellNumberOfOrder4 },
    { price: bidAsk.sellPrice5, qty: bidAsk.bestSellQty5, orders: bidAsk.sellNumberOfOrder5 },
  ];

  const formatNum = (n?: number) =>
    n != null ? n.toLocaleString('en-IN') : '—';

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Market Depth</Text>

      {/* Column Headers */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, styles.buyColor]}>Bid Qty</Text>
        <Text style={[styles.headerCell, styles.centerCell]}>Orders</Text>
        <Text style={[styles.headerCell, styles.centerCell]}>Price</Text>
        <Text style={[styles.headerCell, styles.centerCell]}>Orders</Text>
        <Text style={[styles.headerCell, styles.askColor, styles.rightAlign]}>Ask Qty</Text>
      </View>

      {/* Depth Rows */}
      {bidLevels.map((bid, i) => {
        const ask = askLevels[i];
        const bidBarWidth = bid.qty ? Math.min(100, (bid.qty / maxQty) * 100) : 0;
        const askBarWidth = ask.qty ? Math.min(100, (ask.qty / maxQty) * 100) : 0;

        return (
          <View key={i} style={styles.depthRow}>
            {/* Bid side */}
            <View style={styles.bidSide}>
              <View style={[styles.depthBar, { width: `${bidBarWidth}%` }]} />
              <Text style={[styles.qtyText, styles.buyColor]}>{formatNum(bid.qty)}</Text>
              <Text style={styles.ordersText}>{bid.orders ?? '—'}</Text>
              <Text style={[styles.priceText, styles.buyColor]}>
                {bid.price?.toFixed(2) ?? '—'}
              </Text>
            </View>
            {/* Ask side */}
            <View style={styles.askSide}>
              <Text style={[styles.priceText, styles.askColor]}>
                {ask.price?.toFixed(2) ?? '—'}
              </Text>
              <Text style={styles.ordersText}>{ask.orders ?? '—'}</Text>
              <Text style={[styles.qtyText, styles.askColor]}>{formatNum(ask.qty)}</Text>
              <View style={[styles.depthBarAsk, { width: `${askBarWidth}%` }]} />
            </View>
          </View>
        );
      })}

      {/* Totals */}
      <View style={styles.totalRow}>
        <Text style={[styles.totalText, styles.buyColor]}>{formatNum(totalBuyQty)}</Text>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={[styles.totalText, styles.askColor]}>{formatNum(totalSellQty)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.base,
    marginVertical: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  headerCell: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  centerCell: {
    textAlign: 'center',
  },
  rightAlign: {
    textAlign: 'right',
  },
  depthRow: {
    flexDirection: 'row',
    marginVertical: 2,
    alignItems: 'center',
  },
  bidSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    gap: 4,
  },
  askSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'hidden',
    gap: 4,
  },
  depthBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.buyDepth,
    borderRadius: 2,
  },
  depthBarAsk: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.sellDepth,
    borderRadius: 2,
  },
  qtyText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    zIndex: 1,
  },
  ordersText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    flex: 1,
    textAlign: 'center',
    zIndex: 1,
  },
  priceText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    zIndex: 1,
  },
  buyColor: { color: COLORS.positive },
  askColor: { color: COLORS.negative },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  totalLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
});
