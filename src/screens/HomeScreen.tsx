import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { mockConfig } from '../modules/getQuote/mock/mockConfig';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export function HomeScreen({ navigation }: Props) {
  const [isMock, setIsMock] = useState(mockConfig.globalMockEnabled);

  function handleToggle(value: boolean) {
    mockConfig.globalMockEnabled = value;
    setIsMock(value);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>

        {/* Mock / Live toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelGroup}>
              <Text style={styles.toggleLabel}>Data Source</Text>
              <Text style={[styles.toggleStatus, { color: isMock ? '#F57C00' : '#079b39' }]}>
                {isMock ? 'Mock Data' : 'Live API'}
              </Text>
            </View>
            <Switch
              value={isMock}
              onValueChange={handleToggle}
              thumbColor={isMock ? '#F57C00' : '#079b39'}
              trackColor={{ false: '#c8e6c9', true: '#ffe0b2' }}
              accessibilityLabel="Toggle mock data"
            />
          </View>
          <Text style={styles.toggleHint}>
            {isMock
              ? 'Using hardcoded mock responses (no network)'
              : 'Calling real HDFC API endpoints'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('GetQuoteDetails', {
              symbol: 'HDFCBANK',
              exchange: 'NSE',
              cmotId: 4987, // HDFCBANK company code (used for irmscontenta APIs)
            })
          }
          accessibilityLabel="Go to Get Quote"
        >
          <Text style={styles.buttonText}>Get Quote</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222222',
  },
  toggleCard: {
    width: '100%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  toggleLabelGroup: {
    gap: 2,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },
  toggleStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleHint: {
    fontSize: 12,
    color: '#7C7C7C',
  },
  button: {
    backgroundColor: '#079b39',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
