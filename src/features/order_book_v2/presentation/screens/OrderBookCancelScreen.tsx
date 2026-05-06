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
  const [isSelected, setIsSelected] = useState(false);

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
    <View style={styles.outerContainer}>
      {/* Scrollable content */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar + Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#a0a5bd"
              value={symbolName}
              editable={false}
            />
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => console.log('Filter – not implemented')}
            accessibilityLabel="Filter orders"
          >
            <Text style={styles.filterIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* Select All row */}
        <View style={styles.selectAllRow}>
          <TouchableOpacity
            style={[styles.checkbox, isSelected && styles.checkboxChecked]}
            onPress={() => setIsSelected((v) => !v)}
            accessibilityLabel="Select all"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSelected((v) => !v)}>
            <Text style={styles.selectAllText}>Select All</Text>
          </TouchableOpacity>
        </View>

        {/* Order card */}
        <View style={styles.orderCard}>
          {/* Row 1: direction chip + qty | time */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <TouchableOpacity
                style={[styles.checkbox, isSelected && styles.checkboxChecked]}
                onPress={() => setIsSelected((v) => !v)}
                accessibilityLabel="Select order"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                {isSelected && <Text style={styles.checkboxTick}>✓</Text>}
              </TouchableOpacity>
              <View style={[styles.directionChip, isBuy ? styles.buyChip : styles.sellChip]}>
                <Text style={[styles.directionText, isBuy ? styles.buyText : styles.sellText]}>
                  {isBuy ? 'BUY' : 'SELL'}
                </Text>
              </View>
              <Text style={styles.qtyText}>
                {order.tradedQuantity} / {order.orderQuantity} Qty
              </Text>
            </View>
            <Text style={styles.orderStatus}>{order.orderStatus}</Text>
          </View>
          {/* Card body */}
          <View style={styles.cardBody}>
            <View style={styles.cardBodyRow}>
              <Text style={styles.symbolText} numberOfLines={1}>{symbolName}</Text>
              <Text style={styles.priceText}>
                {order.orderPrice > 0
                  ? order.orderPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                  : 'MKT'}
              </Text>
            </View>
            <View style={styles.cardBodyRow}>
              <Text style={styles.infoText}>
                {order.exchangeIdentity.exchangeId}
                {order.productDescription ? `  |  ${order.productDescription}` : ''}
                {order.orderPrice > 0 ? '  |  LIMIT' : '  |  MARKET'}
              </Text>
            </View>
          </View>
          <View style={styles.cardSeparator} />
        </View>

        {/* Modify form (only for modify action) */}
        {isModify && (
          <View style={styles.modifyCard}>
            <Text style={styles.modifyTitle}>Modify Order</Text>
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

        {/* Market status */}
        {marketStatus && (
          <View style={[styles.marketBanner,
            marketStatus.statusCode === 'OPEN' ? styles.marketOpen : styles.marketClosed
          ]}>
            <Text style={styles.marketText}>
              Market: {marketStatus.statusCode} · {marketStatus.exchangeId}
            </Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Fixed bottom action button – Figma style */}
      <View style={styles.bottomBar}>
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
              {isModify ? 'Modify Order' : 'Cancel Orders'}
            </Text>
          )}
        </TouchableOpacity>
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#f6f6f6' },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 100 },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    marginBottom: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 5,
    height: 44,
    paddingLeft: 13,
  },
  searchIcon: { fontSize: 14, marginRight: 8, color: '#a0a5bd' },
  searchInput: { flex: 1, fontSize: 12, color: '#111e58', height: 44 },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: { fontSize: 16, color: '#424b7a' },

  // Select All
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#888fac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2541be',
    borderColor: '#2541be',
  },
  checkboxTick: { fontSize: 14, color: '#FFFFFF', lineHeight: 18, fontWeight: '700' },
  selectAllText: { fontSize: 12, color: '#111e58', fontWeight: '700', lineHeight: 17 },

  // Order card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 0,
    paddingTop: 0,
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  directionChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  buyChip: { backgroundColor: '#e2f4f1' },
  sellChip: { backgroundColor: '#f5e8ea' },
  directionText: { fontSize: 11, lineHeight: 14 },
  buyText: { color: '#008675' },
  sellText: { color: '#971b2f' },
  qtyText: { fontSize: 12, fontWeight: '700', color: '#000000', lineHeight: 17 },
  orderStatus: { fontSize: 10, color: '#424b7a', letterSpacing: -0.3 },
  cardBody: {
    backgroundColor: '#f7f6f2',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  cardBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolText: { fontSize: 12, fontWeight: '700', color: '#000000', lineHeight: 22, flex: 1, marginRight: 8 },
  priceText: { fontSize: 16, fontWeight: '700', color: '#000000', lineHeight: 22 },
  infoText: { fontSize: 10, color: '#68697e', lineHeight: 14, letterSpacing: -0.3 },
  cardSeparator: { height: 0.5, backgroundColor: '#e8e9f0', marginTop: 12 },

  // Modify form
  modifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  modifyTitle: { fontSize: 14, fontWeight: '700', color: '#111e58', marginBottom: 12, lineHeight: 22 },
  fieldLabel: { fontSize: 12, color: '#68697e', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#f1f1f1',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    color: '#111e58',
    backgroundColor: '#FFFFFF',
  },

  // Market status
  marketBanner: { padding: 10, borderRadius: 6, marginBottom: 12, alignItems: 'center' },
  marketOpen: { backgroundColor: '#e2f4f1' },
  marketClosed: { backgroundColor: '#fff3d4' },
  marketText: { fontSize: 12, fontWeight: '500', color: '#111e58' },

  errorText: { color: '#971b2f', fontSize: 12, textAlign: 'center', marginBottom: 12 },

  // Bottom action bar – Figma style
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 4,
  },
  actionBtn: {
    backgroundColor: '#2541be',
    borderRadius: 5,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, lineHeight: 22 },
  homeIndicator: {
    width: 133,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#000000',
    alignSelf: 'center',
    marginTop: 8,
    opacity: 0.2,
  },
});

export default OrderBookCancelScreen;
