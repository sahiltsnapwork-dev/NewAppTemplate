// NewsTab — company news, announcements, bulk/block deals
// Converted from Flutter NewsWidget with TabBar (News / Announcements / Bulk-Block)
// TabController → useState selectedNewsTab

import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fonts, spacing, typography } from '../styles/tokens';
import type { NewsEntity } from '../../../domain/entities/NewsEntity';
import type { BulkBlockEntity } from '../../../domain/entities/BulkBlockEntity';

interface Props {
  news: NewsEntity[];
  announcements: NewsEntity[];
  bulkBlock: BulkBlockEntity[];
  isLoading: boolean;
}

type NewsSubTab = 'News' | 'Announcements' | 'Bulk/Block';
const SUB_TABS: NewsSubTab[] = ['News', 'Announcements', 'Bulk/Block'];

function NewsCard({ item }: { item: NewsEntity }) {
  return (
    <View style={styles.card}>
      <Text style={styles.headline} numberOfLines={2}>{item.headline}</Text>
      <Text style={styles.meta}>{item.source ?? ''} · {item.publishedDate ?? ''}</Text>
      {item.content ? (
        <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
      ) : null}
    </View>
  );
}

function BulkBlockCard({ item }: { item: BulkBlockEntity }) {
  const isBlock = item.type === 'Block';
  return (
    <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: isBlock ? '#1976D2' : '#F57C00' }]}>
      <View style={styles.bbHeader}>
        <Text style={styles.bbSymbol}>{item.symbol}</Text>
        <View style={[styles.bbBadge, { backgroundColor: isBlock ? '#1976D2' : '#F57C00' }]}>
          <Text style={styles.bbBadgeText}>{item.type}</Text>
        </View>
      </View>
      <Text style={styles.meta}>{item.exchange} · {item.date}</Text>
      <View style={styles.bbDetails}>
        <Text style={styles.bbDetail}>Qty: {(item.dealQuantity ?? 0).toLocaleString('en-IN')}</Text>
        <Text style={styles.bbDetail}>Price: ₹{(item.dealPrice ?? 0).toFixed(2)}</Text>
      </View>
      {item.buyerName ? <Text style={styles.bbParty}>Buyer: {item.buyerName}</Text> : null}
      {item.sellerName ? <Text style={styles.bbParty}>Seller: {item.sellerName}</Text> : null}
    </View>
  );
}

export function NewsTab({ news, announcements, bulkBlock, isLoading }: Props) {
  const [selectedSubTab, setSelectedSubTab] = useState<NewsSubTab>('News');

  function renderContent() {
    if (isLoading) {
      return <ActivityIndicator style={styles.loader} color={colors.positive} />;
    }

    if (selectedSubTab === 'News') {
      if (!news.length) return <Text style={styles.emptyText}>No news available</Text>;
      return (
        <FlatList
          data={news}
          keyExtractor={(item, i) => item.id ?? `news-${i}`}
          renderItem={({ item }) => <NewsCard item={item} />}
          scrollEnabled={false}
        />
      );
    }

    if (selectedSubTab === 'Announcements') {
      if (!announcements.length) return <Text style={styles.emptyText}>No announcements available</Text>;
      return (
        <FlatList
          data={announcements}
          keyExtractor={(item, i) => item.id ?? `ann-${i}`}
          renderItem={({ item }) => <NewsCard item={item} />}
          scrollEnabled={false}
        />
      );
    }

    // Bulk/Block
    if (!bulkBlock.length) return <Text style={styles.emptyText}>No bulk/block deals available</Text>;
    return (
      <FlatList
        data={bulkBlock}
        keyExtractor={(item, i) => item.dealId ?? `bb-${i}`}
        renderItem={({ item }) => <BulkBlockCard item={item} />}
        scrollEnabled={false}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        {SUB_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTab, selectedSubTab === tab && styles.subTabActive]}
            onPress={() => setSelectedSubTab(tab)}
            accessibilityLabel={`${tab} sub-tab`}
          >
            <Text style={[styles.subTabText, selectedSubTab === tab && styles.subTabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    paddingHorizontal: spacing.md,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: { borderBottomColor: colors.positive },
  subTabText: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary },
  subTabTextActive: { fontFamily: fonts.medium, color: colors.positive },
  content: { flex: 1, padding: spacing.md },
  loader: { marginTop: 48, alignSelf: 'center' },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: typography.body,
    fontFamily: fonts.regular,
    marginTop: 48,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  headline: { fontSize: typography.body, fontFamily: fonts.medium, color: colors.textPrimary, marginBottom: 4 },
  meta: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary, marginBottom: 4 },
  content: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textPrimary, lineHeight: 18 },
  bbHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  bbSymbol: { fontSize: typography.body, fontFamily: fonts.medium, color: colors.textPrimary },
  bbBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  bbBadgeText: { color: '#FFF', fontSize: 11, fontFamily: fonts.medium },
  bbDetails: { flexDirection: 'row', gap: 16, marginTop: 4 },
  bbDetail: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textPrimary },
  bbParty: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary, marginTop: 2 },
});
