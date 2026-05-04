// ─── Bottom Action Menu ────────────────────────────────────────────────────────
// Maps to Flutter: Bottom_menu.dart (BottomMenuState)
// Provides Buy/Sell/Watchlist/Alert action buttons

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '../constants/UIConstants';
import { useAppSelector, selectStreaming, selectCompany } from '../store/hooks';

interface Props {
  onBuy?: () => void;
  onSell?: () => void;
}

export const BottomActionMenu: React.FC<Props> = ({ onBuy, onSell }) => {
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const streaming = useAppSelector(selectStreaming);
  const company = useAppSelector(selectCompany);
  const symbol = streaming.symbol ?? company.symbol ?? '';

  const handleBuy = () => {
    if (onBuy) {
      onBuy();
    } else {
      Alert.alert('Buy Order', `Place buy order for ${symbol}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => console.log('Buy order for', symbol) },
      ]);
    }
  };

  const handleSell = () => {
    if (onSell) {
      onSell();
    } else {
      Alert.alert('Sell Order', `Place sell order for ${symbol}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Proceed', onPress: () => console.log('Sell order for', symbol) },
      ]);
    }
  };

  const handleWatchlist = () => {
    setIsWatchlisted((prev) => !prev);
    const msg = isWatchlisted
      ? `${symbol} removed from Watchlist`
      : `${symbol} added to Watchlist`;
    Alert.alert('Watchlist', msg);
  };

  const handleAlert = () => {
    Alert.alert('Price Alert', `Set price alert for ${symbol} @ ₹${streaming.ltp?.toFixed(2) ?? '0.00'}`);
  };

  const handleShare = () => {
    Alert.alert('Share', `Share ${symbol} quote`);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.btn, styles.buyBtn]} onPress={handleBuy}>
        <Text style={styles.buyBtnText}>BUY</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.sellBtn]} onPress={handleSell}>
        <Text style={styles.sellBtnText}>SELL</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconBtn} onPress={handleWatchlist}>
        <Text style={[styles.iconBtnText, isWatchlisted && { color: COLORS.positive }]}>
          {isWatchlisted ? '★' : '☆'}
        </Text>
        <Text style={styles.iconLabel}>Watchlist</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconBtn} onPress={handleAlert}>
        <Text style={styles.iconBtnText}>🔔</Text>
        <Text style={styles.iconLabel}>Alert</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
        <Text style={styles.iconBtnText}>↗</Text>
        <Text style={styles.iconLabel}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  buyBtn: {
    backgroundColor: COLORS.positive,
  },
  sellBtn: {
    backgroundColor: COLORS.negative,
  },
  buyBtnText: {
    color: '#fff',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.base,
  },
  sellBtnText: {
    color: '#fff',
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.base,
  },
  iconBtn: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  iconBtnText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },
  iconLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
});
