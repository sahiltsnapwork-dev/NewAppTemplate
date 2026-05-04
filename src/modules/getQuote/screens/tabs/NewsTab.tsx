// ─── News Tab ─────────────────────────────────────────────────────────────────
// Maps to Flutter: News tab → quoteNewsDetailList + GqNewsDetails
// Event: GetNewsDetailsApiEvent

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useAppSelector } from '../../store/hooks';
import { GqNewsDetails } from '../../models/AnalyticsModels';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

const NewsItem: React.FC<{ item: GqNewsDetails; index: number }> = ({ item }) => {
  const handlePress = () => {
    if (item.link) {
      Linking.openURL(item.link).catch(() =>
        Alert.alert('Error', 'Unable to open article link'),
      );
    } else {
      Alert.alert(item.headline ?? 'News', item.content ?? 'No content available.');
    }
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <TouchableOpacity style={styles.newsItem} onPress={handlePress} activeOpacity={0.85}>
      <View style={styles.newsLeft}>
        <View style={styles.categoryRow}>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
          <Text style={styles.timeText}>{timeAgo(item.publishedDate)}</Text>
        </View>
        <Text style={styles.headline} numberOfLines={3}>
          {item.headline}
        </Text>
        <Text style={styles.source}>{item.source}</Text>
      </View>
      {item.isBookmarked != null && (
        <Text style={[styles.bookmarkIcon, item.isBookmarked && { color: COLORS.primary }]}>
          {item.isBookmarked ? '🔖' : '📄'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const NewsTab: React.FC<Props> = ({ symbol }) => {
  const news = useAppSelector(s => s.getQuote.news);
  const loading = useAppSelector(s => s.getQuote.newsLoading);

  if (loading && news.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading news…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={news}
      keyExtractor={(item, i) => item.id ?? `news_${i}`}
      renderItem={({ item, index }) => <NewsItem item={item} index={index} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No news available for {symbol}</Text>
        </View>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Latest News</Text>
          <Text style={styles.headerCount}>{news.length} articles</Text>
        </View>
      }
      contentContainerStyle={styles.listContent}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingBottom: SPACING.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerCount: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  newsItem: {
    flexDirection: 'row',
    padding: SPACING.base,
    backgroundColor: COLORS.surface,
    alignItems: 'flex-start',
  },
  newsLeft: { flex: 1 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  categoryBadge: {
    backgroundColor: 'rgba(26,115,232,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
  },
  timeText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  headline: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  source: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  bookmarkIcon: {
    fontSize: 16,
    marginLeft: SPACING.sm,
    color: COLORS.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: SPACING.base,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: 60,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.base,
    textAlign: 'center',
  },
});
