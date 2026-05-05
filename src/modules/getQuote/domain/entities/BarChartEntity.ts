// Domain Entity: BarChartEntity
// Mirrors BarChartModel from Flutter

export interface BarChartEntity {
  duration: string | null;      // time period label (e.g. "1D", "5D")
  performance: string | null;   // percentage performance value
  color: string | null;         // chart bar color
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  date: string | null;
}
