// DTO: CompanyBioDto
import type { CompanyBioEntity } from '../../domain/entities/CompanyBioEntity';

export interface CompanyBioDto {
  companyName?: string | null;
  description?: string | null;
  website?: string | null;
  headquarters?: string | null;
  founded?: string | null;
  employees?: number | null;
  ceo?: string | null;
  chairman?: string | null;
  boardMembers?: string[] | null;
  industry?: string | null;
  subsector?: string | null;
  services?: string[] | null;
}

export function companyBioDtoToEntity(dto: CompanyBioDto): CompanyBioEntity {
  return {
    companyName: dto.companyName ?? null,
    description: dto.description ?? null,
    website: dto.website ?? null,
    headquarters: dto.headquarters ?? null,
    founded: dto.founded ?? null,
    employees: dto.employees ?? null,
    ceo: dto.ceo ?? null,
    chairman: dto.chairman ?? null,
    boardMembers: dto.boardMembers ?? null,
    industry: dto.industry ?? null,
    subsector: dto.subsector ?? null,
    services: dto.services ?? null,
  };
}
