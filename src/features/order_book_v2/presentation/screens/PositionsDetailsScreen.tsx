// Positions Details Screen
// Source: positions_details_screen_v2.dart → PositionsDetailsScreenV2
// Shows carry-forward vs today toggle, market depth, action buttons

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OrderBookNavigatorParams } from '../navigation/OrderBookNavigator';

type Props = NativeStackScreenProps<OrderBookNavigatorParams, 'PositionsDetails'>;

const PositionsDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { position } = route.params;
  const [isCarryForwardView, setIsCarryForwardView] = useState(false);

  const symbolName =
    position.instrumentIdentity.lsSymbol ??
    position.instrumentIdentity.lssymbol ??
    position.instrumentIdentity.instrumentId;

  const isProfit = position.pnlValue >= 0;

  // Display values based on toggle (CF vs Today)
  const displayBuyQty = isCarryForwardView
    ? position.carryForwardBuyQuantity ?? position.buyQuantity
    : position.todayBuyQuantity ?? position.buyQuantity;
  const displaySellQty = isCarryForwardView
    ? position.carryForwardSellQuantity ?? position.sellQuantity
    : position.todaySellQuantity ?? position.sellQuantity;
  const displayNetQty = isCarryForwardView
    ? position.carryForwardNetQuantity ?? position.netQuantity
    : position.todayNetQuantity ?? position.netQuantity;

  const handleAdd = useCallback(() => {
    Alert.alert('Add Position', 'Navigate to Trade screen – feature not implemented');
  }, []);

  const handleExit = useCallback(() => {
    navigation.navigate('ExitOpenPositions', { position });
  }, [navigation, position]);

  const handleConvert = useCallback(() => {
    navigation.navigate('ConvertPosition', { position });
  }, [navigation, position]);

  const isClosed = position.netQuantity === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.symbol}>{symbolName}</Text>
          <Text style={[styles.pnlBadge, isProfit ? styles.pnlPositive : styles.pnlNegative]}>
            {isProfit ? '+' : ''}₹{position.pnlValue.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.exchangeLabel}>{position.exchangeIdentity.exchangeId}</Text>

        {/* CF / Today Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, !isCarryForwardView && styles.toggleBtnActive]}
            onPress={() => setIsCarryForwardView(false)}
          >
            <Text style={[styles.toggleText, !isCarryForwardView && styles.toggleTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, isCarryForwardView && styles.toggleBtnActive]}
            onPress={() => setIsCarryForwardView(true)}
          >
            <Text style={[styles.toggleText, isCarryForwardView && styles.toggleTextActive]}>
              Carry Forward
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* P&L Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Position Details</Text>
        <DetailRow label="Net Qty" value={String(displayNetQty)} />
        <DetailRow label="Buy Qty" value={String(displayBuyQty)} />
        <DetailRow label="Sell Qty" value={String(displaySellQty)} />
        <DetailRow label="Buy Avg Price" value={`₹${position.buyAveragePrice.toFixed(2)}`} />
        <DetailRow label="Sell Avg Price" value={`₹${position.sellAveragePrice.toFixed(2)}`} />
        <DetailRow label="LTP" value={`₹${position.ltp.toFixed(2)}`} />
        <DetailRow label="MTM Value" value={`₹${position.mtmValue.toFixed(2)}`} />
        <DetailRow
          label="Realized P&L"
          value={`₹${position.realizedPnl.toFixed(2)}`}
          valueColor={position.realizedPnl >= 0 ? '#009900' : '#CC0000'}
        />
        <DetailRow
          label="Unrealized P&L"
          value={`₹${position.unrealizedPnl.toFixed(2)}`}
          valueColor={position.unrealizedPnl >= 0 ? '#009900' : '#CC0000'}
        />
      </View>

      {/* Market Depth Placeholder */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Market Depth</Text>
        <Text style={styles.placeholderText}>
          Market depth data – connect WebSocket stream
        </Text>
      </View>

      {/* Action Buttons */}
      {!isClosed ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.addBtn]}
            onPress={handleAdd}
            accessibilityLabel="Add to position"
          >
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.exitBtn]}
            onPress={handleExit}
            accessibilityLabel="Exit position"
          >
            <Text style={styles.exitBtnText}>Exit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.convertBtn]}
            onPress={handleConvert}
            accessibilityLabel="Convert position"
          >
            <Text style={styles.convertBtnText}>Convert</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBanner}>
          <Text style={styles.closedText}>Position closed – no actions available</Text>
        </View>
      )}
    </ScrollView>
  );
};

const DetailRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor,
}) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  contentContainer: { padding: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  symbol: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  exchangeLabel: { fontSize: 12, color: '#888888', marginBottom: 10 },
  pnlBadge: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pnlPositive: { backgroundColor: '#E6F9EE', color: '#009900' },
  pnlNegative: { backgroundColor: '#FFF0F0', color: '#CC0000' },

  toggleRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#0066CC' },
  toggleText: { fontSize: 13, color: '#666666', fontWeight: '500' },
  toggleTextActive: { color: '#FFFFFF' },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 10 },
  placeholderText: { fontSize: 13, color: '#AAAAAA', fontStyle: 'italic' },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: { fontSize: 13, color: '#666666' },
  detailValue: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtn: { backgroundColor: '#0066CC' },
  addBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  exitBtn: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#CC0000' },
  exitBtnText: { color: '#CC0000', fontWeight: '600', fontSize: 14 },
  convertBtn: { backgroundColor: '#F0F6FF', borderWidth: 1, borderColor: '#0066CC' },
  convertBtnText: { color: '#0066CC', fontWeight: '600', fontSize: 14 },

  closedBanner: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  closedText: { color: '#999999', fontSize: 14 },
});

export default PositionsDetailsScreen;
