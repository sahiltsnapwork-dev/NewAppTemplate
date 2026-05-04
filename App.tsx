/**
 * HDFC MTrader — App Entry Point
 * Home screen → GetQuote screen navigation
 */

import React from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { COLORS } from './src/modules/getQuote/constants';
import { useAppDispatch, useAppSelector, selectTabsApiEnabled } from './src/modules/getQuote/store/hooks';
import { setTabsApiEnabled } from './src/modules/getQuote/store/getQuoteSlice';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { store } from './src/modules/getQuote/store/store';
import { GetQuoteScreen, GetQuoteScreenProps } from './src/modules/getQuote/screens/GetQuoteScreen';

// ── Navigation types ──────────────────────────────────────────────────────────
type RootStackParamList = {
  Home: undefined;
  GetQuote: GetQuoteScreenProps;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Home Screen ───────────────────────────────────────────────────────────────
function HomeScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}) {
  const dispatch = useAppDispatch();
  const tabsApiEnabled = useAppSelector(selectTabsApiEnabled);
  return (
    <View style={styles.homeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <Text style={styles.appTitle}>HDFC MTrader</Text>
      <Text style={styles.appSubtitle}>Market Research Platform</Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Tabs: API</Text>
        <Switch
          value={tabsApiEnabled}
          onValueChange={(val) => { dispatch(setTabsApiEnabled(val)); }}
          trackColor={{ false: '#444', true: '#1A73E8' }}
          thumbColor={tabsApiEnabled ? '#ffffff' : '#ffffff'}
        />
      </View>

      <TouchableOpacity
        style={styles.quoteButton}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate('GetQuote', { symbol: 'HDFCBANK', exchange: 'NSE' })
        }
      >
        <Text style={styles.quoteButtonText}>Get Quote</Text>
        <Text style={styles.quoteButtonSub}>HDFCBANK · NSE</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── GetQuote Screen wrapper (receives route params) ───────────────────────────
function GetQuoteScreenWrapper({
  route,
}: {
  route: { params: GetQuoteScreenProps };
}) {
  return <GetQuoteScreen {...route.params} />;
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: COLORS.background },
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="GetQuote" component={GetQuoteScreenWrapper} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  appTitle: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  appSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 56,
  },
  quoteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  quoteButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quoteButtonSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  switchLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    marginRight: 12,
  },
});

export default App;
