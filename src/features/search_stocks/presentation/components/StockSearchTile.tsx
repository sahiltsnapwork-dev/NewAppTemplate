import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import type { StockEntity } from '../../domain/entities/StockEntity';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  item: StockEntity;
  onTap: (item: StockEntity) => void;
  onAddToWatchlist: (item: StockEntity) => void;
}

function getExchangeLabel(item: StockEntity): string {
  if (item.instrumentName === 'Future' || item.instrumentName === 'Options') {
    return item.exchange?.includes('BSE') ? 'BSEFO' : 'NSEFO';
  }
  return item.exchange ?? '';
}

function getSubtitle(item: StockEntity): string {
  if (item.instrumentName === 'Mutual Funds') {
    return item.schemeID ?? '';
  }
  if (item.instrumentName === 'Future' || item.instrumentName === 'Options') {
    const parts: string[] = [];
    if (item.expiryDate) parts.push(item.expiryDate.substring(0, 10));
    if (item.strikePrice != null) parts.push(String(item.strikePrice));
    if (item.optionType) parts.push(item.optionType);
    return parts.join(' | ');
  }
  return `${item.exchange ?? ''} | ${item.instrumentName ?? ''}`;
}

export const StockSearchTile: React.FC<Props> = ({ item, onTap, onAddToWatchlist }) => {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${item.companyName ?? item.symbol}, ${item.instrumentName}, tap to view`}
      onPress={() => onTap(item)}
      activeOpacity={0.7}
      style={styles.container}
    >
      <View style={styles.leftSection}>
        <Text style={styles.symbol} numberOfLines={1}>
          {item.symbol ?? item.companyName ?? '—'}
        </Text>
        <Text style={styles.companyName} numberOfLines={1}>
          {item.companyName ?? item.displayName ?? '—'}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {getSubtitle(item)}
        </Text>
      </View>
      <View style={styles.rightSection}>
        {item.instrumentName !== 'Mutual Funds' && (
          <View style={styles.exchangeBadge}>
            <Text style={styles.exchangeLabel}>{getExchangeLabel(item)}</Text>
          </View>
        )}
        {item.lastTradedPrice ? (
          <Text style={styles.ltp}>{item.lastTradedPrice}</Text>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Add ${item.symbol ?? item.companyName} to watchlist`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => onAddToWatchlist(item)}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  leftSection: {
    flex: 1,
    marginRight: 8,
  },
  symbol: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  companyName: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  exchangeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exchangeLabel: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
  },
  ltp: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 18,
    color: '#2563EB',
    lineHeight: 20,
  },
});
