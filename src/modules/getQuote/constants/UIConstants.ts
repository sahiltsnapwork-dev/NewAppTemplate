// ─── UI Constants ──────────────────────────────────────────────────────────────
// Colors, typography sizes, spacing — adapted from Flutter theme

export const COLORS = {
  // Background
  background:      '#FFFFFF',
  surface:         '#F6F7F9',
  card:            '#FFFFFF',
  cardBorder:      '#E6E7EA',

  // Accent / Brand
  primary:         '#1A73E8',
  primaryLight:    '#4A90D9',

  // Text
  textPrimary:     '#0F1724',
  textSecondary:   '#374151',
  textMuted:       '#6B7280',
  textLabel:       '#9CA3AF',

  // Positive (green)
  positive:        '#16A34A',
  positiveLight:   '#ECFDF3',

  // Negative (red)
  negative:        '#DC2626',
  negativeLight:   '#FEF2F2',

  // Neutral
  neutral:         '#F59E0B',

  // Tab bar
  tabActive:       '#0F1724',
  tabInactive:     '#6B7280',
  tabIndicator:    '#1A73E8',

  // Market depth
  buyDepth:        'rgba(16, 185, 129, 0.12)',
  sellDepth:       'rgba(239, 68, 68, 0.12)',
  buyDepthBar:     '#10B981',
  sellDepthBar:    '#EF4444',

  // Dividers
  divider:         '#E6E7EA',
  borderLight:     '#F1F3F5',

  // Skeleton / Loading
  skeleton:        '#F3F4F6',
  skeletonLight:   '#F8FAFC',
} as const;

export const FONT_SIZE = {
  xs:   10,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   20,
  xxl:  24,
  h1:   28,
  h2:   32,
} as const;

export const FONT_WEIGHT = {
  regular:   '400' as const,
  medium:    '500' as const,
  semiBold:  '600' as const,
  bold:      '700' as const,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  xxl: 32,
} as const;

export const BORDER_RADIUS = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 999,
} as const;

// SWOT color mapping
export const SWOT_COLORS = {
  strengths:    '#00C851',
  weaknesses:   '#FF4444',
  opportunities:'#1A73E8',
  threats:      '#FFB300',
} as const;
