// Redux Slice: Positions V2
// Source: PositionsBlocV2 (positions_bloc_v2.dart) → Redux Toolkit

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CumulativePositionList, PositionsSummary } from '../../domain/entities/Position';
import {
  fetchAllPositionsThunk,
  fetchPositionsParallelThunk,
} from '../thunks/positionsThunks';

export interface PositionsState {
  // Loading (mirrors LoadingPositionsState)
  loadingIndex: number | null;

  // Positions list (mirrors CumulativePositionsSuccessState)
  positions: CumulativePositionList[];

  // Filtered positions (after client-side filter)
  filteredPositions: CumulativePositionList[];

  // Search query
  searchQuery: string;

  // T+1 / T0 toggle (mirrors PositionsTypeChangeState)
  isCarryForwardView: boolean;

  // Summary card data
  summary: PositionsSummary | null;

  // Selected segment filter
  selectedSegment: string;

  error: string | null;
}

const initialState: PositionsState = {
  loadingIndex: null,
  positions: [],
  filteredPositions: [],
  searchQuery: '',
  isCarryForwardView: false,
  summary: null,
  selectedSegment: 'ALL',
  error: null,
};

function computeSummary(positions: CumulativePositionList[]): PositionsSummary {
  const totalInvested = positions.reduce((sum, p) => sum + p.buyValue, 0);
  const totalCurrent = positions.reduce((sum, p) => sum + p.mtmValue, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnlValue, 0);
  const totalPnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const dayPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);

  return { totalInvested, totalCurrent, totalPnl, totalPnlPercentage, dayPnl };
}

function filterPositions(
  positions: CumulativePositionList[],
  searchQuery: string,
  selectedSegment: string,
  isCarryForwardView: boolean
): CumulativePositionList[] {
  let filtered = [...positions];

  if (selectedSegment !== 'ALL') {
    const segmentNum = selectedSegment === 'F&O' ? 2 : 1;
    filtered = filtered.filter((p) => p.instrumentSegment === segmentNum);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.instrumentIdentity.lsSymbol ?? p.instrumentIdentity.lssymbol ?? '')
          .toLowerCase()
          .includes(q)
    );
  }

  // Filter by CF/Today view
  if (isCarryForwardView) {
    filtered = filtered.filter(
      (p) => (p.carryForwardNetQuantity ?? 0) !== 0
    );
  } else {
    filtered = filtered.filter((p) => (p.todayNetQuantity ?? p.netQuantity) !== 0);
  }

  return filtered;
}

const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {
    resetPositions(state) {
      Object.assign(state, initialState);
    },

    // Toggle T0 / Carry Forward (mirrors PositionsTypeChangeEvent)
    toggleCarryForwardView(state, action: PayloadAction<boolean>) {
      state.isCarryForwardView = action.payload;
      state.filteredPositions = filterPositions(
        state.positions,
        state.searchQuery,
        state.selectedSegment,
        action.payload
      );
    },

    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
      state.filteredPositions = filterPositions(
        state.positions,
        action.payload,
        state.selectedSegment,
        state.isCarryForwardView
      );
    },

    setSegmentFilter(state, action: PayloadAction<string>) {
      state.selectedSegment = action.payload;
      state.filteredPositions = filterPositions(
        state.positions,
        state.searchQuery,
        action.payload,
        state.isCarryForwardView
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllPositionsThunk.pending, (state) => {
        state.loadingIndex = 1;
        state.error = null;
      })
      .addCase(fetchAllPositionsThunk.fulfilled, (state, action) => {
        state.loadingIndex = null;
        state.positions = action.payload;
        state.summary = computeSummary(action.payload);
        state.filteredPositions = filterPositions(
          action.payload,
          state.searchQuery,
          state.selectedSegment,
          state.isCarryForwardView
        );
      })
      .addCase(fetchAllPositionsThunk.rejected, (state, action) => {
        state.loadingIndex = null;
        state.error = action.error.message ?? 'Failed to load positions';
      });

    builder
      .addCase(fetchPositionsParallelThunk.pending, (state) => {
        state.loadingIndex = 1;
        state.error = null;
      })
      .addCase(fetchPositionsParallelThunk.fulfilled, (state, action) => {
        state.loadingIndex = null;
        state.positions = action.payload;
        state.summary = computeSummary(action.payload);
        state.filteredPositions = filterPositions(
          action.payload,
          state.searchQuery,
          state.selectedSegment,
          state.isCarryForwardView
        );
      })
      .addCase(fetchPositionsParallelThunk.rejected, (state, action) => {
        state.loadingIndex = null;
        state.error = action.error.message ?? 'Failed to load positions';
      });
  },
});

export const {
  resetPositions,
  toggleCarryForwardView,
  setSearchQuery,
  setSegmentFilter,
} = positionsSlice.actions;

export default positionsSlice.reducer;
