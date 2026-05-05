// GetQuoteRepositoryImpl — implements IGetQuoteRepository
// Delegates to GetQuoteApiDataSource and maps DTOs to entities

import type { IGetQuoteRepository } from '../../domain/repositories/IGetQuoteRepository';
import type { QuoteEntity } from '../../domain/entities/QuoteEntity';
import type { BarChartEntity } from '../../domain/entities/BarChartEntity';
import type { ExpertTipEntity } from '../../domain/entities/ExpertTipEntity';
import type { ResistanceSupportEntity } from '../../domain/entities/ResistanceSupportEntity';
import type { KeyStatsEntity } from '../../domain/entities/KeyStatsEntity';
import type { CompanyBioEntity } from '../../domain/entities/CompanyBioEntity';
import { GetQuoteApiDataSource } from '../dataSources/GetQuoteApiDataSource';
import { quoteDtoToEntity } from '../dto/QuoteDto';
import { barChartDtoToEntity } from '../dto/BarChartDto';
import { expertTipDtoToEntity } from '../dto/ExpertTipDto';

export class GetQuoteRepositoryImpl implements IGetQuoteRepository {
  constructor(private readonly dataSource: GetQuoteApiDataSource) {}

  async fetchQuoteData(params: { symbol: string; exchange: string }): Promise<QuoteEntity> {
    const dto = await this.dataSource.fetchQuoteData(params);
    return quoteDtoToEntity(dto);
  }

  async fetchPerformanceData(params: {
    coCode: string | number;
    exchange: string;
    interval?: string;
  }): Promise<BarChartEntity[]> {
    const dtos = await this.dataSource.fetchPerformanceData(params);
    return dtos.map(barChartDtoToEntity);
  }

  async fetchExpertTips(params: { symbol: string }): Promise<ExpertTipEntity | null> {
    const dto = await this.dataSource.fetchExpertTips(params);
    if (!dto) return null;
    return expertTipDtoToEntity(dto);
  }

  async fetchResistanceSupport(params: {
    coCode: string | number;
    exchange: string;
  }): Promise<ResistanceSupportEntity[]> {
    const raw = await this.dataSource.fetchResistanceSupport(params);
    return raw as ResistanceSupportEntity[];
  }

  async fetchKeyStats(params: {
    symbol: string;
    exchange: string;
  }): Promise<KeyStatsEntity[]> {
    const raw = await this.dataSource.fetchKeyStats(params);
    return raw as KeyStatsEntity[];
  }

  async fetchCompanyBio(params: { coCode: string | number }): Promise<CompanyBioEntity | null> {
    const raw = await this.dataSource.fetchCompanyBio(params);
    if (!raw) return null;
    return raw as CompanyBioEntity;
  }
}
