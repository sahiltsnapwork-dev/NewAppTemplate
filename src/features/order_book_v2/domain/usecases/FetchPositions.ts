// Use Case: FetchPositions
// Source: CumulativeAllPositionsApiEvent / fetchCumulativeDataEvent (positions_event_v2.dart)
// Layer: Domain – delegates to IPositionsRepository

import type { IPositionsRepository } from '../repositories/IPositionsRepository';
import type { CumulativePositionList } from '../entities/Position';

export class FetchPositionsUseCase {
  constructor(private readonly repository: IPositionsRepository) {}

  async execute(
    tradingAccountNumber: string,
    accountSettlementType: number,
    isFOPrivilege: boolean,
    isCurrencyDerivativePrivilege: boolean
  ): Promise<CumulativePositionList[]> {
    return this.repository.getAllCumulativePositions(
      tradingAccountNumber,
      accountSettlementType,
      isFOPrivilege,
      isCurrencyDerivativePrivilege
    );
  }

  // Parallel fetch per segment (equity + F&O)
  async executeParallel(
    tradingAccountNumber: string,
    accountSettlementType: number,
    isFOPrivilege: boolean
  ): Promise<CumulativePositionList[]> {
    const segments = [1]; // Equity always
    if (isFOPrivilege) segments.push(2); // F&O

    const results = await Promise.all(
      segments.map((seg) =>
        this.repository.getCumulativePositions(
          tradingAccountNumber,
          accountSettlementType,
          seg
        )
      )
    );

    return results.flat();
  }
}
