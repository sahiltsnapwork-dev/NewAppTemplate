// Selectors: Positions
import type { RootState } from '../../../../store/rootReducer';

export const selectPositionsIsLoading = (state: RootState) =>
  state.positions.loadingIndex !== null;
export const selectPositions = (state: RootState) => state.positions.positions;
export const selectFilteredPositions = (state: RootState) =>
  state.positions.filteredPositions;
export const selectPositionsSummary = (state: RootState) => state.positions.summary;
export const selectPositionsSearchQuery = (state: RootState) => state.positions.searchQuery;
export const selectIsCarryForwardView = (state: RootState) =>
  state.positions.isCarryForwardView;
export const selectPositionsSegmentFilter = (state: RootState) =>
  state.positions.selectedSegment;
export const selectPositionsError = (state: RootState) => state.positions.error;

// Selectors: SIP
export const selectSipIsLoading = (state: RootState) => state.sip.isLoading;
export const selectSipData = (state: RootState) => state.sip.sipData;
export const selectSipRequestBook = (state: RootState) => state.sip.sipRequestBook;
export const selectSipTrailData = (state: RootState) => state.sip.trailData;
export const selectSipTrailBasketInfo = (state: RootState) => state.sip.trailBasketInfo;
export const selectSipChildOrders = (state: RootState) => state.sip.childOrders;
export const selectSipChildBasketInfo = (state: RootState) => state.sip.childBasketInfo;
export const selectSipNoData = (state: RootState) => state.sip.noData;
export const selectSipError = (state: RootState) => state.sip.error;
