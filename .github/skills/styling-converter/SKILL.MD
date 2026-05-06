---
name: styling-converter
description: "MUST be used whenever Flutter style props, decoration objects, or raw style values need to be converted into token-based React Native StyleSheet entries. Use when: converting Flutter BoxDecoration, TextStyle, EdgeInsets, or color values into React Native styles; mapping style values to design-system tokens; generating StyleSheet.create blocks for converted components; detecting and blocking hard-coded colors, spacing, or typography values that should be tokens. Keywords: styling converter, design tokens, stylesheet, flutter styles, react native styles, token mapping, typography, spacing, color tokens, boxdecoration, textstyle, edgeinsets."
priority: HIGH
auto-trigger: true
---

# Styling Converter

---
## Universal Conversion Rules (Import Paths, API, Data, Platform)

**Import Path Depth Rule:**
Screens in `presentation/screens/` are 2 levels deep from the feature root. All cross-layer imports (to `state/`, `domain/`, `data/`) must use `../../` (not `../`). Never generate `../presentation/components/`; always use `../components/` from within a screen.

**API Endpoint Verification:**
Before finalizing any API endpoint constant, fetch or confirm the real API URL. Never leave placeholder paths. Document the resolved URL in `api_info.md`.

**Exhaustive Response Key Mapping:**
Every top-level key in `response.data.data` must be explicitly handled. Unknown keys must not be dropped.

**Field Casing Audit:**
Always check both camelCase and lowercase variants (e.g., `lsSymbol` and `lssymbol`) and use `??` chaining.

**Windows Android Build Note:**
When building Android on Windows, always add `abiFilters "arm64-v8a"` in `defaultConfig.ndk` to prevent CMake/Ninja failures from stale `.cxx` cache locks.

> Trigger this skill **after** the Widget to JSX Converter has identified style props and **before** any component file is written to disk. This skill is the single source of token enforcement — no raw hex, hard-coded spacing, or magic numbers may appear in output StyleSheet blocks. Every violation is surfaced; nothing is silently passed through.

## Step 1 — Receive and Validate Input

Accept the raw style input and the design-token registry, then verify both are present and usable before conversion begins.

**Input schema:**

```json
{
  "styles": [
    {
      "componentName": "string",
      "styleKey": "string",
      "rawProps": {
        "color": "string | null",
        "backgroundColor": "string | null",
        "fontSize": "string | null",
        "fontWeight": "string | null",
        "fontFamily": "string | null",
        "letterSpacing": "string | null",
        "lineHeight": "string | null",
        "padding": "string | null",
        "paddingTop": "string | null",
        "paddingRight": "string | null",
        "paddingBottom": "string | null",
        "paddingLeft": "string | null",
        "margin": "string | null",
        "marginTop": "string | null",
        "marginRight": "string | null",
        "marginBottom": "string | null",
        "marginLeft": "string | null",
        "width": "string | null",
        "height": "string | null",
        "borderRadius": "string | null",
        "borderWidth": "string | null",
        "borderColor": "string | null",
        "opacity": "string | null",
        "flex": "string | null",
        "flexDirection": "string | null",
        "alignItems": "string | null",
        "justifyContent": "string | null",
        "gap": "string | null",
        "elevation": "string | null"
      },
      "isDynamic": false
    }
  ],
  "tokenRegistry": {
    "colors": { "tokenName": "resolvedValue" },
    "spacing": { "tokenName": "resolvedValue" },
    "typography": {
      "fontSizes": { "tokenName": "resolvedValue" },
      "fontWeights": { "tokenName": "resolvedValue" },
      "fontFamilies": { "tokenName": "resolvedValue" },
      "lineHeights": { "tokenName": "resolvedValue" },
      "letterSpacings": { "tokenName": "resolvedValue" }
    },
    "radii": { "tokenName": "resolvedValue" },
    "borders": { "tokenName": "resolvedValue" }
  },
  "tokensOnly": true
}
```

