// Domain Entity: EventEntity
// Mirrors EventsData from Flutter

export interface EventEntity {
  eventId: string | null;
  eventType: string | null;
  title: string | null;
  description: string | null;
  eventDate: string | null;
  importance: string | null;
  impact: number | null;
}
