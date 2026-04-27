import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/navigationTypes';
import {
  setQuery,
  setActiveFilter,
  clearSearch,
  searchStocksThunk,
  fetchTrendingStocksThunk,
  loadHistoryThunk,
  saveHistoryItemThunk,
  deleteHistoryItemThunk,
} from '../../state/store/searchStocksSlice';
import {
  selectQuery,
  selectActiveFilter,
  selectSearchResults,
  selectTrendingStocks,
  selectHistoryStocks,
  selectSearchStatus,
  selectTrendingStatus,
  selectView,
} from '../../state/selectors/searchStocksSelectors';
import { FilterChipSet } from '../components/FilterChipSet';
import { SearchResultsList } from '../components/SearchResultsList';
import { StockSectionList } from '../components/StockSectionList';
import type { StockEntity } from '../../domain/entities/StockEntity';
import type { AppDispatch } from '../../../app/state/store';

type Props = NativeStackScreenProps<RootStackParamList, 'SearchStocksScreen'>;

const DEBOUNCE_MS = 400;

export const SearchStocksScreen: React.FC<Props> = ({ navigation, route }) => {
  const { fromScreen, autoFocusSearchBox = false } = route.params ?? {};
  const dispatch = useDispatch<AppDispatch>();
  const isDark = useColorScheme() === 'dark';

  const query = useSelector(selectQuery);
  const activeFilter = useSelector(selectActiveFilter);
  const searchResults = useSelector(selectSearchResults);
  const trendingStocks = useSelector(selectTrendingStocks);
  const historyStocks = useSelector(selectHistoryStocks);
  const searchStatus = useSelector(selectSearchStatus);
  const trendingStatus = useSelector(selectTrendingStatus);
  const view = useSelector(selectView);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    dispatch(loadHistoryThunk());
    dispatch(fetchTrendingStocksThunk());
    return () => {
      dispatch(clearSearch());
    };
  }, [dispatch]);

  const handleQueryChange = useCallback(
    (text: string) => {
      dispatch(setQuery(text));
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (text.trim().length >= 1) {
        debounceTimer.current = setTimeout(() => {
          dispatch(searchStocksThunk(text.trim()));
        }, DEBOUNCE_MS);
      }
    },
    [dispatch],
  );

  const handleBackPress = useCallback(() => {
    if (query.length > 0) {
      dispatch(clearSearch());
      inputRef.current?.clear();
    } else {
      navigation.goBack();
    }
  }, [query, navigation, dispatch]);

  const handleStockTap = useCallback(
    (item: StockEntity) => {
      dispatch(saveHistoryItemThunk(item));
      // TODO: navigate to GetQuote / stock detail screen when available
      console.log('Navigate to stock detail:', item.symbol, item.instrumentName);
    },
    [dispatch],
  );

  const handleAddToWatchlist = useCallback(
    (item: StockEntity) => {
      // TODO: wire to add-to-watchlist feature when available
      console.log('Add to watchlist:', item.symbol);
    },
    [],
  );

  const handleFilterTap = useCallback(
    (filter: string) => {
      dispatch(setActiveFilter(filter));
    },
    [dispatch],
  );

  const isSearchLoading =
    searchStatus === 'loading' || searchStatus === 'typing';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#1F2937' : '#FFFFFF'}
      />

      {/* Search App Bar */}
      <View
        style={[
          styles.appBar,
          { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' },
        ]}
      >
        <TouchableOpacity
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <Text style={[styles.backIcon, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            ‹
          </Text>
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[styles.searchInput, { color: isDark ? '#F9FAFB' : '#111827' }]}
          value={query}
          onChangeText={handleQueryChange}
          autoFocus={autoFocusSearchBox}
          placeholder="Search stocks, ETF, Mutual Funds..."
          placeholderTextColor="rgba(150,150,150,0.6)"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="characters"
          accessibilityLabel="Search stocks"
          onSubmitEditing={() => {
            if (query.trim().length > 0) {
              dispatch(searchStocksThunk(query.trim()));
            }
          }}
        />
      </View>

      {/* Filter Chips — only when not in FNO SDK mode */}
      {fromScreen !== 'fno_sdk' && (
        <View style={styles.chipsRow}>
          <FilterChipSet
            activeFilter={activeFilter}
            onFilterTap={handleFilterTap}
          />
        </View>
      )}

      {/* Body */}
      <View style={styles.body}>
        {view === 'results' ? (
          <SearchResultsList
            data={searchResults}
            activeFilter={activeFilter}
            isLoading={isSearchLoading}
            onTap={handleStockTap}
            onAddToWatchlist={handleAddToWatchlist}
          />
        ) : (
          <View style={styles.homeContainer}>
            <StockSectionList
              title="Last Searched"
              data={historyStocks}
              onTap={handleStockTap}
              onAddToWatchlist={handleAddToWatchlist}
            />
            <StockSectionList
              title="Trending"
              data={trendingStocks}
              onTap={handleStockTap}
              onAddToWatchlist={handleAddToWatchlist}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backBtn: {
    padding: 8,
  },
  backIcon: {
    fontSize: 28,
    fontWeight: '300',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 8,
  },
  chipsRow: {
    height: 52,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  homeContainer: {
    flex: 1,
    paddingTop: 8,
  },
});
