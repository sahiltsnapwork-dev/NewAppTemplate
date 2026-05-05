// Domain Repository Interface: IGetQuoteRepository
// Defines the contract for quote data fetching — zero framework dependencies

import type { QuoteEntity } from '../entities/QuoteEntity';
import type { BarChartEntity } from '../entities/BarChartEntity';
import type { ExpertTipEntity } from '../entities/ExpertTipEntity';
import type { ResistanceSupportEntity } from '../entities/ResistanceSupportEntity';
import type { KeyStatsEntity } from '../entities/KeyStatsEntity';
import type { CompanyBioEntity } from '../entities/CompanyBioEntity';

export interface IGetQuoteRepository {
  fetchQuoteData(params: { symbol: string; exchange: string }): Promise<QuoteEntity>;
  fetchPerformanceData(params: { coCode: string | number; exchange: string; interval?: string }): Promise<BarChartEntity[]>;
  fetchExpertTips(params: { symbol: string }): Promise<ExpertTipEntity | null>;
  fetchResistanceSupport(params: { coCode: string | number; exchange: string }): Promise<ResistanceSupportEntity[]>;
  fetchKeyStats(params: { symbol: string; exchange: string }): Promise<KeyStatsEntity[]>;
  fetchCompanyBio(params: { coCode: string | number }): Promise<CompanyBioEntity | null>;
}