**Decision point:**
- If `styles` is null, undefined, or empty → **FAIL**: `"FATAL: Input 'styles' is empty. Nothing to convert."`
- If `tokenRegistry` is null or all token categories are empty → **FAIL**: `"FATAL: Token registry is empty. Cannot enforce token usage without a registry. Load the design-token file first."`
- If `tokensOnly` is `true` and `tokenRegistry` is missing any of `colors`, `spacing`, or `typography` → **FAIL**: `"FATAL: tokensOnly is enabled but token registry is incomplete. Categories missing: [{missingCategories}]."`
- If `tokensOnly` is `false` → raw values are permitted; emit a WARN once: `"tokensOnly is disabled. Raw style values will not be blocked. Enable token enforcement in the constitution config."`

**Rule:** This skill never reads design-token files from disk. The caller is responsible for loading and passing the full token registry.

---

## Step 1d — Apply README Context as Supplementary Input

If `readmeContext` is provided by the orchestrator, use it to validate styling completeness. GSD-derived style props are always authoritative.

**Priority rule (non-negotiable):**
- GSD data present for a style conversion decision → use GSD data, ignore README
- GSD data absent → use README insights as supplementary guidance only
- GSD and README conflict → use GSD; emit `"README CONFLICT: GSD states '{gsdValue}' for '{topic}' but README states '{readmeValue}'. Using GSD value — it is derived from the actual codebase."`

**README context application for this skill:**
- Use `readmeContext.insights.uiComponentHints` to cross-check that every README-described screen or component has at least one corresponding style entry in the output. If a README-named component has no styles generated, emit INFO: `"README mentions component '{name}' with no generated styles. Styles may be inherited from parent — verify intentional."`
- Use `readmeContext.insights.businessRules` to catch branding or color constraints not enforced by token mappings (e.g. a rule like "primary color must be #FF5733" that should be a token, not a hard-coded value). Emit WARN if such a rule is detected and no corresponding token exists.
- If `readmeContext.insights.source === "none"` → emit INFO: `"[README Context] No README insights. Styling conversion proceeds from widget style props only."` and skip annotation steps.

**What README context MUST NOT do in this skill:**
- Create StyleSheet entries for components mentioned only in README
- Bypass token enforcement rules based on README color or spacing values
- Override the "no raw values" constraint from `constitutionConfig.techStack.designSystem`

---

## Step 2 — Parse Raw Flutter Style Values

Before mapping to tokens, normalize Flutter-specific style representations into a flat, type-annotated intermediate form that can be matched against the token registry.

```ts
// styling-converter/parseFlutterStyles.ts

export type StyleValueType =
  | "color"
  | "spacing"
  | "fontSize"
  | "fontWeight"
  | "fontFamily"
  | "lineHeight"
  | "letterSpacing"
  | "radius"
  | "border"
  | "dimension"
  | "numeric"
  | "keyword"
  | "dynamic"
  | "unknown";

export interface ParsedStyleValue {
  prop: string;           // RN prop name, e.g. "paddingTop"
  rawValue: string;       // exactly as received, never mutated
  normalizedValue: string; // resolved to a plain number or canonical string
  type: StyleValueType;
  isDynamic: boolean;      // true if value contains a Dart variable reference
}

// Flutter color formats that must be normalized before token matching
const COLOR_PATTERNS = [
  /^Color\(0x[0-9A-Fa-f]{8}\)$/,   // Color(0xFFRRGGBB)
  /^Colors\.\w+(\.\w+)?$/,          // Colors.blue, Colors.blue.shade400
  /^#[0-9A-Fa-f]{3,8}$/,            // hex shorthand or full
  /^rgba?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}(,\s*[\d.]+)?\)$/,
];

export function parseStyleValue(prop: string, raw: string): ParsedStyleValue {
  const isDynamic = /\$\{|widget\.|_[a-z]/.test(raw);
  const type = inferType(prop, raw);
  const normalizedValue = normalize(raw, type);
  return { prop, rawValue: raw, normalizedValue, type, isDynamic };
}
```

**Quality checks:**
- `rawValue` is stored exactly as received and is never mutated at any step
- `isDynamic` must be set to `true` for any value containing a Dart variable reference, interpolation, or expression; dynamic values skip token matching (Step 3) and go directly to Step 5
- `Colors.white` and `Colors.black` are normalized to `#FFFFFF` and `#000000` respectively before token matching

---

## Step 3 — Map Values to Design-System Tokens

