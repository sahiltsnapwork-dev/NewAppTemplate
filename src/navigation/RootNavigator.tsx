import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { GetQuoteDetailsScreen } from '../modules/getQuote/presentation/screens/GetQuoteDetailsScreen';

export type RootStackParamList = {
  Home: undefined;
  GetQuoteDetails: {
    symbol: string;
    exchange: 'NSE' | 'BSE';
    stockType?: string;
    isMinQuote?: boolean;
    selectedTabName?: string;
    cmotId?: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator initialRouteName="Home">
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="GetQuoteDetails"
        component={GetQuoteDetailsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
