// Use Case: FetchResistanceSupportUseCase
import type { ResistanceSupportEntity } from '../entities/ResistanceSupportEntity';
import type { IGetQuoteRepository } from '../repositories/IGetQuoteRepository';

export class FetchResistanceSupportUseCase {
  constructor(private readonly repository: IGetQuoteRepository) {}

  async execute(params: { coCode: string | number; exchange: string }): Promise<ResistanceSupportEntity[]> {
    return this.repository.fetchResistanceSupport(params);
  }
}
