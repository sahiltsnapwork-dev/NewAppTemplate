// Order Book Details Screen
// Source: order_book_details_screen_v2.dart → OrderBookDetailsScreenV2
// Shows full order info + trade history + Cancel/Modify/CTD actions

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { OrderBookNavigatorParams } from '../navigation/OrderBookNavigator';
import type { AppDispatch } from '../../../../store/store';
import type { TradeBookDetails } from '../../domain/entities/TradeBookEntry';
import type { ConvertToDeliveryRequest } from '../../domain/entities/PlaceOrder';

import { fetchTradeBookThunk, convertToDeliveryThunk } from '../../state/thunks/orderBookThunks';
import {
  selectTradeBook,
  selectOrderBookIsLoading,
  selectCtdResult,
  selectOrderBookError,
} from '../../state/selectors/orderBookSelectors';
import { clearCtdResult } from '../../state/slices/orderBookSlice';

import ConvertToDeliveryDialog from '../components/ConvertToDeliveryDialog';
import OrderStatusBadge from '../components/OrderStatusBadge';

const ACCOUNT = { tradingAccountNumber: '12345678', accountSettlementType: 0 };

type Props = NativeStackScreenProps<OrderBookNavigatorParams, 'OrderBookDetails'>;

const OrderBookDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { order } = route.params;
  const dispatch = useDispatch<AppDispatch>();

  const tradeBook = useSelector(selectTradeBook);
  const isLoading = useSelector(selectOrderBookIsLoading);
  const ctdResult = useSelector(selectCtdResult);
  const error = useSelector(selectOrderBookError);

  const [showCtdDialog, setShowCtdDialog] = useState(false);

  // Trade details for this order
  const tradeDetails: TradeBookDetails | undefined = tradeBook.find(
    (t) => t.exchangeOrderNumber === order.exchangeOrderNumber
  );

  useEffect(() => {
    // Fetch trade details for this specific order number
    dispatch(
      fetchTradeBookThunk({
        tradingAccountNumber: ACCOUNT.tradingAccountNumber,
        accountSettlementType: ACCOUNT.accountSettlementType,
        orderNumber: order.exchangeOrderNumber,
      })
    );
  }, [dispatch, order.exchangeOrderNumber]);

  useEffect(() => {
    if (ctdResult) {
      if (ctdResult.statusCode === 'S') {
        Alert.alert('Success', 'Convert to Delivery successful', [
          { text: 'OK', onPress: () => { dispatch(clearCtdResult()); navigation.goBack(); } },
        ]);
      } else {
        Alert.alert('Error', ctdResult.message ?? 'CTD failed');
        dispatch(clearCtdResult());
      }
    }
  }, [ctdResult, dispatch, navigation]);

  const handleCancel = useCallback(() => {
    navigation.navigate('OrderBookCancel', { order, action: 'cancel' });
  }, [navigation, order]);

  const handleModify = useCallback(() => {
    navigation.navigate('OrderBookCancel', { order, action: 'modify' });
  }, [navigation, order]);

  const handleCtdConfirm = useCallback(
    (quantity: number) => {
      setShowCtdDialog(false);
      const request: ConvertToDeliveryRequest = {
        convertToDeliveryDetails: {
          exchangeIdentity: order.exchangeIdentity,
          fromProduct: order.orderLegDetails.product,
          instrumentIdentity: {
            instrumentId: order.instrumentIdentity.instrumentId,
            instrumentIdType: order.instrumentIdentity.instrumentIdType,
            instrumentSegment: order.instrumentIdentity.instrumentSegment,
            instrumentType: order.instrumentIdentity.instrumentType,
          },
          orderTradeDetails: {
            emarginDate: '',
            exchangeOrderNumber: order.exchangeOrderNumber,
            exchangeTradeNumber: tradeDetails?.trades[0]?.exchangeTradeNumber ?? '',
            internalOrderNumber: tradeDetails?.trades[0]?.internalOrderNumber ?? 0,
            orderSerialNumber: tradeDetails?.trades[0]?.orderSerialNumber ?? 0,
            orderSide: order.orderLegDetails.orderSide,
          },
          toProduct: 1,
          tradePriceDetails: { tradePrice: tradeDetails?.averageTradePrice ?? order.orderPrice },
          tradeQuantityDetails: { quantity },
        },
        tradingAccountDetails: order.tradingAccountDetails,
      };
      dispatch(convertToDeliveryThunk(request));
    },
    [dispatch, order, tradeDetails]
  );

  const symbolName =
    order.instrumentIdentity.lsSymbol ?? order.instrumentIdentity.lssymbol ?? 'N/A';
  const isBuy = order.orderLegDetails.orderSide === 1;
  const canCancel = order.orderBookStatus === 'OPEN' && order.orderStatus === 'Pending';
  const canCtd = order.tradedQuantity > 0 && order.orderLegDetails.product !== 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.symbol}>{symbolName}</Text>
          <OrderStatusBadge status={order.orderStatus} />
        </View>
        <Text style={styles.exchangeLabel}>
          {order.exchangeIdentity.exchangeId} · {order.productDescription ?? 'Cash'}
          {order.isAmoOrder ? ' · AMO' : ''}
        </Text>

        {/* Order Details Grid */}
        <View style={styles.detailsGrid}>
          <DetailRow label="Direction" value={isBuy ? 'BUY' : 'SELL'} valueColor={isBuy ? '#009900' : '#CC0000'} />
          <DetailRow label="Qty" value={String(order.orderQuantity)} />
          <DetailRow label="Price" value={order.orderPrice > 0 ? `₹${order.orderPrice.toFixed(2)}` : 'MKT'} />
          {order.triggerPrice && order.triggerPrice > 0 && (
            <DetailRow label="Trigger" value={`₹${order.triggerPrice.toFixed(2)}`} />
          )}
          <DetailRow label="Traded Qty" value={String(order.tradedQuantity)} />
          {order.averageTradePrice && order.averageTradePrice > 0 && (
            <DetailRow label="Avg Price" value={`₹${order.averageTradePrice.toFixed(2)}`} />
          )}
          <DetailRow label="Remaining" value={String(order.remainingQuantity)} />
          <DetailRow label="Order No." value={order.exchangeOrderNumber} />
          <DetailRow label="Order Time" value={formatDateTime(order.orderDateTime)} />
        </View>
      </View>

      {/* Trade History */}
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#0066CC" />
          <Text style={styles.loadingText}>Loading trade details...</Text>
        </View>
      ) : tradeDetails && tradeDetails.trades.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trade History</Text>
          {tradeDetails.trades.map((trade, idx) => (
            <View key={trade.tradeNumber} style={styles.tradeRow}>
              <Text style={styles.tradeLabel}>Trade {idx + 1}</Text>
              <Text style={styles.tradeValue}>Qty: {trade.tradedQuantity}</Text>
              <Text style={styles.tradeValue}>Price: ₹{trade.tradePrice.toFixed(2)}</Text>
              <Text style={styles.tradeTime}>{formatDateTime(trade.tradeDateTime)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Bottom Action Buttons */}
      <View style={styles.actionRow}>
        {canCancel && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={handleCancel}
              accessibilityLabel="Cancel order"
            >
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.modifyBtn]}
              onPress={handleModify}
              accessibilityLabel="Modify order"
            >
              <Text style={styles.modifyBtnText}>Modify</Text>
            </TouchableOpacity>
          </>
        )}
        {canCtd && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.ctdBtn]}
            onPress={() => setShowCtdDialog(true)}
            accessibilityLabel="Convert to delivery"
          >
            <Text style={styles.ctdBtnText}>Convert to Delivery</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CTD Dialog */}
      <ConvertToDeliveryDialog
        visible={showCtdDialog}
        symbolName={order.instrumentIdentity.lsSymbol ?? order.instrumentIdentity.lssymbol ?? ''}
        maxQuantity={order.tradedQuantity}
        onConfirm={handleCtdConfirm}
        onDismiss={() => setShowCtdDialog(false)}
      />
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

function formatDateTime(dt: string): string {
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  symbol: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  exchangeLabel: { fontSize: 12, color: '#888888', marginBottom: 12 },

  detailsGrid: {},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: { fontSize: 13, color: '#666666' },
  detailValue: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E', marginBottom: 10 },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
    flexWrap: 'wrap',
  },
  tradeLabel: { fontSize: 12, color: '#888888', width: 60 },
  tradeValue: { fontSize: 12, color: '#1A1A2E' },
  tradeTime: { fontSize: 11, color: '#AAAAAA' },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: { marginLeft: 8, color: '#666666', fontSize: 14 },

  errorText: { color: '#CC0000', fontSize: 13, textAlign: 'center', marginVertical: 8 },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#CC0000' },
  cancelBtnText: { color: '#CC0000', fontWeight: '600', fontSize: 14 },
  modifyBtn: { backgroundColor: '#F0F6FF', borderWidth: 1, borderColor: '#0066CC' },
  modifyBtnText: { color: '#0066CC', fontWeight: '600', fontSize: 14 },
  ctdBtn: { backgroundColor: '#0066CC' },
  ctdBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});

export default OrderBookDetailsScreen;
