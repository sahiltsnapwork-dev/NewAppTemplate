// Component: ConvertToDeliveryDialog
// Source: convert_to_delivery_dialog.dart
// Modal with quantity input for converting intraday position to delivery

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface Props {
  visible: boolean;
  symbolName: string;
  maxQuantity: number;
  onConfirm: (quantity: number) => void;
  onDismiss: () => void;
}

const ConvertToDeliveryDialog: React.FC<Props> = ({
  visible,
  symbolName,
  maxQuantity,
  onConfirm,
  onDismiss,
}) => {
  const [quantityText, setQuantityText] = useState(String(maxQuantity));
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const qty = parseInt(quantityText, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    if (qty > maxQuantity) {
      setError(`Quantity cannot exceed ${maxQuantity}`);
      return;
    }
    setError('');
    onConfirm(qty);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      accessible
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Convert to Delivery</Text>
          <Text style={styles.subtitle}>{symbolName}</Text>
          <Text style={styles.subLabel}>Max available: {maxQuantity} units</Text>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={quantityText}
            onChangeText={(t) => {
              setQuantityText(t);
              setError('');
            }}
            keyboardType="numeric"
            placeholder="Enter quantity"
            accessibilityLabel="Conversion quantity"
            selectTextOnFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Text style={styles.dismissBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm conversion"
            >
              <Text style={styles.confirmBtnText}>Convert</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 36,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#0066CC', fontWeight: '600', marginBottom: 2 },
  subLabel: { fontSize: 12, color: '#888888', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#666666', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  inputError: { borderColor: '#CC0000' },
  errorText: { color: '#CC0000', fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  dismissBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
  },
  dismissBtnText: { fontSize: 15, color: '#666666', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
});

export default ConvertToDeliveryDialog;
