// Domain Entity: FnoEntity
// Mirrors GqFnoModel from Flutter

export interface FnoEntity {
  instrumentType: string | null;   // FUT or OPT
  expiryDate: string | null;
  strikePrice: number | null;
  optionType: string | null;       // CE or PE
  openInterest: number | null;
  impliedVolatility: number | null;
  price: number | null;
  change: number | null;
  volume: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
}