For each non-dynamic parsed value, attempt to find a matching token in the registry. Matching must be exact on normalized value — no fuzzy or proximity matching.

```ts
// styling-converter/tokenMapper.ts

export interface TokenMatch {
  tokenName: string;        // e.g. "colors.primary.500"
  tokenExpression: string;  // e.g. "tokens.colors.primary[500]" — ready to emit in StyleSheet
  matchedBy: "exact" | "alias"; // "alias" if matched via a known Flutter→token alias table
}

export interface TokenMappingResult {
  parsed: ParsedStyleValue;
  match: TokenMatch | null;
  violation: Violation | null;
}

// Known Flutter named color → token alias (populated from constitution token source)
const FLUTTER_TOKEN_ALIASES: Record<string, string> = {
  "Colors.white":         "colors.neutral.0",
  "Colors.black":         "colors.neutral.1000",
  "Colors.transparent":   "colors.transparent",
  // Extend from constitution tokenSource at runtime
};

export function mapToToken(
  parsed: ParsedStyleValue,
  registry: TokenRegistry,
  tokensOnly: boolean
): TokenMappingResult {
  if (parsed.isDynamic) {
    return { parsed, match: null, violation: null }; // handled in Step 5
  }

  // 1. Check alias table first
  const aliasKey = FLUTTER_TOKEN_ALIASES[parsed.rawValue];
  if (aliasKey) {
    return {
      parsed,
      match: { tokenName: aliasKey, tokenExpression: toTokenExpression(aliasKey), matchedBy: "alias" },
      violation: null,
    };
  }

  // 2. Exact match on normalized value across the relevant registry category
  const match = findExactMatch(parsed.normalizedValue, parsed.type, registry);

  if (match) {
    return { parsed, match, violation: null };
  }

  // 3. No match found
  const violation: Violation = tokensOnly
    ? {
        severity: "FATAL",
        message: `Hard-coded value '${parsed.rawValue}' for prop '${parsed.prop}' has no matching token. Add a token or replace the value.`,
      }
    : {
        severity: "WARN",
        message: `Value '${parsed.rawValue}' for prop '${parsed.prop}' has no matching token. Consider adding one.`,
      };

  return { parsed, match: null, violation };
}

// Chart palette & legend token mapping
export function mapChartColorToToken(colorValue: string, registry: any) {
  // prefer exact token match, else map via palette alias, else return null
  if (!colorValue) return null;
  const colors = registry?.colors ?? {};
  for (const [k, v] of Object.entries(colors)) {
    if (v === colorValue) return { tokenName: k, tokenExpression: toTokenExpression(k) };
  }
  if (registry?.palettes?.chartCategorical?.default) {
    return { tokenName: 'palettes.chartCategorical.default', tokenExpression: JSON.stringify(registry.palettes.chartCategorical.default) };
  }
  return null;
}
```

**Decision point:**
- `tokensOnly: true` + no token match → **FATAL** violation; the style entry must not be emitted
- `tokensOnly: false` + no token match → WARN violation; the raw value is emitted as a fallback
- Matching is always on `normalizedValue`, never on `rawValue` directly (prevents `Color(0xFFFF0000)` vs `#FF0000` mismatches)

---

## Step 4 — Detect and Block Hard-Coded Values

Run a dedicated hard-coded-value scan across all `rawProps` entries, independent of the token matching pass. This is the primary enforcement gate for the `tokensOnly` rule.

