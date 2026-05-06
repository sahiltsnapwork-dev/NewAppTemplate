import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParams } from '../navigation/AppNavigator';
import { isMockEnabled, setMockEnabled } from '../features/order_book_v2/mock/mockConfig';

type Props = NativeStackScreenProps<RootStackParams, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [mockOn, setMockOn] = useState<boolean>(isMockEnabled());

  const handleMockToggle = useCallback((value: boolean) => {
    setMockOn(value);
    setMockEnabled(value);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>HDFC Securities</Text>
        <Text style={styles.appSubtitle}>InvestRight v4.7</Text>
      </View>

      {/* Mock Data Toggle Card */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardTextBlock}>
            <Text style={styles.cardTitle}>Mock Data</Text>
            <Text style={styles.cardSubtitle}>
              {mockOn
                ? 'Using local mock responses'
                : 'Using live API calls'}
            </Text>
          </View>
          <Switch
            value={mockOn}
            onValueChange={handleMockToggle}
            trackColor={{ false: '#DDDDDD', true: '#66A3E0' }}
            thumbColor={mockOn ? '#0066CC' : '#FFFFFF'}
            accessibilityLabel="Toggle mock data"
            accessibilityRole="switch"
          />
        </View>

        {/* Status indicator */}
        <View style={[styles.statusPill, mockOn ? styles.statusMock : styles.statusLive]}>
          <View style={[styles.statusDot, mockOn ? styles.statusDotMock : styles.statusDotLive]} />
          <Text style={[styles.statusText, mockOn ? styles.statusTextMock : styles.statusTextLive]}>
            {mockOn ? 'MOCK MODE' : 'LIVE MODE'}
          </Text>
        </View>
      </View>

      {/* Navigate to Order Book */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('OrderBook')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Open Order Book"
      >
        <Text style={styles.navButtonText}>Open Order Book</Text>
        <Text style={styles.navButtonArrow}>→</Text>
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        Toggle mock data before opening Order Book to switch data source.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  header: {
    marginBottom: 32,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTextBlock: { flex: 1, marginRight: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#888888',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  statusMock: { backgroundColor: '#EBF3FF' },
  statusLive: { backgroundColor: '#E6F9EE' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotMock: { backgroundColor: '#0066CC' },
  statusDotLive: { backgroundColor: '#009900' },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statusTextMock: { color: '#0066CC' },
  statusTextLive: { color: '#009900' },

  navButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  navButtonArrow: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },

  footerNote: {
    fontSize: 12,
    color: '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});

export default HomeScreen;
