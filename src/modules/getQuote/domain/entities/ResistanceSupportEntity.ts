// Domain Entity: ResistanceSupportEntity
// Mirrors ResistanceSupport from Flutter

export interface ResistanceSupportEntity {
  type: string | null;       // R1, R2, R3, S1, S2, S3, Pivot
  value: number | null;
  strength: number | null;
}