```ts
// styling-converter/hardCodedDetector.ts

// Patterns that always indicate a raw, non-token value
const HARD_CODED_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /^#[0-9A-Fa-f]{3,8}$/, category: "hex color" },
  { pattern: /^Color\(0x[0-9A-Fa-f]{8}\)$/, category: "Flutter Color int" },
  { pattern: /^rgba?\(\d/, category: "rgba color" },
  { pattern: /^\d+(\.\d+)?(px|dp|sp)?$/, category: "raw dimension" },
  { pattern: /^FontWeight\.(w\d{3}|bold|normal)$/, category: "raw font weight" },
  { pattern: /^"\w[\w\s-]+"$/, category: "raw font family string" },
];

const SPACING_PROPS   = ["padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
                         "margin", "marginTop", "marginRight", "marginBottom", "marginLeft",
                         "gap", "width", "height"];
const TYPOGRAPHY_PROPS = ["fontSize", "fontWeight", "fontFamily", "lineHeight", "letterSpacing"];
const COLOR_PROPS     = ["color", "backgroundColor", "borderColor", "tintColor"];

export function detectHardCodedValues(
  rawProps: Record<string, string | null>,
  tokensOnly: boolean
): Violation[] {
  const violations: Violation[] = [];

  for (const [prop, value] of Object.entries(rawProps)) {
    if (!value) continue;

    const matched = HARD_CODED_PATTERNS.find(({ pattern }) => pattern.test(value.trim()));
    if (!matched) continue;

    const severity = tokensOnly ? "FATAL" : "WARN";
    violations.push({
      severity,
      message: `Hard-coded ${matched.category} '${value}' found in prop '${prop}'. ${tokensOnly ? "Replace with a design token. Emitting this value is blocked." : "Consider replacing with a design token."}`,
    });
  }

  return violations;
}
```

**Rule:** When `tokensOnly` is `true`, any FATAL from this step must halt output for the affected style entry. The component can still be returned, but the offending style entry is replaced with a `/* TODO: replace hard-coded value */` comment in the `StyleSheet.create` block.

---

## Step 5 — Handle Dynamic Style Values

Dynamic style values (those containing variable references) cannot be matched to tokens at conversion time. They must be emitted as inline style expressions with a mandatory WARN.

```ts
// styling-converter/dynamicStyleHandler.ts

export interface DynamicStyleEntry {
  prop: string;
  expression: string;   // e.g. "isActive ? tokens.colors.primary[500] : tokens.colors.neutral[200]"
  violation: Violation;
}

export function handleDynamicValue(parsed: ParsedStyleValue): DynamicStyleEntry {
  // Dynamic values cannot go into StyleSheet.create — they must be inline
  return {
    prop: parsed.prop,
    expression: parsed.rawValue,   // emitted verbatim
    violation: {
      severity: "WARN",
      message: `Dynamic value '${parsed.rawValue}' for prop '${parsed.prop}' cannot be placed in StyleSheet.create. It will be emitted as an inline style expression. Verify token usage manually.`,
    },
  };
}
```

**Quality check:** Dynamic style entries are emitted in the component JSX as `style={[styles.{key}, { {prop}: {expression} }]}` — not inside `StyleSheet.create`. The `StyleSheet.create` entry for that key must still be generated without the dynamic prop.

---

## Step 6 — Normalize Spacing and Typography

Apply consistent normalization rules for spacing and typography before emitting the final token expression.

```ts
// styling-converter/normalizers.ts

// Spacing: Flutter uses logical pixels; RN uses the same unit — no conversion needed.
// EdgeInsets shorthand → discrete props
export function normalizeEdgeInsets(value: string): Record<string, string> {
  // EdgeInsets.all(16)          → { paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 }
  // EdgeInsets.symmetric(v, h)  → { paddingVertical: v, paddingHorizontal: h }
  // EdgeInsets.only(top: 8)     → { paddingTop: 8 }
  // EdgeInsets.fromLTRB(l,t,r,b)→ { paddingLeft: l, paddingTop: t, paddingRight: r, paddingBottom: b }
  return parseEdgeInsets(value);
}

// Typography: map Flutter TextStyle fields to RN equivalents
export function normalizeTextStyle(flutterTextStyle: Record<string, string>): Record<string, string> {
  return {
    ...(flutterTextStyle.fontSize     && { fontSize:      flutterTextStyle.fontSize }),
    ...(flutterTextStyle.fontWeight   && { fontWeight:    mapFontWeight(flutterTextStyle.fontWeight) }),
    ...(flutterTextStyle.fontFamily   && { fontFamily:    flutterTextStyle.fontFamily }),
    ...(flutterTextStyle.letterSpacing && { letterSpacing: flutterTextStyle.letterSpacing }),
    ...(flutterTextStyle.height       && { lineHeight:    flutterTextStyle.height }),
    ...(flutterTextStyle.color        && { color:         flutterTextStyle.color }),
  };
}

// FontWeight mapping
const FONT_WEIGHT_MAP: Record<string, string> = {
  "FontWeight.w100": "'100'", "FontWeight.w200": "'200'", "FontWeight.w300": "'300'",
  "FontWeight.w400": "'400'", "FontWeight.w500": "'500'", "FontWeight.w600": "'600'",
  "FontWeight.w700": "'700'", "FontWeight.w800": "'800'", "FontWeight.w900": "'900'",
  "FontWeight.bold":   "'700'",
  "FontWeight.normal": "'400'",
};
```

