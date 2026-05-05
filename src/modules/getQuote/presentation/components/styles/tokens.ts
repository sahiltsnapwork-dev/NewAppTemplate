// Design Tokens for GetQuote module
// Derived from Flutter: HexColor, Style(), Theme.of(context).colorScheme

export const colors = {
  positive: '#079b39',         // Flutter: HexColor('#079b39') — green price change
  negative: '#ea4747',         // Flutter: HexColor('#ea4747') — red price change
  textSecondary: '#7c8295',    // Flutter: HexColor('#7c8295') — muted labels
  textPrimary: '#404040',      // Flutter: HexColor('#404040') — primary text
  highlightBg: '#EFF6FF',      // Flutter: HexColor('#EFF6FF') — InkWell highlight
  iconMuted: '#959aaa',        // Flutter: HexColor('959aaa') — icon color
  divider: '#E0E0E0',
  surface: '#FFFFFF',
  surfaceDark: '#121212',
  secondaryBlueBg: '#1A237E',  // Flutter: colorScheme.secondaryBlueBgColor
  black2: '#222222',           // Flutter: colorScheme.blackColor2
} as const;

export const fonts = {
  regular: 'Roboto-Regular',
  medium: 'Roboto-Medium',
  bold: 'Roboto-Bold',
} as const;

export const typography = {
  small: 12,
  body: 14,
  bodyLarge: 16,
  heading: 24,
  subheading: 18,
  caption: 10,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 24,
} as const;
