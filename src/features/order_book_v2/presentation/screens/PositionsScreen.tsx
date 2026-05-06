// Positions Screen V2
// Source: positions_screen_v2.dart → PositionsScreenV2
// Shows Net Position + Open Position with P&L summary, search, filter

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../../../store/store';
import type { CumulativePositionList, PositionsSummary } from '../../domain/entities/Position';

import {
  selectFilteredPositions,
  selectPositionsSummary,
  selectPositionsIsLoading,
  selectPositionsSearchQuery,
  selectIsCarryForwardView,
  selectPositionsSegmentFilter,
  selectPositionsError,
} from '../../state/selectors/positionsSelectors';
import {
  setSearchQuery,
  toggleCarryForwardView,
  setSegmentFilter,
} from '../../state/slices/positionsSlice';
import PositionRow from '../components/PositionRow';
import PositionsSummaryCard from '../components/PositionsSummaryCard';

interface Props {
  positions: CumulativePositionList[];
  summary: PositionsSummary | null;
  isLoading: boolean;
  onPositionTap: (position: CumulativePositionList) => void;
  onExitTap: (position: CumulativePositionList) => void;
  onConvertTap: (position: CumulativePositionList) => void;
  onAddTap: (position: CumulativePositionList) => void;
  refreshing: boolean;
  onRefresh: () => void;
}

const PositionsList: React.FC<Props> = ({
  positions,
  summary,
  isLoading,
  onPositionTap,
  onExitTap,
  onConvertTap,
  onAddTap,
  refreshing,
  onRefresh,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const searchQuery = useSelector(selectPositionsSearchQuery);
  const filteredPositions = useSelector(selectFilteredPositions);
  const isCarryForwardView = useSelector(selectIsCarryForwardView);
  const segmentFilter = useSelector(selectPositionsSegmentFilter);
  const error = useSelector(selectPositionsError);

  const handleSearch = useCallback(
    (text: string) => {
      dispatch(setSearchQuery(text));
    },
    [dispatch]
  );

  const handleToggleCF = useCallback(() => {
    dispatch(toggleCarryForwardView(!isCarryForwardView));
  }, [dispatch, isCarryForwardView]);

  const renderItem = useCallback(
    ({ item }: { item: CumulativePositionList }) => (
      <PositionRow
        position={item}
        onPress={() => onPositionTap(item)}
        onExitPress={() => onExitTap(item)}
        onConvertPress={() => onConvertTap(item)}
        onAddPress={() => onAddTap(item)}
      />
    ),
    [onPositionTap, onExitTap, onConvertTap, onAddTap]
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* P&L Summary Card */}
      {summary && <PositionsSummaryCard summary={summary} />}

      {/* T+1 / T0 Toggle */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, isCarryForwardView && styles.toggleBtnActive]}
          onPress={handleToggleCF}
          accessibilityLabel="Toggle carry forward view"
        >
          <Text style={[styles.toggleText, isCarryForwardView && styles.toggleTextActive]}>
            {isCarryForwardView ? 'Carry Forward' : 'Today'}
          </Text>
        </TouchableOpacity>

        {/* Segment Filter */}
        <View style={styles.segmentRow}>
          {['ALL', 'Equity', 'F&O'].map((seg) => (
            <TouchableOpacity
              key={seg}
              style={[styles.segBtn, segmentFilter === seg && styles.segBtnActive]}
              onPress={() => dispatch(setSegmentFilter(seg))}
            >
              <Text style={[styles.segText, segmentFilter === seg && styles.segTextActive]}>
                {seg}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search Field */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search positions..."
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
          accessibilityLabel="Search positions"
        />
      </View>

      {/* Positions List */}
      {filteredPositions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No positions found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPositions}
          keyExtractor={(item) =>
            `${item.instrumentIdentity.instrumentId}-${item.instrumentSegment}`
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },

  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
  },
  toggleBtnActive: { backgroundColor: '#0066CC' },
  toggleText: { fontSize: 12, color: '#666666', fontWeight: '500' },
  toggleTextActive: { color: '#FFFFFF' },

  segmentRow: { flexDirection: 'row', gap: 4 },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  segBtnActive: { backgroundColor: '#0066CC' },
  segText: { fontSize: 12, color: '#666666' },
  segTextActive: { color: '#FFFFFF' },

  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  searchInput: {
    backgroundColor: '#F5F6FA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },

  listContent: { paddingBottom: 16, paddingTop: 4 },

  errorText: { color: '#CC0000', fontSize: 14, textAlign: 'center' },
  emptyText: { fontSize: 15, color: '#999999' },
});

export default PositionsList;
