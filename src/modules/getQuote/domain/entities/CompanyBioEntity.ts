// Domain Entity: CompanyBioEntity
// Mirrors CompanyBioModel from Flutter

export interface CompanyBioEntity {
  companyName: string | null;
  description: string | null;
  website: string | null;
  headquarters: string | null;
  founded: string | null;
  employees: number | null;
  ceo: string | null;
  chairman: string | null;
  boardMembers: string[] | null;
  industry: string | null;
  subsector: string | null;
  services: string[] | null;
}
