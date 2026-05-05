// Domain Entity: BulkBlockEntity
// Mirrors BulkBlockData from Flutter

export interface BulkBlockEntity {
  dealId: string | null;
  symbol: string | null;
  dealQuantity: number | null;
  dealPrice: number | null;
  date: string | null;
  buyerName: string | null;
  sellerName: string | null;
  type: 'Bulk' | 'Block' | null;
  exchange: string | null;
}
