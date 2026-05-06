// Component: OrderBookRow
// Source: OpenOrderBookWidgetV2 row item
// Figma: node 13343:20306 / 13343:20307 – Orderbook card
// Shows symbol, qty, price, status chip, LTP, direction chip

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';

interface Props {
  order: OrderBookEntry;
  onPress: () => void;
  onCancelPress?: () => void;
  onModifyPress?: () => void;
}

// Figma status chip colours
const STATUS_CHIP: Record<string, { bg?: string; text: string }> = {
  Modified:          { bg: undefined,    text: '#424b7a' },
  Rejected:          { bg: '#f5e8ea',    text: '#971b2f' },
  GTD:               { bg: '#e8e9f0',    text: '#424b7a' },
  Pending:           { bg: '#fff3d4',    text: '#7a5c00' },
  Traded:            { bg: '#e2f4f1',    text: '#008675' },
  Cancelled:         { bg: '#f5e8ea',    text: '#971b2f' },
  'Partially Traded':{ bg: '#cce5ff',    text: '#004085' },
  Default:           { bg: '#e8e9f0',    text: '#424b7a' },
};

const OrderBookRow: React.FC<Props> = ({
  order,
  onPress,
  onCancelPress,
  onModifyPress,
}) => {
  const symbolName =
    order.instrumentIdentity.lsSymbol ??
    order.instrumentIdentity.lssymbol ??
    order.instrumentIdentity.instrumentId;
  const isBuy = order.orderLegDetails.orderSide === 1;

  // Format time from ISO datetime string
  const orderTime = (() => {
    try {
      return new Date(order.orderDateTime).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
    } catch {
      return order.orderDateTime?.slice(11, 19) ?? '';
    }
  })();

  const priceDisplay = order.orderPrice > 0
    ? order.orderPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : 'MKT';

  const statusColors = STATUS_CHIP[order.orderStatus] ?? STATUS_CHIP.Default;

  // Build info line: Exchange | Product | Order type
  const exchange = order.exchangeIdentity.exchangeId;
  const product = order.productDescription ?? '';
  const orderTypeLabel = order.orderPrice > 0 ? 'LIMIT' : 'MARKET';
  const infoLine = [exchange, product, orderTypeLabel].filter(Boolean).join('  |  ');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${symbolName} order, ${isBuy ? 'buy' : 'sell'}`}
    >
      {/* Row 1: direction chip + qty  |  status chip + time */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={[styles.directionChip, isBuy ? styles.buyChip : styles.sellChip]}>
            <Text style={[styles.directionText, isBuy ? styles.buyText : styles.sellText]}>
              {isBuy ? 'BUY' : 'SELL'}
            </Text>
          </View>
          <Text style={styles.qtyText}>
            {order.tradedQuantity} / {order.orderQuantity} Qty
          </Text>
        </View>
        <View style={styles.topRight}>
          <View style={[styles.statusChip, statusColors.bg ? { backgroundColor: statusColors.bg } : undefined]}>
            <Text style={[styles.statusChipText, { color: statusColors.text }]}>
              {order.orderStatus.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.timeText}>{orderTime}</Text>
        </View>
      </View>

      {/* Row 2: stone card with symbol + price + info line + LTP */}
      <View style={styles.cardBody}>
        <View style={styles.cardBodyRow1}>
          <Text style={styles.symbolText} numberOfLines={1} ellipsizeMode="tail">
            {symbolName}
          </Text>
          <Text style={styles.priceText}>{priceDisplay}</Text>
        </View>
        <View style={styles.cardBodyRow2}>
          <Text style={styles.infoText}>{infoLine}</Text>
          <View style={styles.ltpContainer}>
            <Text style={styles.ltpLabel}>LTP  </Text>
            <Text style={styles.ltpValue}>
              {order.averageTradePrice && order.averageTradePrice > 0
                ? order.averageTradePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* Separator */}
      <View style={styles.separator} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginBottom: 16,
  },
  // Row 1
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  // Direction chip
  directionChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyChip: { backgroundColor: '#e2f4f1' },
  sellChip: { backgroundColor: '#f5e8ea' },
  directionText: { fontSize: 11, lineHeight: 14 },
  buyText: { color: '#008675' },
  sellText: { color: '#971b2f' },
  // Qty text
  qtyText: { fontSize: 12, fontWeight: '700', color: '#000000', lineHeight: 17 },
  // Status chip
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusChipText: { fontSize: 10, lineHeight: 14, letterSpacing: -0.3 },
  // Time
  timeText: { fontSize: 11, color: '#71789d', lineHeight: 14 },
  // Card body (stone background)
  cardBody: {
    backgroundColor: '#f7f6f2',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 0,
  },
  cardBodyRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 22,
    flex: 1,
    marginRight: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 22,
  },
  cardBodyRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 10,
    color: '#68697e',
    lineHeight: 14,
    letterSpacing: -0.3,
  },
  ltpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ltpLabel: { fontSize: 11, fontWeight: '700', color: '#888fac', lineHeight: 14 },
  ltpValue: { fontSize: 11, fontWeight: '700', color: '#888fac', lineHeight: 14 },
  // Separator
  separator: {
    height: 0.5,
    backgroundColor: '#e8e9f0',
    marginTop: 12,
  },
});

export default OrderBookRow;
