// DTO: NewsDto
// Handles both mock camelCase fields and real irmscontenta API fields
import type { NewsEntity } from '../../domain/entities/NewsEntity';

export interface NewsDto {
  // mock / camelCase fields
  id?: string | null;
  headline?: string | null;
  content?: string | null;
  source?: string | null;
  publishedDate?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  type?: 'news' | 'announcement' | null;
  cmotId?: string | null;
  // irmscontenta real API fields (UPPERCASE/PascalCase)
  NEWSCODE?: string | number | null;
  HEADLINE?: string | null;
  DATED?: string | null;
  NEWSDATE?: string | null;
  SOURCE?: string | null;
  SOURCE_NAME?: string | null;
  CATEGORY?: string | null;
  CAT_NAME?: string | null;
  DESCRIPTION?: string | null;
  CO_CODE?: number | null;
  [key: string]: unknown; // allow any extra fields
}

export function newsDtoToEntity(dto: NewsDto): NewsEntity {
  // prefer real API fields, fall back to mock fields
  const headline = (dto.HEADLINE ?? dto.headline) as string | null ?? null;
  const source   = (dto.SOURCE_NAME ?? dto.SOURCE ?? dto.source) as string | null ?? null;
  const pubDate  = (dto.DATED ?? dto.NEWSDATE ?? dto.publishedDate) as string | null ?? null;
  const content  = (dto.DESCRIPTION ?? dto.content) as string | null ?? null;
  const id       = (dto.NEWSCODE?.toString() ?? dto.id) as string | null ?? null;

  return {
    id,
    headline,
    content,
    source,
    publishedDate: pubDate,
    link: dto.link ?? null,
    imageUrl: dto.imageUrl ?? null,
    type: dto.type ?? null,
    cmotId: (dto.CO_CODE?.toString() ?? dto.cmotId) as string | null ?? null,
  };
}