**Quality checks:**
- `EdgeInsets.zero` normalizes to `{ padding: 0 }` — it does not require a token (zero is always safe)
- `lineHeight` in Flutter is a multiplier (`height: 1.5`); in RN it is absolute pixels — emit a WARN: `"Flutter 'height' multiplier '{value}' converted to absolute lineHeight. Verify with design spec."`
- `fontFamily` strings are emitted as-is; if not matched to a `typography.fontFamilies` token, produce a WARN

---

## Step 7 — Build the StyleSheet Output

Assemble all resolved token expressions and fallback values into a `StyleSheet.create`-compatible object and the final output schema.

```ts
// styling-converter/buildStyleSheet.ts

export interface StyleSheetEntry {
  key: string;                          // e.g. "container", "title"
  tokenizedProps: Record<string, string>; // prop → token expression or raw fallback
  dynamicProps: DynamicStyleEntry[];    // emitted as inline styles, not in StyleSheet
  hasFallbacks: boolean;                // true if any prop used raw value (tokensOnly: false path)
}

export function buildStyleSheetEntry(
  key: string,
  mappingResults: TokenMappingResult[],
  dynamicEntries: DynamicStyleEntry[]
): StyleSheetEntry {
  const tokenizedProps: Record<string, string> = {};
  let hasFallbacks = false;

  for (const result of mappingResults) {
    if (result.match) {
      tokenizedProps[result.parsed.prop] = result.match.tokenExpression;
    } else if (!result.violation || result.violation.severity === "WARN") {
      // Fallback: emit raw value only when tokensOnly is false
      tokenizedProps[result.parsed.prop] = result.parsed.normalizedValue;
      hasFallbacks = true;
    }
    // FATAL violations: prop is omitted from output (caller receives violation)
  }

  return { key, tokenizedProps, dynamicProps: dynamicEntries, hasFallbacks };
}
```

**Output schema:**

```json
{
  "styleSheetEntries": [
    {
      "key": "string",
      "tokenizedProps": { "propName": "tokenExpression" },
      "dynamicProps": [
        { "prop": "string", "expression": "string" }
      ],
      "hasFallbacks": false
    }
  ],
  "violations": [
    { "severity": "FATAL | WARN", "message": "string" }
  ]
}
```

---

## Step 8 — Validate the StyleSheet Output

Run final validation across all emitted style entries before returning.

```ts
// styling-converter/validateStyleSheet.ts

export function validateStyleSheet(
  entries: StyleSheetEntry[],
  tokensOnly: boolean
): Violation[] {
  const violations: Violation[] = [];

  for (const entry of entries) {
    // 1. No raw hex values in tokenized props when tokensOnly is true
    for (const [prop, value] of Object.entries(entry.tokenizedProps)) {
      if (tokensOnly && /#[0-9A-Fa-f]{3,8}/.test(value)) {
        violations.push({
          severity: "FATAL",
          message: `Raw hex color '${value}' found in StyleSheet entry '${entry.key}.${prop}' after token mapping. This must not be emitted.`,
        });
      }

      // 2. No raw numeric string for spacing/color props (should be token expression)
      if (tokensOnly && /^\d+$/.test(value) && COLOR_PROPS.includes(prop)) {
        violations.push({
          severity: "FATAL",
          message: `Raw numeric value '${value}' used as color in '${entry.key}.${prop}'. Colors must be token expressions.`,
        });
      }
    }

    // 3. Warn if entry has fallbacks
    if (entry.hasFallbacks) {
      violations.push({
        severity: "WARN",
        message: `StyleSheet entry '${entry.key}' contains raw fallback values. Token coverage is incomplete.`,
      });
    }
  }

  return violations;
}
```

Run through this checklist before returning:

