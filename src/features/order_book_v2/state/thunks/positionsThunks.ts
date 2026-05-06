// Thunks: Positions
// Delegates to FetchPositionsUseCase

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ThunkExtra } from '../../di/orderBookContainer';

// ── Fetch All Cumulative Positions (single call) ───────────────────────────────
export const fetchAllPositionsThunk = createAsyncThunk(
  'positions/fetchAll',
  async (
    params: {
      tradingAccountNumber: string;
      accountSettlementType: number;
      isFOPrivilege: boolean;
      isCurrencyDerivativePrivilege: boolean;
    },
    { extra }
  ) => {
    const { fetchPositionsUseCase } = extra as ThunkExtra;
    return fetchPositionsUseCase.execute(
      params.tradingAccountNumber,
      params.accountSettlementType,
      params.isFOPrivilege,
      params.isCurrencyDerivativePrivilege
    );
  }
);

// ── Fetch Positions in Parallel (equity + F&O) ────────────────────────────────
export const fetchPositionsParallelThunk = createAsyncThunk(
  'positions/fetchParallel',
  async (
    params: {
      tradingAccountNumber: string;
      accountSettlementType: number;
      isFOPrivilege: boolean;
    },
    { extra }
  ) => {
    const { fetchPositionsUseCase } = extra as ThunkExtra;
    return fetchPositionsUseCase.executeParallel(
      params.tradingAccountNumber,
      params.accountSettlementType,
      params.isFOPrivilege
    );
  }
);
