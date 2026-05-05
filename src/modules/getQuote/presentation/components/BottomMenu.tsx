// BottomMenu Component
// Converted from Flutter OverlayEntry bottom sheet showing Buy/Sell/Watchlist/Alert actions
// OverlayEntry → Modal with absolute positioned transparent overlay

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors, fonts, spacing, typography } from './styles/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  onBuy: () => void;
  onSell: () => void;
  onWatchlist: () => void;
  onAlert: () => void;
}

export function BottomMenu({ visible, onClose, onBuy, onSell, onWatchlist, onAlert }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close menu">
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => { onBuy(); onClose(); }}
            accessibilityLabel="Buy"
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.positive }]}>
              <Text style={styles.actionIconText}>B</Text>
            </View>
            <Text style={styles.actionLabel}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => { onSell(); onClose(); }}
            accessibilityLabel="Sell"
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.negative }]}>
              <Text style={styles.actionIconText}>S</Text>
            </View>
            <Text style={styles.actionLabel}>Sell</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => { onWatchlist(); onClose(); }}
            accessibilityLabel="Add to Watchlist"
          >
            <View style={[styles.actionIcon, { backgroundColor: '#1976D2' }]}>
              <Text style={styles.actionIconText}>W</Text>
            </View>
            <Text style={styles.actionLabel}>Watchlist</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => { onAlert(); onClose(); }}
            accessibilityLabel="Set Alert"
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F57C00' }]}>
              <Text style={styles.actionIconText}>A</Text>
            </View>
            <Text style={styles.actionLabel}>Alert</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.xl,
    paddingBottom: 32,
    paddingTop: spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.bodyLarge,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionIconText: {
    color: '#FFFFFF',
    fontSize: typography.heading,
    fontFamily: fonts.bold,
  },
  actionLabel: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: typography.body,
    fontFamily: fonts.medium,
    color: colors.textPrimary,
  },
});
