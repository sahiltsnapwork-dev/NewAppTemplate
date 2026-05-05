// Use Case: FetchPerformanceDataUseCase
import type { BarChartEntity } from '../entities/BarChartEntity';
import type { IGetQuoteRepository } from '../repositories/IGetQuoteRepository';

export class FetchPerformanceDataUseCase {
  constructor(private readonly repository: IGetQuoteRepository) {}

  async execute(params: { coCode: string | number; exchange: string; interval?: string }): Promise<BarChartEntity[]> {
    return this.repository.fetchPerformanceData(params);
  }
}
