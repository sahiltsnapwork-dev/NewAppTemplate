import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import OrderBookNavigator from '../features/order_book_v2/presentation/navigation/OrderBookNavigator';

export type RootStackParams = {
  Home: undefined;
  OrderBook: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParams>();

const AppNavigator: React.FC = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Home" component={HomeScreen} />
    <RootStack.Screen name="OrderBook" component={OrderBookNavigator} />
  </RootStack.Navigator>
);

export default AppNavigator;
