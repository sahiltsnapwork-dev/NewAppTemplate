// EventsTab — corporate events (board meetings, dividends, AGM, etc.)
// Converted from Flutter EventsWidget

import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, spacing, typography } from '../styles/tokens';
import type { EventEntity } from '../../../domain/entities/EventEntity';

interface Props {
  events: EventEntity[];
  isLoading: boolean;
}

const EVENT_COLORS: Record<string, string> = {
  board_meeting: '#1976D2',
  dividend: colors.positive,
  agm: '#F57C00',
  bonus: '#7B1FA2',
  split: '#0288D1',
  default: colors.textSecondary,
};

function getEventColor(type: string | null | undefined): string {
  if (!type) return EVENT_COLORS.default;
  const key = type.toLowerCase().replace(/\s+/g, '_');
  return EVENT_COLORS[key] ?? EVENT_COLORS.default;
}

function EventCard({ item }: { item: EventEntity }) {
  const color = getEventColor(item.eventType);
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.typeText, { color }]}>
            {item.eventType ?? 'Event'}
          </Text>
        </View>
        <Text style={styles.dateText}>{item.eventDate ?? ''}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}
      {item.impact != null ? (
        <Text style={[styles.impact, {
          color: item.impact > 0 ? colors.positive
            : item.impact < 0 ? colors.negative
              : colors.textSecondary,
        }]}>
          Impact: {item.impact > 0 ? '+' : ''}{item.impact}
        </Text>
      ) : null}
    </View>
  );
}

export function EventsTab({ events, isLoading }: Props) {
  if (isLoading) {
    return <ActivityIndicator style={styles.loader} color={colors.positive} />;
  }

  return (
    <View style={styles.container}>
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No events available</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item, i) => item.eventId ?? `event-${i}`}
          renderItem={({ item }) => <EventCard item={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loader: { marginTop: 48, alignSelf: 'center' },
  listContent: { padding: spacing.md },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyText: { color: colors.textSecondary, fontSize: typography.body, fontFamily: fonts.regular },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  typeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontFamily: fonts.medium },
  dateText: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textSecondary },
  title: { fontSize: typography.body, fontFamily: fonts.medium, color: colors.textPrimary, marginBottom: 4 },
  description: { fontSize: typography.small, fontFamily: fonts.regular, color: colors.textPrimary, lineHeight: 18 },
  impact: { fontSize: typography.small, fontFamily: fonts.medium, marginTop: 4 },
});
