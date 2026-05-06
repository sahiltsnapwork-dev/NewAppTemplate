// Convert Position Screen
// Source: convert_position_screen.dart
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OrderBookNavigatorParams } from '../navigation/OrderBookNavigator';

type Props = NativeStackScreenProps<OrderBookNavigatorParams, 'ConvertPosition'>;

const ConvertPositionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { position } = route.params;
  const [quantity, setQuantity] = useState(String(Math.abs(position.netQuantity)));
  const [isLoading, setIsLoading] = useState(false);

  const symbolName =
    position.instrumentIdentity.lsSymbol ??
    position.instrumentIdentity.lssymbol ??
    position.instrumentIdentity.instrumentId;

  const handleConvert = useCallback(async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0 || qty > Math.abs(position.netQuantity)) {
      Alert.alert('Validation Error', `Quantity must be between 1 and ${Math.abs(position.netQuantity)}`);
      return;
    }

    Alert.alert(
      'Confirm Conversion',
      `Convert ${qty} units of ${symbolName} to delivery?`,
      [
        {
          text: 'Convert',
          onPress: async () => {
            setIsLoading(true);
            // In production: dispatch convertToDelivery thunk
            Alert.alert('Success', 'Position converted to delivery (mock)');
            setIsLoading(false);
            navigation.goBack();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [quantity, position, symbolName, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Convert Position</Text>
        <Text style={styles.symbol}>{symbolName}</Text>
        <Text style={styles.subLabel}>
          Available: {Math.abs(position.netQuantity)} units | Product: {position.product}
        </Text>

        <Text style={styles.fieldLabel}>Quantity to Convert</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="Enter quantity"
          accessibilityLabel="Conversion quantity"
        />
      </View>

      <TouchableOpacity
        style={[styles.convertBtn, isLoading && styles.btnDisabled]}
        onPress={handleConvert}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#FFF" /> : (
          <Text style={styles.convertBtnText}>Convert to Delivery</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', padding: 16 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3,
  },
  title: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 4 },
  symbol: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  subLabel: { fontSize: 13, color: '#888888', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#666666', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#DDDDDD', borderRadius: 6, padding: 10,
    fontSize: 14, color: '#1A1A2E', backgroundColor: '#FAFAFA',
  },
  convertBtn: {
    backgroundColor: '#0066CC', borderRadius: 8, paddingVertical: 14, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  convertBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default ConvertPositionScreen;
