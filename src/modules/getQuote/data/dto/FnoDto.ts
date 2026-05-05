// DTO: FnoDto
// Handles both mock camelCase fields and irmbla API fields
import type { FnoEntity } from '../../domain/entities/FnoEntity';

export interface FnoDto {
  // mock / camelCase fields
  instrumentType?: string | null;
  expiryDate?: string | null;
  strikePrice?: number | null;
  optionType?: string | null;
  openInterest?: number | null;
  impliedVolatility?: number | null;
  price?: number | null;
  change?: number | null;
  volume?: number | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  rho?: number | null;
  // irmbla real API fields
  INSTRUMENT_TYPE?: string | null;
  EXPIRY_DATE?: string | null;
  EXPIRY_DT?: string | null;
  STRIKE_PRICE?: number | null;
  OPTION_TYPE?: string | null;
  OPEN_INT?: number | null;
  OI?: number | null;
  IV?: number | null;
  LTP?: number | null;
  CLOSE?: number | null;
  CHANGE?: number | null;
  VOLUME?: number | null;
  [key: string]: unknown;
}

export function fnoDtoToEntity(dto: FnoDto): FnoEntity {
  const iType  = (dto.INSTRUMENT_TYPE ?? dto.instrumentType) as string | null ?? null;
  const expiry = (dto.EXPIRY_DT ?? dto.EXPIRY_DATE ?? dto.expiryDate) as string | null ?? null;
  const strike = (dto.STRIKE_PRICE ?? dto.strikePrice) as number | null ?? null;
  const optType = (dto.OPTION_TYPE ?? dto.optionType) as string | null ?? null;
  const oi     = (dto.OPEN_INT ?? dto.OI ?? dto.openInterest) as number | null ?? null;
  const iv     = (dto.IV ?? dto.impliedVolatility) as number | null ?? null;
  const ltp    = (dto.LTP ?? dto.CLOSE ?? dto.price) as number | null ?? null;
  const chg    = (dto.CHANGE ?? dto.change) as number | null ?? null;
  const vol    = (dto.VOLUME ?? dto.volume) as number | null ?? null;

  return {
    instrumentType: iType,
    expiryDate:     expiry,
    strikePrice:    strike,
    optionType:     optType,
    openInterest:   oi,
    impliedVolatility: iv,
    price:  ltp,
    change: chg,
    volume: vol,
    delta: dto.delta ?? null,
    gamma: dto.gamma ?? null,
    theta: dto.theta ?? null,
    vega:  dto.vega ?? null,
    rho:   dto.rho ?? null,
  };
}
