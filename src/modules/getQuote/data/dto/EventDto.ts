// DTO: EventDto
// Handles both mock camelCase fields and real irmscontenta API fields
import type { EventEntity } from '../../domain/entities/EventEntity';

export interface EventDto {
  // mock / camelCase fields
  eventId?: string | null;
  eventType?: string | null;
  title?: string | null;
  description?: string | null;
  eventDate?: string | null;
  importance?: string | null;
  impact?: number | null;
  // irmscontenta real API fields (events come from same news endpoint)
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
  [key: string]: unknown;
}

export function eventDtoToEntity(dto: EventDto): EventEntity {
  // Events and News use the same endpoint — map accordingly
  const id    = (dto.NEWSCODE?.toString() ?? dto.eventId) as string | null ?? null;
  const type  = (dto.CAT_NAME ?? dto.CATEGORY ?? dto.eventType) as string | null ?? null;
  const title = (dto.HEADLINE ?? dto.title) as string | null ?? null;
  const desc  = (dto.DESCRIPTION ?? dto.description) as string | null ?? null;
  const date  = (dto.DATED ?? dto.NEWSDATE ?? dto.eventDate) as string | null ?? null;

  return {
    eventId:    id,
    eventType:  type,
    title,
    description: desc,
    eventDate:  date,
    importance: dto.importance ?? null,
    impact:     dto.impact ?? null,
  };
}
