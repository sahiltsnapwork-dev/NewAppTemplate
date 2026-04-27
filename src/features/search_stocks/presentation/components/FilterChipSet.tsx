import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Text,
  useColorScheme,
} from 'react-native';

const FILTER_ITEMS = ['All', 'Equity', 'Future', 'Options', 'ETF', 'Mutual Funds', 'SGB'];

interface Props {
  activeFilter: string;
  isMfSelected?: boolean;
  onFilterTap: (filter: string) => void;
}

export const FilterChipSet: React.FC<Props> = ({
  activeFilter,
  isMfSelected,
  onFilterTap,
}) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <FlatList
      horizontal
      data={FILTER_ITEMS}
      keyExtractor={(item) => item}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => {
        const isSelected = item.toLowerCase() === activeFilter.toLowerCase();
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${item}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onFilterTap(item)}
            style={[
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipDefault,
            ]}
          >
            <Text
              style={[
                styles.chipLabel,
                isSelected ? styles.chipLabelSelected : styles.chipLabelDefault,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    marginHorizontal: 3,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipDefault: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(150,150,150,0.5)',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
  chipLabelDefault: {
    color: '#6B7280',
  },
});
