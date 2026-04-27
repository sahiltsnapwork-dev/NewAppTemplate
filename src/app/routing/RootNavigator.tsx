import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SearchStocksScreen } from '../../features/search_stocks/presentation/screens/SearchStocksScreen';
import { HomeScreen } from '../screens/HomeScreen';
import type { RootStackParamList } from '../../features/search_stocks/navigation/navigationTypes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="SearchStocksScreen"
          component={SearchStocksScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
