// Repository Implementation: Positions
// Layer: Data – implements IPositionsRepository
// Mock fallback: uses mockConfig

import type { IPositionsRepository } from '../../domain/repositories/IPositionsRepository';
import type { CumulativePositionList } from '../../domain/entities/Position';
import {
  fetchCumulativePositions,
  fetchAllCumulativePositions,
} from '../datasources/PositionsApiDataSource';
import type { CumulativePositionListDto } from '../dto/PositionsDto';
import { MOCK_CONFIG } from '../../mock/mockConfig';
import { MOCK_POSITIONS } from '../../mock/positionsMock';

function mapPositionDto(dto: CumulativePositionListDto): CumulativePositionList {
  return {
    exchangeIdentity: dto.exchangeIdentity,
    instrumentIdentity: {
      instrumentId: dto.instrumentIdentity.instrumentId,
      instrumentIdType: dto.instrumentIdentity.instrumentIdType,
      instrumentSegment: dto.instrumentIdentity.instrumentSegment,
      instrumentType: dto.instrumentIdentity.instrumentType,
      lsSymbol: dto.instrumentIdentity.lsSymbol ?? dto.instrumentIdentity.lssymbol,
      lssymbol: dto.instrumentIdentity.lssymbol ?? dto.instrumentIdentity.lsSymbol,
      expiryDate: dto.instrumentIdentity.expiryDate,
      strikePrice: dto.instrumentIdentity.strikePrice,
      optionType: dto.instrumentIdentity.optionType,
    },
    tradingAccountNumber: dto.tradingAccountNumber,
    accountSettlementType: dto.accountSettlementType,
    buyQuantity: dto.buyQuantity,
    sellQuantity: dto.sellQuantity,
    netQuantity: dto.netQuantity,
    buyAveragePrice: dto.buyAveragePrice,
    sellAveragePrice: dto.sellAveragePrice,
    buyValue: dto.buyValue,
    sellValue: dto.sellValue,
    mtmValue: dto.mtmValue,
    pnlValue: dto.pnlValue,
    realizedPnl: dto.realizedPnl,
    unrealizedPnl: dto.unrealizedPnl,
    ltp: dto.ltp,
    product: dto.product,
    carryForwardBuyQuantity: dto.carryForwardBuyQuantity,
    carryForwardSellQuantity: dto.carryForwardSellQuantity,
    carryForwardNetQuantity: dto.carryForwardNetQuantity,
    todayBuyQuantity: dto.todayBuyQuantity,
    todaySellQuantity: dto.todaySellQuantity,
    todayNetQuantity: dto.todayNetQuantity,
    instrumentSegment: dto.instrumentSegment,
    positionType: 'NET',
  };
}

export class PositionsRepositoryImpl implements IPositionsRepository {
  async getCumulativePositions(
    tradingAccountNumber: string,
    accountSettlementType: number,
    instrumentSegment: number
  ): Promise<CumulativePositionList[]> {
    if (MOCK_CONFIG.POSITIONS.mockEnabled) {
      return MOCK_POSITIONS;
    }

    const response = await fetchCumulativePositions(
      tradingAccountNumber,
      accountSettlementType,
      instrumentSegment
    );

    if (response.statusCode !== '000') return [];

    const list = response.data?.cumulativePositionList ?? [];
    return list.map(mapPositionDto);
  }

  async getAllCumulativePositions(
    tradingAccountNumber: string,
    accountSettlementType: number,
    isFOPrivilege: boolean,
    isCurrencyDerivativePrivilege: boolean
  ): Promise<CumulativePositionList[]> {
    if (MOCK_CONFIG.POSITIONS.mockEnabled) {
      return MOCK_POSITIONS;
    }

    const responses = await fetchAllCumulativePositions(
      tradingAccountNumber,
      accountSettlementType,
      isFOPrivilege,
      isCurrencyDerivativePrivilege
    );

    return responses
      .filter((r) => r.statusCode === '000')
      .flatMap((r) => (r.data?.cumulativeAllPositionList ?? r.data?.cumulativePositionList ?? []).map(mapPositionDto));
  }
}
