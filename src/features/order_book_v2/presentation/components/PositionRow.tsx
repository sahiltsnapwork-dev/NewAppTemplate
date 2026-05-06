// Component: PositionRow
// Source: positions_summary_list_item.dart
// Single position row with P&L, symbol, LTP, and action buttons

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity
} from 'react-native';
import type { CumulativePositionList } from '../../domain/entities/Position';

interface Props {
  position: CumulativePositionList;
  onPress: () => void;
  onExitPress: () => void;
  onConvertPress: () => void;
  onAddPress: () => void;
}

const PositionRow: React.FC<Props> = ({
  position,
  onPress,
  onExitPress,
  onConvertPress,
  onAddPress,
}) => {
  const symbolName =
    position.instrumentIdentity.lsSymbol ??
    position.instrumentIdentity.lssymbol ??
    position.instrumentIdentity.instrumentId;
  const isProfit = position.pnlValue >= 0;
  const pnlPercent =
    position.buyValue > 0
      ? ((position.pnlValue / position.buyValue) * 100).toFixed(2)
      : '0.00';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${symbolName} position`}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.symbol}>{symbolName}</Text>
          <Text style={styles.exchange}>
            {position.exchangeIdentity.exchangeId} · Qty: {position.netQuantity}
          </Text>
        </View>
        <View style={styles.pnlBlock}>
          <Text style={[styles.pnl, isProfit ? styles.profitText : styles.lossText]}>
            {isProfit ? '+' : ''}₹{position.pnlValue.toFixed(2)}
          </Text>
          <Text style={[styles.pnlPct, isProfit ? styles.profitText : styles.lossText]}>
            ({isProfit ? '+' : ''}{pnlPercent}%)
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.microLabel}>Avg</Text>
          <Text style={styles.microValue}>₹{position.buyAveragePrice.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.microLabel}>LTP</Text>
          <Text style={styles.microValue}>₹{position.ltp.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.microLabel}>Invested</Text>
          <Text style={styles.microValue}>₹{position.buyValue.toFixed(0)}</Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={onAddPress}
            accessibilityLabel="Add position"
          >
            <Text style={styles.addBtnText}>+Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exitBtn}
            onPress={onExitPress}
            accessibilityLabel="Exit position"
          >
            <Text style={styles.exitBtnText}>Exit</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  symbol: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  exchange: { fontSize: 11, color: '#888888', marginTop: 2 },
  pnlBlock: { alignItems: 'flex-end' },
  pnl: { fontSize: 14, fontWeight: '700' },
  pnlPct: { fontSize: 11, marginTop: 2 },
  profitText: { color: '#009900' },
  lossText: { color: '#CC0000' },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  microLabel: { fontSize: 10, color: '#AAAAAA', marginBottom: 1 },
  microValue: { fontSize: 12, color: '#1A1A2E', fontWeight: '500' },

  actionRow: { flexDirection: 'row', gap: 6 },
  addBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#F0F6FF',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  addBtnText: { fontSize: 11, color: '#0066CC', fontWeight: '600' },
  exitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#CC0000',
  },
  exitBtnText: { fontSize: 11, color: '#CC0000', fontWeight: '600' },
});

export default PositionRow;
