// Exit Open Positions Screen
// Source: exit_open_positions_screen.dart
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OrderBookNavigatorParams } from '../navigation/OrderBookNavigator';

type Props = NativeStackScreenProps<OrderBookNavigatorParams, 'ExitOpenPositions'>;

const ExitOpenPositionsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { position } = route.params;
  const [isLoading, setIsLoading] = useState(false);

  const symbolName =
    position.instrumentIdentity.lsSymbol ??
    position.instrumentIdentity.lssymbol ??
    position.instrumentIdentity.instrumentId;

  const isLong = position.netQuantity > 0;
  const exitSide = isLong ? 'SELL' : 'BUY';
  const exitQty = Math.abs(position.netQuantity);

  const handleExit = useCallback(() => {
    Alert.alert(
      'Confirm Exit',
      `Exit ${exitQty} units of ${symbolName} at market price?\nSide: ${exitSide}`,
      [
        {
          text: 'Exit Now',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            // In production: dispatch exitOpenPosition thunk (place order)
            Alert.alert('Success', 'Position exit order placed (mock)', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            setIsLoading(false);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [symbolName, exitQty, exitSide, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Exit Position</Text>
        <Text style={styles.symbol}>{symbolName}</Text>
        <Text style={styles.exchange}>{position.exchangeIdentity.exchangeId}</Text>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Net Qty</Text>
          <Text style={styles.value}>{position.netQuantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Exit Side</Text>
          <Text style={[styles.value, exitSide === 'SELL' ? styles.sellColor : styles.buyColor]}>
            {exitSide}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Exit Qty</Text>
          <Text style={styles.value}>{exitQty}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>LTP</Text>
          <Text style={styles.value}>₹{position.ltp.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>P&L</Text>
          <Text style={[styles.value, position.pnlValue >= 0 ? styles.buyColor : styles.sellColor]}>
            ₹{position.pnlValue.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.exitEstimate}>
        <Text style={styles.estimateLabel}>Estimated Exit Value</Text>
        <Text style={styles.estimateValue}>
          ₹{(exitQty * position.ltp).toFixed(2)}
        </Text>
        <Text style={styles.estimateNote}>Based on current LTP – actual execution may vary</Text>
      </View>

      <TouchableOpacity
        style={[styles.exitBtn, isLoading && styles.btnDisabled]}
        onPress={handleExit}
        disabled={isLoading}
        accessibilityLabel="Exit position"
      >
        {isLoading ? <ActivityIndicator color="#FFF" /> : (
          <Text style={styles.exitBtnText}>Exit Position</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  title: { fontSize: 14, color: '#888888', marginBottom: 4 },
  symbol: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  exchange: { fontSize: 12, color: '#888888', marginBottom: 12 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0',
  },
  label: { fontSize: 13, color: '#666666' },
  value: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  buyColor: { color: '#009900' },
  sellColor: { color: '#CC0000' },

  exitEstimate: {
    backgroundColor: '#FFF3E0', borderRadius: 8, padding: 14, marginBottom: 16, alignItems: 'center',
  },
  estimateLabel: { fontSize: 13, color: '#888888', marginBottom: 4 },
  estimateValue: { fontSize: 22, fontWeight: '700', color: '#1A1A2E' },
  estimateNote: { fontSize: 11, color: '#AAAAAA', marginTop: 4, textAlign: 'center' },

  exitBtn: { backgroundColor: '#CC0000', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  exitBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default ExitOpenPositionsScreen;
