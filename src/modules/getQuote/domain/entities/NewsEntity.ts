// Domain Entity: NewsEntity
// Mirrors GqNewsDetails from Flutter

export interface NewsEntity {
  id: string | null;
  headline: string | null;
  content: string | null;
  source: string | null;
  publishedDate: string | null;
  link: string | null;
  imageUrl: string | null;
  type: 'news' | 'announcement' | null;
  cmotId: string | null;
}
