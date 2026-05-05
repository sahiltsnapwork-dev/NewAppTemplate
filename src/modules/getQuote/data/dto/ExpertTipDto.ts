// DTO: ExpertTipDto
import type { ExpertTipEntity } from '../../domain/entities/ExpertTipEntity';

export interface ExpertTipDto {
  tipId?: string | null;
  title?: string | null;
  content?: string | null;
  expert?: string | null;
  category?: string | null;
  createdDate?: string | null;
  rating?: string | null;
  analysis?: string | null;
}

export function expertTipDtoToEntity(dto: ExpertTipDto): ExpertTipEntity {
  return {
    tipId: dto.tipId ?? null,
    title: dto.title ?? null,
    content: dto.content ?? null,
    expert: dto.expert ?? null,
    category: dto.category ?? null,
    createdDate: dto.createdDate ?? null,
    rating: dto.rating ?? null,
    analysis: dto.analysis ?? null,
  };
}
