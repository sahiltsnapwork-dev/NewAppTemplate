// QuoteTabBar Component
// Converted from Flutter TabBar with horizontal scroll
// TabController → useState in parent; this is a stateless display component

import React, { useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, fonts, spacing, typography } from './styles/tokens';

interface Props {
  tabs: string[];
  selectedIndex: number;
  onTabChange: (index: number) => void;
}

export function QuoteTabBar({ tabs, selectedIndex, onTabChange }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  function handleTabPress(index: number) {
    onTabChange(index);
    // Scroll to make selected tab visible
    scrollRef.current?.scrollTo({ x: index * 80, animated: true });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {tabs.map((tab, index) => {
          const isSelected = index === selectedIndex;
          return (
            <TouchableOpacity
              key={`tab-${index}`}
              onPress={() => handleTabPress(index)}
              style={[styles.tab, isSelected && styles.tabSelected]}
              accessibilityLabel={`${tab} tab`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                {tab}
              </Text>
              {isSelected && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    backgroundColor: colors.surface,
  },
  scrollView: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: spacing.sm,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    position: 'relative',
  },
  tabSelected: {},
  tabText: {
    fontSize: typography.small,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    whiteSpace: 'nowrap',
  } as ReturnType<typeof StyleSheet.create>[string],
  tabTextSelected: {
    fontFamily: fonts.medium,
    color: colors.positive,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.positive,
    borderRadius: 1,
  },
});
