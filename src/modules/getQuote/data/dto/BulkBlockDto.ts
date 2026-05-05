// DTO: BulkBlockDto
// Handles both mock camelCase fields and real irmscontenta API fields
import type { BulkBlockEntity } from '../../domain/entities/BulkBlockEntity';

export interface BulkBlockDto {
  // mock / camelCase fields
  dealId?: string | null;
  symbol?: string | null;
  dealQuantity?: number | null;
  dealPrice?: number | null;
  date?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  type?: 'Bulk' | 'Block' | null;
  exchange?: string | null;
  // irmscontenta real API fields
  DEAL_TYPE?: string | null;
  CLIENT_NAME?: string | null;
  CLIENT?: string | null;
  BUYER?: string | null;
  SELLER?: string | null;
  QTY?: number | null;
  QUANTITY?: number | null;
  PRICE?: number | null;
  DEAL_PRICE?: number | null;
  DEAL_DATE?: string | null;
  DATE?: string | null;
  EXCHANGE?: string | null;
  SCRIP_CODE?: string | number | null;
  SCRIP_NAME?: string | null;
  CO_CODE?: number | null;
  [key: string]: unknown;
}

export function bulkBlockDtoToEntity(dto: BulkBlockDto): BulkBlockEntity {
  const qty    = (dto.QTY ?? dto.QUANTITY ?? dto.dealQuantity) as number | null ?? null;
  const price  = (dto.PRICE ?? dto.DEAL_PRICE ?? dto.dealPrice) as number | null ?? null;
  const date   = (dto.DEAL_DATE ?? dto.DATE ?? dto.date) as string | null ?? null;
  const buyer  = (dto.BUYER ?? dto.CLIENT_NAME ?? dto.CLIENT ?? dto.buyerName) as string | null ?? null;
  const seller = (dto.SELLER ?? dto.sellerName) as string | null ?? null;
  const exch   = (dto.EXCHANGE ?? dto.exchange) as string | null ?? null;
  const sym    = (dto.SCRIP_NAME ?? dto.symbol) as string | null ?? null;
  const id     = (dto.SCRIP_CODE?.toString() ?? dto.dealId) as string | null ?? null;

  return {
    dealId:       id,
    symbol:       sym,
    dealQuantity: qty,
    dealPrice:    price,
    date,
    buyerName:    buyer,
    sellerName:   seller,
    type:         dto.type ?? null,
    exchange:     exch,
  };
}