- [ ] No raw hex color (`#RRGGBB`, `#RGB`) present in any `tokenizedProps` value when `tokensOnly` is `true`
- [ ] No `Color(0x...)` or `Colors.*` Flutter expressions remain in any output value
- [ ] All spacing props for numeric values are either token expressions or zero
- [ ] All `fontWeight` values are string literals (`"700"`) not `FontWeight.*` references
- [ ] Dynamic props are in `dynamicProps[]`, not in `tokenizedProps`
- [ ] `violations[]` contains no `FATAL` entries before returning
- [ ] Every `hasFallbacks: true` entry has a corresponding WARN in `violations[]`
- [ ] Token expressions use the declared token access pattern (e.g. `tokens.colors.primary[500]`, not magic strings)
- [ ] **Theme context file generated** (see Step 9 below) — every feature output includes `ThemeContext.tsx` and split light/dark token files
- [ ] **BoxDecoration complete mapping** — all four BoxDecoration sub-properties converted (see Step 9 rules)

---

## Step 9 — Generate Theme Context (Mandatory — Light + Dark Support)

This step is **non-optional**. Every conversion that produces StyleSheet entries MUST also produce a `ThemeContext.tsx` with split light and dark token sets. A conversion that generates only static StyleSheet constants without a theme context is always a **FATAL**.

**Rule: No component may use a static color/spacing constant directly from a file — all theme-aware values must come from `useTheme()`.**

### 9a — Generate Split Token Files

From the unified `tokenRegistry`, split into two typed token sets:

```ts
// shared/theme/tokens.light.ts
export const lightTokens = {
  colors: {
    background:    '#FFFFFF',
    surface:       '#F5F5F5',
    text:          '#000000',
    textSecondary: '#555555',
    primary:       '<primaryColor>',    // from token registry
    border:        '#E0E0E0',
    // ... all color tokens mapped to light-mode values
  },
  spacing: { /* identical to tokenRegistry.spacing */ },
  typography: { /* identical to tokenRegistry.typography */ },
};

// shared/theme/tokens.dark.ts
export const darkTokens = {
  colors: {
    background:    '#121212',
    surface:       '#1E1E1E',
    text:          '#FFFFFF',
    textSecondary: '#AAAAAA',
    primary:       '<primaryColor>',    // same brand primary — does not invert
    border:        '#333333',
    // ... all color tokens mapped to dark-mode values
  },
  spacing: { /* identical — spacing does not change between themes */ },
  typography: { /* identical — typography does not change between themes */ },
};
```

**Token split rules:**
- `spacing` and `typography` tokens are IDENTICAL in both files — they do not change between light and dark modes.
- `colors` tokens MUST have a separate value for each theme. If a Flutter color is used only in one theme context (e.g. only in a dark-mode scaffold), carry it to both sets with an appropriate light-mode counterpart.
- Brand/primary colors do NOT invert between themes — use the same value in both files.
- When a color token value is not specified for a theme → emit WARN: `"Color token '{tokenName}' has no dark-mode value. Using light-mode value as fallback — review with designer."` and copy the light value.

### 9b — Generate `ThemeContext.tsx`

```tsx
// shared/theme/ThemeContext.tsx
import React from 'react';
import { useColorScheme } from 'react-native';
import { lightTokens } from './tokens.light';
import { darkTokens } from './tokens.dark';

export type ThemeTokens = typeof lightTokens;

export const ThemeContext = React.createContext<ThemeTokens>(lightTokens);

/**
 * Wrap the root App component with <ThemeProvider>.
 * Automatically responds to the device system theme (no manual toggle required).
 * Mirrors Flutter's Theme.of(context) pattern.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme(); // 'light' | 'dark' | null
  const tokens = colorScheme === 'dark' ? darkTokens : lightTokens;

  return (
    <ThemeContext.Provider value={tokens}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Use in any component instead of reading static constants */
export const useTheme = () => React.useContext(ThemeContext);
```

