// Component: OrderBookRow
// Source: OpenOrderBookWidgetV2 row item
// Shows symbol, qty, price, status badge, product tag, Buy/Sell direction

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';
import OrderStatusBadge from './OrderStatusBadge';

interface Props {
  order: OrderBookEntry;
  onPress: () => void;
  onCancelPress?: () => void;
  onModifyPress?: () => void;
}

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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${symbolName} order, ${isBuy ? 'buy' : 'sell'}`}
    >
      <View style={styles.topRow}>
        <View style={styles.leftSection}>
          <View style={styles.directionBadge}>
            <Text style={[styles.directionText, isBuy ? styles.buyText : styles.sellText]}>
              {isBuy ? 'B' : 'S'}
            </Text>
          </View>
          <View>
            <Text style={styles.symbol}>{symbolName}</Text>
            <Text style={styles.exchange}>
              {order.exchangeIdentity.exchangeId} · {order.productDescription ?? 'Cash'}
              {order.isAmoOrder ? ' · AMO' : ''}
            </Text>
          </View>
        </View>
        <OrderStatusBadge status={order.orderStatus} />
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.quantityBlock}>
          <Text style={styles.qtyLabel}>Qty</Text>
          <Text style={styles.qtyValue}>
            {order.tradedQuantity}/{order.orderQuantity}
          </Text>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>
            {order.orderPrice > 0 ? `₹${order.orderPrice.toFixed(2)}` : 'MKT'}
          </Text>
        </View>
        {order.averageTradePrice && order.averageTradePrice > 0 ? (
          <View style={styles.avgBlock}>
            <Text style={styles.priceLabel}>Avg</Text>
            <Text style={styles.priceValue}>
              ₹{order.averageTradePrice.toFixed(2)}
            </Text>
          </View>
        ) : null}

        {/* Action buttons (cancel/modify) for open orders */}
        {(onCancelPress || onModifyPress) && (
          <View style={styles.actionButtons}>
            {onCancelPress && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancelPress}
                accessibilityLabel="Cancel order"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}
            {onModifyPress && (
              <TouchableOpacity
                style={styles.modifyBtn}
                onPress={onModifyPress}
                accessibilityLabel="Modify order"
              >
                <Text style={styles.modifyBtnText}>Modify</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionText: { fontSize: 13, fontWeight: '700' },
  buyText: { color: '#009900' },
  sellText: { color: '#CC0000' },

  symbol: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  exchange: { fontSize: 11, color: '#888888', marginTop: 2 },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityBlock: { marginRight: 8 },
  priceBlock: {},
  avgBlock: {},
  qtyLabel: { fontSize: 10, color: '#AAAAAA', marginBottom: 1 },
  qtyValue: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  priceLabel: { fontSize: 10, color: '#AAAAAA', marginBottom: 1 },
  priceValue: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },

  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#CC0000',
  },
  cancelBtnText: { fontSize: 11, color: '#CC0000', fontWeight: '600' },
  modifyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: '#F0F6FF',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  modifyBtnText: { fontSize: 11, color: '#0066CC', fontWeight: '600' },
});

export default OrderBookRow;
