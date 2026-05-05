// Use Case: FetchCompanyBioUseCase
import type { CompanyBioEntity } from '../entities/CompanyBioEntity';
import type { IGetQuoteRepository } from '../repositories/IGetQuoteRepository';

export class FetchCompanyBioUseCase {
  constructor(private readonly repository: IGetQuoteRepository) {}

  async execute(params: { coCode: string | number }): Promise<CompanyBioEntity | null> {
    return this.repository.fetchCompanyBio(params);
  }
}
