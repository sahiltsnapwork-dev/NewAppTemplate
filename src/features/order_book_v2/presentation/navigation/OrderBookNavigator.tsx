// Navigation: Order Book V2
// Source: Flutter navigation structure – OrderBookPageV2 → OrderBookScreenV2 → sub-screens
// Uses React Navigation Stack + typed params

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OrderBookScreen from '../screens/OrderBookScreen';
import OrderBookDetailsScreen from '../screens/OrderBookDetailsScreen';
import OrderBookCancelScreen from '../screens/OrderBookCancelScreen';
import PositionsDetailsScreen from '../screens/PositionsDetailsScreen';
import ConvertPositionScreen from '../screens/ConvertPositionScreen';
import ExitOpenPositionsScreen from '../screens/ExitOpenPositionsScreen';

import type { OrderBookEntry } from '../../domain/entities/OrderBookEntry';
import type { CumulativePositionList } from '../../domain/entities/Position';

// ── Route Param Types ─────────────────────────────────────────────────────────
export type OrderBookNavigatorParams = {
  OrderBook: undefined;
  OrderBookDetails: { order: OrderBookEntry };
  OrderBookCancel: { order: OrderBookEntry; action: 'cancel' | 'modify' };
  PositionsDetails: { position: CumulativePositionList };
  ConvertPosition: { position: CumulativePositionList };
  ExitOpenPositions: { position: CumulativePositionList };
};

const Stack = createNativeStackNavigator<OrderBookNavigatorParams>();

const OrderBookNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="OrderBook"
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#1A1A2E',
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
      }}
    >
      <Stack.Screen
        name="OrderBook"
        component={OrderBookScreen}
        options={{ title: 'Order Book' }}
      />
      <Stack.Screen
        name="OrderBookDetails"
        component={OrderBookDetailsScreen}
        options={{ title: 'Order Details' }}
      />
      <Stack.Screen
        name="OrderBookCancel"
        component={OrderBookCancelScreen}
        options={({ route }) => ({
          title: route.params.action === 'modify' ? 'Modify Order' : 'Cancel Order',
        })}
      />
      <Stack.Screen
        name="PositionsDetails"
        component={PositionsDetailsScreen}
        options={{ title: 'Position Details' }}
      />
      <Stack.Screen
        name="ConvertPosition"
        component={ConvertPositionScreen}
        options={{ title: 'Convert Position' }}
      />
      <Stack.Screen
        name="ExitOpenPositions"
        component={ExitOpenPositionsScreen}
        options={{ title: 'Exit Position' }}
      />
    </Stack.Navigator>
  );
};

export default OrderBookNavigator;