**ThemeContext generation rules:**
- `ThemeContext.tsx` is ALWAYS generated — even if the tokenRegistry contains only one color. Never skip theme context generation.
- The generated context type is `typeof lightTokens` — this guarantees TypeScript type safety on both token sets (they must have the same shape).
- `useColorScheme()` from `react-native` is used as the system theme detector — no third-party library required.
- If the orchestrator's `constitutionConfig` already declares an existing `ThemeProvider` in the target project → skip generation and emit INFO: `"Existing ThemeProvider detected at '{path}'. Skipping generation — verify it supports both light and dark token sets."` Do not overwrite.
- Emit a FATAL if any generated component file uses `StyleSheet.create()` with hardcoded color strings instead of `useTheme()` values: `"FATAL: Component '{name}' uses static color '{value}' in StyleSheet.create. All colors must come from useTheme(). Replace with: const theme = useTheme(); and use theme.colors.<token>."`

### 9c — BoxDecoration Complete Mapping Checklist

Every Flutter `BoxDecoration` encountered during styling conversion MUST produce ALL applicable React Native style props. A partial mapping that omits properties is a **WARN** (when the omitted prop has no RN equivalent) or a **FATAL** (when the omitted prop has a clear RN equivalent).

| Flutter BoxDecoration prop | React Native equivalent | Missing = |
|---|---|---|
| `color` | `backgroundColor` | **FATAL** |
| `borderRadius: BorderRadius.circular(n)` | `borderRadius: n` | **FATAL** |
| `borderRadius: BorderRadius.only(...)` | `borderTopLeftRadius`, `borderTopRightRadius`, `borderBottomLeftRadius`, `borderBottomRightRadius` | **FATAL** |
| `border: Border.all(color, width)` | `borderColor`, `borderWidth` | **FATAL** |
| `border: Border(top, right, bottom, left)` | `borderTopColor`/`Width`, `borderRightColor`/`Width`, `borderBottomColor`/`Width`, `borderLeftColor`/`Width` | **FATAL** |
| `boxShadow` | `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` + `elevation` (Android) | **WARN** if not mapped |
| `gradient` | No direct RN equivalent — use `<LinearGradient>` from `react-native-linear-gradient` | **WARN** with note |
| `image: DecorationImage` | No direct StyleSheet equivalent — use `<ImageBackground>` wrapper component | **WARN** with note |

**Enforcement rule:** After processing any widget that has a `decoration: BoxDecoration(...)` prop, verify that every non-null BoxDecoration property has a corresponding entry in the output StyleSheet. For each property mapped to **FATAL** above that is absent from the output → emit the FATAL violation. Never silently drop a BoxDecoration property.

---

## File Layout Reference

```
styling-converter/
├── index.ts                   ← Orchestrator: runs steps 1–8 in order
├── parseFlutterStyles.ts      ← Step 2: raw props → ParsedStyleValue[]
├── tokenMapper.ts             ← Step 3: ParsedStyleValue → TokenMappingResult[]
├── hardCodedDetector.ts       ← Step 4: raw prop scan → FATAL/WARN violations
├── dynamicStyleHandler.ts     ← Step 5: dynamic values → DynamicStyleEntry[]
├── normalizers.ts             ← Step 6: EdgeInsets, TextStyle, FontWeight normalization
├── buildStyleSheet.ts         ← Step 7: assemble StyleSheetEntry[]
├── validateStyleSheet.ts      ← Step 8: final validation + fatal gate
├── errors.ts                  ← StylingFatalError, Violation types
└── __tests__/
    ├── tokenMapper.test.ts
    ├── hardCodedDetector.test.ts
    ├── normalizers.test.ts
    └── validateStyleSheet.test.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Token enforcement is non-negotiable | When `tokensOnly` is `true`, any unmapped raw value is a FATAL — it is never silently passed through |
| Hard-coded scan is independent | The `hardCodedDetector` runs separately from token matching; a value can fail both passes and must accumulate both violations |
| Raw values stored, never mutated | `rawValue` is immutable throughout the pipeline; only `normalizedValue` is used for matching |
| Dynamic values are inline-only | Dynamic style expressions never enter `StyleSheet.create`; they are emitted as inline style objects with mandatory WARNs |
| Zero is always safe | `EdgeInsets.zero`, `SizedBox.shrink`, and numeric `0` never require tokens and must not produce violations |
| Fallback ≠ silence | When `tokensOnly` is `false` and a raw value is emitted, it always produces a WARN — never passes silently |
| Single token registry | The caller supplies one registry for the entire conversion run; the skill never merges, infers, or extends it |
