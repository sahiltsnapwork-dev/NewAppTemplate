// Data Source: Positions API
// Source: PositionsRepositary.dart, API #16, #17
// Layer: Data – uses apiClient

import apiClient from '../../../../core/api/apiClient';
import { ORDER_BOOK_ENDPOINTS } from '../../../../core/api/endpoints';
import type { CumulativePositionsApiResponse } from '../dto/PositionsDto';

// ── Cumulative Positions per segment – API #16 ───────────────────────────────
export async function fetchCumulativePositions(
  tradingAccountNumber: string,
  accountSettlementType: number,
  instrumentSegment: number
): Promise<CumulativePositionsApiResponse> {
  const response = await apiClient.post<CumulativePositionsApiResponse>(
    ORDER_BOOK_ENDPOINTS.CUMULATIVE_ALL_POSITIONS,
    {
      tradingAccountDetails: {
        tradingAccountNumber,
        accountSettlementType,
      },
      instrumentSegment,
    }
  );
  return response.data;
}

// ── All Cumulative Positions – API #17 ────────────────────────────────────────
// Equity (segment=1) + F&O (segment=2) in parallel via Promise.all
export async function fetchAllCumulativePositions(
  tradingAccountNumber: string,
  accountSettlementType: number,
  isFOPrivilege: boolean,
  isCurrencyDerivativePrivilege: boolean
): Promise<CumulativePositionsApiResponse[]> {
  const segments = [1]; // equity always
  if (isFOPrivilege) segments.push(2);
  if (isCurrencyDerivativePrivilege) segments.push(3);

  const responses = await Promise.all(
    segments.map((seg) =>
      fetchCumulativePositions(tradingAccountNumber, accountSettlementType, seg)
    )
  );
  return responses;
}
