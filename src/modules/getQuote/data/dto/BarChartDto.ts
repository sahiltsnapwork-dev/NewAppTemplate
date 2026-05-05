// DTO: BarChartDto
import type { BarChartEntity } from '../../domain/entities/BarChartEntity';

export interface BarChartDto {
  duration?: string | null;
  performance?: string | null;
  color?: string | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
  date?: string | null;
}

export function barChartDtoToEntity(dto: BarChartDto): BarChartEntity {
  return {
    duration: dto.duration ?? null,
    performance: dto.performance ?? null,
    color: dto.color ?? null,
    open: dto.open ?? null,
    high: dto.high ?? null,
    low: dto.low ?? null,
    close: dto.close ?? null,
    volume: dto.volume ?? null,
    date: dto.date ?? null,
  };
}
