// Cancel / Modify Order Screen
// Source: order_book_cancel_screen_v2.dart → OrderBookCancelScreenV2
// Handles both cancel and modify flows with market status check

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OrderBookNavigatorParams } from '../navigation/OrderBookNavigator';
import type { AppDispatch } from '../../../../store/store';
import type { PlaceOrderRequestModel } from '../../domain/entities/PlaceOrder';

import {
  fetchMarketStatusThunk,
  cancelOrderThunk,
  modifyOrderThunk,
  confirmOrderThunk,
} from '../../state/thunks/orderCancelThunks';
import {
  selectOrderCancelIsLoading,
  selectMarketStatus,
  selectCancelResult,
  selectAlertDialog,
  selectFundShortfall,
  selectQuantityShortfall,
  selectOrderCancelError,
} from '../../state/selectors/orderCancelSelectors';
import { resetOrderCancel, clearResult } from '../../state/slices/orderCancelSlice';

type Props = NativeStackScreenProps<OrderBookNavigatorParams, 'OrderBookCancel'>;

const OrderBookCancelScreen: React.FC<Props> = ({ route, navigation }) => {
  const { order, action } = route.params;
  const dispatch = useDispatch<AppDispatch>();

  const isLoading = useSelector(selectOrderCancelIsLoading);
  const marketStatus = useSelector(selectMarketStatus);
  const result = useSelector(selectCancelResult);
  const alertDialog = useSelector(selectAlertDialog);
  const fundShortfall = useSelector(selectFundShortfall);
  const quantityShortfall = useSelector(selectQuantityShortfall);
  const error = useSelector(selectOrderCancelError);

  const isModify = action === 'modify';

  // Editable fields for modify
  const [modifiedQuantity, setModifiedQuantity] = useState(String(order.orderQuantity));
  const [modifiedPrice, setModifiedPrice] = useState(String(order.orderPrice));

  const symbolName =
    order.instrumentIdentity.lsSymbol ?? order.instrumentIdentity.lssymbol ?? 'N/A';
  const isBuy = order.orderLegDetails.orderSide === 1;

  // ── Init: check market status ───────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchMarketStatusThunk('OrderBookCancelScreen'));
  }, [dispatch]);

  // ── Handle result ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (result?.statusCode === 'S') {
      Alert.alert(
        'Success',
        isModify ? 'Order modified successfully' : 'Order cancelled successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              dispatch(resetOrderCancel());
              navigation.goBack();
            },
          },
        ]
      );
    }
  }, [result, isModify, dispatch, navigation]);

  // ── Alert dialog (status D) ─────────────────────────────────────────────────
  useEffect(() => {
    if (alertDialog) {
      Alert.alert(alertDialog.title, alertDialog.message, [
        { text: alertDialog.buttonTitle, onPress: () => dispatch(clearResult()) },
      ]);
    }
  }, [alertDialog, dispatch]);

  // ── Fund shortfall ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (fundShortfall) {
      Alert.alert(
        'Insufficient Funds',
        fundShortfall,
        [
          { text: 'Add Funds', onPress: () => console.log('Navigate to Add Funds – not implemented') },
          { text: 'Cancel', style: 'cancel', onPress: () => dispatch(clearResult()) },
        ]
      );
    }
  }, [fundShortfall, dispatch]);

  // ── Quantity shortfall ──────────────────────────────────────────────────────
  useEffect(() => {
    if (quantityShortfall) {
      Alert.alert('Quantity Issue', quantityShortfall, [
        { text: 'OK', onPress: () => dispatch(clearResult()) },
      ]);
    }
  }, [quantityShortfall, dispatch]);

  const buildOrderRequest = useCallback((): PlaceOrderRequestModel => ({
    exchangeIdentity: order.exchangeIdentity,
    instrumentIdentity: {
      instrumentId: order.instrumentIdentity.instrumentId,
      instrumentIdType: order.instrumentIdentity.instrumentIdType,
      instrumentSegment: order.instrumentIdentity.instrumentSegment,
      instrumentType: order.instrumentIdentity.instrumentType,
    },
    orderLegDetails: order.orderLegDetails,
    tradingAccountDetails: order.tradingAccountDetails,
    exchangeOrderNumber: order.exchangeOrderNumber,
    orderQuantity: isModify ? parseInt(modifiedQuantity, 10) : order.orderQuantity,
    orderPrice: isModify ? parseFloat(modifiedPrice) : order.orderPrice,
    triggerPrice: order.triggerPrice,
    disclosedQuantity: order.disclosedQuantity,
  }), [order, isModify, modifiedQuantity, modifiedPrice]);

  const handleConfirm = useCallback(() => {
    // Validation
    if (isModify) {
      const qty = parseInt(modifiedQuantity, 10);
      const price = parseFloat(modifiedPrice);
      if (isNaN(qty) || qty <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid quantity');
        return;
      }
      if (isNaN(price) || price < 0) {
        Alert.alert('Validation Error', 'Please enter a valid price');
        return;
      }
    }

    const orderRequest = buildOrderRequest();

    Alert.alert(
      isModify ? 'Confirm Modify' : 'Confirm Cancel',
      isModify
        ? `Modify order for ${symbolName} – Qty: ${modifiedQuantity}, Price: ₹${modifiedPrice}`
        : `Are you sure you want to cancel the ${symbolName} order?`,
      [
        {
          text: isModify ? 'Modify' : 'Cancel Order',
          style: 'destructive',
          onPress: () => {
            if (isModify) {
              dispatch(modifyOrderThunk(orderRequest));
            } else {
              dispatch(cancelOrderThunk({ orderRequest, orderType: 'EQUITY' }));
            }
          },
        },
        { text: 'Go Back', style: 'cancel' },
      ]
    );
  }, [isModify, symbolName, modifiedQuantity, modifiedPrice, buildOrderRequest, dispatch]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Market Status Banner */}
      {marketStatus && (
        <View style={[styles.marketStatusBanner,
          marketStatus.statusCode === 'OPEN' ? styles.marketOpen : styles.marketClosed
        ]}>
          <Text style={styles.marketStatusText}>
            Market: {marketStatus.statusCode} · {marketStatus.exchangeId}
          </Text>
        </View>
      )}

      {/* Order Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Order Summary</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Symbol</Text>
          <Text style={styles.value}>{symbolName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Direction</Text>
          <Text style={[styles.value, isBuy ? styles.buyColor : styles.sellColor]}>
            {isBuy ? 'BUY' : 'SELL'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Exchange</Text>
          <Text style={styles.value}>{order.exchangeIdentity.exchangeId}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Product</Text>
          <Text style={styles.value}>{order.productDescription ?? 'Cash'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Order No.</Text>
          <Text style={styles.value}>{order.exchangeOrderNumber}</Text>
        </View>
      </View>

      {/* Modify Form (only shown for modify action) */}
      {isModify && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Modify Order</Text>

          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={modifiedQuantity}
            onChangeText={setModifiedQuantity}
            keyboardType="numeric"
            placeholder="Enter quantity"
            accessibilityLabel="Quantity input"
          />

          <Text style={styles.fieldLabel}>Price (₹)</Text>
          <TextInput
            style={styles.input}
            value={modifiedPrice}
            onChangeText={setModifiedPrice}
            keyboardType="decimal-pad"
            placeholder="Enter price"
            accessibilityLabel="Price input"
          />
        </View>
      )}

      {/* Error */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.actionBtn, isLoading && styles.actionBtnDisabled]}
        onPress={handleConfirm}
        disabled={isLoading}
        accessibilityLabel={isModify ? 'Modify order' : 'Cancel order'}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.actionBtnText}>
            {isModify ? 'Modify Order' : 'Cancel Order'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  contentContainer: { padding: 16, paddingBottom: 32 },

  marketStatusBanner: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
    alignItems: 'center',
  },
  marketOpen: { backgroundColor: '#E6F9EE' },
  marketClosed: { backgroundColor: '#FFF3E0' },
  marketStatusText: { fontSize: 13, fontWeight: '500', color: '#333333' },

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
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 12 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  label: { fontSize: 13, color: '#666666' },
  value: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  buyColor: { color: '#009900' },
  sellColor: { color: '#CC0000' },

  fieldLabel: { fontSize: 13, color: '#666666', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },

  errorText: { color: '#CC0000', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  actionBtn: {
    backgroundColor: '#CC0000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});

export default OrderBookCancelScreen;
