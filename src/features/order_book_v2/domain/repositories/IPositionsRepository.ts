// Domain Repository Interface: IPositionsRepository
// Layer: Domain (zero external dependencies – pure interface contract)

import type { CumulativePositionList } from '../entities/Position';

export interface FetchPositionsParams {
  tradingAccountNumber: string;
  accountSettlementType: number;
  instrumentSegment: number;
  isFOPrivilege: boolean;
  isCurrencyDerivativePrivilege: boolean;
}

export interface IPositionsRepository {
  getCumulativePositions(
    tradingAccountNumber: string,
    accountSettlementType: number,
    instrumentSegment: number
  ): Promise<CumulativePositionList[]>;

  getAllCumulativePositions(
    tradingAccountNumber: string,
    accountSettlementType: number,
    isFOPrivilege: boolean,
    isCurrencyDerivativePrivilege: boolean
  ): Promise<CumulativePositionList[]>;
}
