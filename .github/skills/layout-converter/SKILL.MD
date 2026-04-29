---
name: layout-converter
description: "MUST be used whenever Flutter layout widgets need to be converted into React Native Flexbox-based layouts. Use when: converting Row, Column, Expanded, Flexible, Spacer, Stack, Positioned, or Wrap widgets to RN equivalents; mapping Flutter MainAxisAlignment and CrossAxisAlignment to justifyContent and alignItems; translating MediaQuery usage to React Native Dimensions or responsive hooks; preserving visual hierarchy, nesting, and scroll behavior during Flutter-to-RN migration. Keywords: layout converter, flexbox, flutter layout, row column, expanded flexible, spacer, alignment, justifycontent, alignitems, mediaquery, responsive, nested layout, scroll, absolute positioning."
priority: HIGH
auto-trigger: true
---

# Layout Converter

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

> Trigger this skill **after** the Component Classifier has assigned widgets to the presentation layer and **before** the Widget to JSX Converter writes component files. Layout conversion is a prerequisite for JSX assembly — an incorrect flex mapping will break visual hierarchy in ways that are difficult to detect after the fact.

## Background — Flutter Layout vs. React Native Flexbox

Flutter and React Native both use a flexbox-inspired layout model, but they differ in critical defaults that cause silent visual regressions if not explicitly mapped:

| Concern | Flutter default | React Native default |
|---------|----------------|---------------------|
| Main axis direction | `Column` = vertical, `Row` = horizontal (explicit) | `flexDirection: 'column'` (implicit) |
| Cross-axis stretch | `CrossAxisAlignment.stretch` on `Column` | `alignItems: 'stretch'` (RN default) |
| Child sizing | `Expanded` consumes remaining space via `flex: 1` | Same — but parent must have a bounded size |
| Spacing between children | `mainAxisSpacing`, `SizedBox` gaps | `gap` (RN 0.71+) or `margin` on children |
| Overflow | `flutter.Overflow.clip` / `.visible` | `overflow: 'hidden'` / `'visible'` |
| Absolute positioning | `Stack` + `Positioned` | `position: 'absolute'` + `top/left/right/bottom` |

**Why incorrect mapping breaks UI:** A `Row` with `MainAxisAlignment.spaceBetween` that is converted without `justifyContent: 'space-between'` will render all children left-aligned — no error, no warning, silent layout collapse. This skill exists to prevent exactly that category of silent regression.

---

## Step 1 — Receive and Validate Input

Accept `layoutWidgets` (the presentation layer's widget nodes filtered to layout-type components) and `screenContext` (screen dimensions and safe-area insets at conversion time).

**Input schema:**

```json
{
  "layoutWidgets": [
    {
      "name": "string",
      "type": "core | custom | unknown",
      "props": {
        "mainAxisAlignment": "string | null",
        "crossAxisAlignment": "string | null",
        "mainAxisSize": "string | null",
        "children": "array | null",
        "expanded": "boolean | null",
        "flex": "number | null",
        "padding": "string | null",
        "width": "string | null",
        "height": "string | null",
        "scrollDirection": "string | null",
        "physics": "string | null",
        "reverse": "boolean | null",
        "clipBehavior": "string | null"
      },
      "children": [],
      "startLine": 0,
      "endLine": 0
    }
  ],
  "screenContext": {
    "logicalWidth": 390,
    "logicalHeight": 844,
    "safeAreaTop": 44,
    "safeAreaBottom": 34,
    "pixelRatio": 3
  }
}
```

**Decision point:**
- If `layoutWidgets` is null, undefined, or empty → **FAIL**: `"FATAL: Input 'layoutWidgets' is empty. Nothing to convert."`
- If `screenContext` is null → add a WARN: `"screenContext not provided. MediaQuery conversions will use placeholder dimensions. Verify responsive behavior manually."` and substitute `{ logicalWidth: 390, logicalHeight: 844 }` as a safe default
- If any widget has `type: "unknown"` → add a WARN per widget and convert it as a `<View>` with no flex props; do not skip it
- If `layoutWidgets` contains non-layout widget types (e.g. `Text`, `Image`) → **FAIL**: `"FATAL: Non-layout widgets passed to the Layout Converter. Filter to layout-type nodes before calling this skill."`

**Rule:** This skill converts layout structure only — it does not convert text, images, API calls, or state. Any non-layout content in a layout node's children is treated as an opaque placeholder and emitted as `{/* child: {name} */}`.

---

## Step 2 — Load the Layout Mapping Table

All widget-to-flexbox conversions must be driven by this table. Direct string substitutions inside traversal logic are forbidden.

```ts
// layout-converter/layoutMap.ts

export interface LayoutMapping {
  rnComponent: string;
  baseStyles: Record<string, string>;        // always-applied RN flex styles
  propMappings: Record<string, PropMapping>; // Flutter prop → RN style transformer
  scrollable: boolean;
  supportsAbsoluteChildren: boolean;
  notes?: string;
}

export interface PropMapping {
  rnStyleProp: string;
  transform: (value: string) => string | null; // null = drop the prop
}

export const LAYOUT_MAP: Record<string, LayoutMapping> = {
  Row: {
    rnComponent: "View",
    baseStyles: { flexDirection: "'row'" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      mainAxisAlignment:  { rnStyleProp: "justifyContent", transform: mapMainAxisAlignment },
      crossAxisAlignment: { rnStyleProp: "alignItems",     transform: mapCrossAxisAlignment },
      mainAxisSize:       { rnStyleProp: "alignSelf",      transform: mapMainAxisSize },
    },
  },
  Column: {
    rnComponent: "View",
    baseStyles: { flexDirection: "'column'" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      mainAxisAlignment:  { rnStyleProp: "justifyContent", transform: mapMainAxisAlignment },
      crossAxisAlignment: { rnStyleProp: "alignItems",     transform: mapCrossAxisAlignment },
      mainAxisSize:       { rnStyleProp: "alignSelf",      transform: mapMainAxisSize },
    },
  },
  Expanded: {
    rnComponent: "View",
    baseStyles: { flex: "1" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      flex: { rnStyleProp: "flex", transform: (v) => v },
    },
    notes: "Parent must have a bounded dimension for flex: 1 to take effect.",
  },
  Flexible: {
    rnComponent: "View",
    baseStyles: {},
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      flex:    { rnStyleProp: "flex",      transform: (v) => v },
      fit:     { rnStyleProp: "flexShrink", transform: mapFlexFit },
    },
    notes: "FlexFit.tight → flexShrink: 0; FlexFit.loose → flexShrink: 1.",
  },
  Spacer: {
    rnComponent: "View",
    baseStyles: { flex: "1" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      flex: { rnStyleProp: "flex", transform: (v) => v },
    },
    notes: "Spacer with no flex prop defaults to flex: 1.",
  },
  Wrap: {
    rnComponent: "View",
    baseStyles: { flexDirection: "'row'", flexWrap: "'wrap'" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      spacing:     { rnStyleProp: "gap",            transform: (v) => v },
      runSpacing:  { rnStyleProp: "rowGap",         transform: (v) => v },
      alignment:   { rnStyleProp: "justifyContent", transform: mapWrapAlignment },
      crossAxisAlignment: { rnStyleProp: "alignItems", transform: mapCrossAxisAlignment },
    },
  },
  Stack: {
    rnComponent: "View",
    baseStyles: { position: "'relative'" },
    scrollable: false,
    supportsAbsoluteChildren: true,
    propMappings: {
      alignment: { rnStyleProp: "alignItems", transform: mapStackAlignment },
      clipBehavior: { rnStyleProp: "overflow", transform: mapClipBehavior },
    },
    notes: "Stack children that are Positioned widgets must be converted with position: 'absolute'.",
  },
  Positioned: {
    rnComponent: "View",
    baseStyles: { position: "'absolute'" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      top:    { rnStyleProp: "top",    transform: (v) => v },
      bottom: { rnStyleProp: "bottom", transform: (v) => v },
      left:   { rnStyleProp: "left",   transform: (v) => v },
      right:  { rnStyleProp: "right",  transform: (v) => v },
      width:  { rnStyleProp: "width",  transform: (v) => v },
      height: { rnStyleProp: "height", transform: (v) => v },
    },
  },
  SingleChildScrollView: {
    rnComponent: "ScrollView",
    baseStyles: {},
    scrollable: true,
    supportsAbsoluteChildren: false,
    propMappings: {
      scrollDirection: { rnStyleProp: "horizontal", transform: (v) => v === "Axis.horizontal" ? "{true}" : null },
      reverse:         { rnStyleProp: "inverted",   transform: (v) => v === "true" ? "{true}" : null },
      physics:         { rnStyleProp: "scrollEnabled", transform: mapScrollPhysics },
    },
    notes: "Add contentContainerStyle for inner flex layout.",
  },
  ListView:  {
    rnComponent: "ScrollView",
    baseStyles: {},
    scrollable: true,
    supportsAbsoluteChildren: false,
    propMappings: {
      scrollDirection: { rnStyleProp: "horizontal", transform: (v) => v === "Axis.horizontal" ? "{true}" : null },
      physics:         { rnStyleProp: "scrollEnabled", transform: mapScrollPhysics },
    },
    notes: "For long lists, prefer FlatList (handled by Widget to JSX Converter).",
  },
  SizedBox: {
    rnComponent: "View",
    baseStyles: {},
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      width:  { rnStyleProp: "width",  transform: (v) => v },
      height: { rnStyleProp: "height", transform: (v) => v },
    },
    notes: "SizedBox with no width/height acts as an invisible spacer — emit as <View />.",
  },
  Padding: {
    rnComponent: "View",
    baseStyles: {},
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {
      padding: { rnStyleProp: "padding", transform: (v) => v }, // further split by normalizer
    },
  },
  Center: {
    rnComponent: "View",
    baseStyles: { alignItems: "'center'", justifyContent: "'center'" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {},
  },
  SafeArea: {
    rnComponent: "SafeAreaView",
    baseStyles: {},
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {},
  },
  DraggableScrollableSheet: {
    rnComponent: "BottomSheet",
    baseStyles: {},
    scrollable: true,
    supportsAbsoluteChildren: false,
    propMappings: {
      initialChildSize: { rnStyleProp: "initialSnapPoint", transform: (v) => `'${Math.round(parseFloat(v) * 100)}%'` },
      minChildSize:     { rnStyleProp: "minSnapPoint",     transform: (v) => `'${Math.round(parseFloat(v) * 100)}%'` },
      maxChildSize:     { rnStyleProp: "maxSnapPoint",     transform: (v) => `'${Math.round(parseFloat(v) * 100)}%'` },
    },
    notes: "Requires @gorhom/bottom-sheet. snapPoints is a prop, not a style. Percentage values derived from Flutter's 0.0–1.0 child size fractions.",
  },
  TabBarView: {
    rnComponent: "View",
    baseStyles: { flex: "1" },
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {},
    notes: "Tab content container. Each child is a tab body driven by selectedIndex state. Parent must be height-bounded.",
  },
  _unknown: {
    rnComponent: "View",
    baseStyles: {},
    scrollable: false,
    supportsAbsoluteChildren: false,
    propMappings: {},
    notes: "Unmapped layout widget — converted to View with no flex props.",
  },
};
```

**Quality check:** Any widget not in `LAYOUT_MAP` falls back to `_unknown` and produces a WARN: `"Layout widget '{name}' has no mapping. Converted to <View> with no flex props. Review manually."`

---

## Step 3 — Map Alignment Props

Flutter alignment enums must be mapped to their Flexbox equivalents before the layout tree is traversed. Mapping must be exact — approximations must be flagged.

```ts
// layout-converter/alignmentMapper.ts

// MainAxisAlignment → justifyContent
export function mapMainAxisAlignment(value: string): string | null {
  const MAP: Record<string, string> = {
    "MainAxisAlignment.start":        "'flex-start'",
    "MainAxisAlignment.end":          "'flex-end'",
    "MainAxisAlignment.center":       "'center'",
    "MainAxisAlignment.spaceBetween": "'space-between'",
    "MainAxisAlignment.spaceAround":  "'space-around'",
    "MainAxisAlignment.spaceEvenly":  "'space-evenly'",
  };
  return MAP[value] ?? null; // null → WARN in caller
}

// CrossAxisAlignment → alignItems
export function mapCrossAxisAlignment(value: string): string | null {
  const MAP: Record<string, string> = {
    "CrossAxisAlignment.start":    "'flex-start'",
    "CrossAxisAlignment.end":      "'flex-end'",
    "CrossAxisAlignment.center":   "'center'",
    "CrossAxisAlignment.stretch":  "'stretch'",
    "CrossAxisAlignment.baseline": "'baseline'",  // WARN: RN baseline support is limited
  };

  if (value === "CrossAxisAlignment.baseline") {
    emitViolation({
      severity: "WARN",
      message: "CrossAxisAlignment.baseline mapped to 'baseline'. React Native baseline alignment is limited — verify rendering on both platforms.",
    });
  }

  return MAP[value] ?? null;
}

// WrapAlignment → justifyContent
export function mapWrapAlignment(value: string): string | null {
  const MAP: Record<string, string> = {
    "WrapAlignment.start":        "'flex-start'",
    "WrapAlignment.end":          "'flex-end'",
    "WrapAlignment.center":       "'center'",
    "WrapAlignment.spaceBetween": "'space-between'",
    "WrapAlignment.spaceAround":  "'space-around'",
    "WrapAlignment.spaceEvenly":  "'space-evenly'",
  };
  return MAP[value] ?? null;
}
```

**Decision point:**
- If a `MainAxisAlignment` value returns `null` → **FAIL**: `"FATAL: Unrecognized MainAxisAlignment value '{value}' on '{widgetName}'. Alignment cannot be guaranteed. Add a mapping or fix the source."`
- If a `CrossAxisAlignment` value returns `null` → **FAIL**: `"FATAL: Unrecognized CrossAxisAlignment value '{value}' on '{widgetName}'."`
- If `CrossAxisAlignment.baseline` is used → WARN and proceed with `'baseline'`

---

## Step 4 — Traverse the Layout Tree

Walk the widget tree depth-first, applying the layout mapping at each node before recursing into children. Preserve parent-child relationships exactly.

```ts
// layout-converter/traverseLayoutTree.ts

export interface LayoutNode {
  rnComponent: string;
  styleKey: string;              // unique key for StyleSheet entry, e.g. "row_1_col_2"
  flexStyles: Record<string, string>;
  inlineStyles: Record<string, string>; // only for position: 'absolute' children
  children: LayoutNode[];
  isScrollable: boolean;
  contentContainerStyles?: Record<string, string>; // for ScrollView
  violations: Violation[];
  notes: string[];               // migration notes from mapping table
}

export function traverseLayoutTree(
  widget: WidgetNode,
  parentMapping: LayoutMapping | null,
  depth: number,
  path: string
): LayoutNode {
  const mapping = LAYOUT_MAP[widget.name] ?? LAYOUT_MAP["_unknown"];
  const violations: Violation[] = [];
  const flexStyles: Record<string, string> = { ...mapping.baseStyles };

  // Apply prop mappings
  for (const [flutterProp, propMapping] of Object.entries(mapping.propMappings)) {
    const flutterValue = widget.props[flutterProp];
    if (!flutterValue) continue;

    const rnValue = propMapping.transform(flutterValue);
    if (rnValue === null) {
      violations.push({
        severity: "WARN",
        message: `Prop '${flutterProp}="${flutterValue}"' on '${widget.name}' at path '${path}' has no RN equivalent. Dropped.`,
      });
      continue;
    }
    flexStyles[propMapping.rnStyleProp] = rnValue;
  }

  // Validate parent-child flex compatibility
  if (parentMapping && !parentMapping.supportsAbsoluteChildren && widget.name === "Positioned") {
    violations.push({
      severity: "FATAL",
      message: `'Positioned' widget at '${path}' is a child of '${parentMapping.rnComponent}' which does not support absolute children. Wrap the parent in a Stack.`,
    });
  }

  // Recurse into children
  const children = widget.children.map((child, i) =>
    traverseLayoutTree(child, mapping, depth + 1, `${path}[${i}]`)
  );

  return {
    rnComponent: mapping.rnComponent,
    styleKey: `${widget.name.toLowerCase()}_${path.replace(/\[|\]/g, "_")}`,
    flexStyles,
    inlineStyles: widget.name === "Positioned" ? flexStyles : {},
    children,
    isScrollable: mapping.scrollable,
    contentContainerStyles: mapping.scrollable ? deriveContentContainerStyles(widget, children) : undefined,
    violations: [...violations, ...children.flatMap((c) => c.violations)],
    notes: mapping.notes ? [mapping.notes] : [],
  };
}
```

**Quality checks:**
- Depth-first traversal must handle unlimited nesting without a depth cap
- `Positioned` outside a `Stack` parent is always a **FATAL**
- `Expanded` and `Flexible` without a flex parent (`Row`, `Column`) produce a WARN: `"'Expanded' at '{path}' has no Row/Column parent. 'flex: 1' will have no effect in React Native."`

---

## Step 5 — Handle Scroll + Flex Mixed Layouts

Scroll containers require special handling to avoid the common `flex: 1` inside `ScrollView` pitfall.

```ts
// layout-converter/scrollHandler.ts

// React Native rule: ScrollView children must NOT have flex: 1 on the scroll axis.
// Flutter: SingleChildScrollView wrapping a Column with Expanded children is common.

export function validateScrollFlexCompatibility(
  scrollNode: LayoutNode,
  scrollAxis: "vertical" | "horizontal"
): Violation[] {
  const violations: Violation[] = [];

  function checkChild(child: LayoutNode, axis: "vertical" | "horizontal"): void {
    const conflictingProp = axis === "vertical" ? "flex" : "flex";
    if (child.flexStyles[conflictingProp] === "1") {
      violations.push({
        severity: "WARN",
        message: `Child '${child.styleKey}' inside a ScrollView has 'flex: 1' on the scroll axis. This prevents the ScrollView from scrolling. Remove 'flex: 1' or use 'flexGrow: 1' on the content container instead.`,
      });
    }
    child.children.forEach((c) => checkChild(c, axis));
  }

  scrollNode.children.forEach((c) => checkChild(c, scrollAxis));

  // For ScrollViews wrapping Column: use contentContainerStyle={{ flexGrow: 1 }}
  if (scrollAxis === "vertical") {
    scrollNode.contentContainerStyles = {
      ...(scrollNode.contentContainerStyles ?? {}),
      flexGrow: "1",
    };
  }

  return violations;
}
```

**Rule:** Any `Expanded` or `Flexible` widget that is a direct or indirect child of a `SingleChildScrollView` or `ListView` on the same scroll axis always produces a WARN — it will prevent scrolling in React Native.

---

## Step 6 — Convert MediaQuery to Dimensions / Responsive Hooks

Replace all `MediaQuery.of(context)` usages with React Native's `Dimensions` API or a responsive hook.

```ts
// layout-converter/mediaQueryConverter.ts

export interface MediaQueryConversion {
  originalExpression: string;    // e.g. "MediaQuery.of(context).size.width"
  rnExpression: string;          // e.g. "Dimensions.get('window').width"
  requiresHook: boolean;         // true if value must update on orientation change
  violation: Violation | null;
}

const MEDIA_QUERY_MAP: Record<string, (ctx: ScreenContext) => MediaQueryConversion> = {
  "MediaQuery.of(context).size.width": (ctx) => ({
    originalExpression: "MediaQuery.of(context).size.width",
    rnExpression: "Dimensions.get('window').width",
    requiresHook: true,
    violation: {
      severity: "WARN",
      message: "MediaQuery width converted to Dimensions.get('window').width. Use 'useWindowDimensions' hook for orientation-safe responsive layouts.",
    },
  }),
  "MediaQuery.of(context).size.height": (ctx) => ({
    originalExpression: "MediaQuery.of(context).size.height",
    rnExpression: "Dimensions.get('window').height",
    requiresHook: true,
    violation: {
      severity: "WARN",
      message: "MediaQuery height converted to Dimensions.get('window').height. Use 'useWindowDimensions' hook for orientation-safe responsive layouts.",
    },
  }),
  "MediaQuery.of(context).padding.top": (ctx) => ({
    originalExpression: "MediaQuery.of(context).padding.top",
    rnExpression: "insets.top",
    requiresHook: true,
    violation: {
      severity: "WARN",
      message: "MediaQuery top padding converted to safe area inset. Wrap the component with SafeAreaProvider and use useSafeAreaInsets().",
    },
  }),
  "MediaQuery.of(context).viewInsets.bottom": (ctx) => ({
    originalExpression: "MediaQuery.of(context).viewInsets.bottom",
    rnExpression: "keyboardHeight",
    requiresHook: true,
    violation: {
      severity: "WARN",
      message: "MediaQuery keyboard inset converted. Use 'useKeyboard' or 'KeyboardAvoidingView' in React Native.",
    },
  }),
};
```

**Decision point:**
- `MediaQuery` expressions not in the map → add a WARN and emit as `/* TODO: convert MediaQuery expression: {raw} */`
- When any `requiresHook: true` conversion exists → add a top-level note to the output: `"One or more MediaQuery conversions require the 'useWindowDimensions' or 'useSafeAreaInsets' hook. Add these to the component."`

---

## Step 7 — Render Layout JSX

Assemble the traversed layout tree into a JSX string, applying style keys and scroll container patterns.

```ts
// layout-converter/renderLayoutJsx.ts

export function renderLayoutNode(node: LayoutNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const styleRef = Object.keys(node.flexStyles).length > 0
    ? `style={styles.${node.styleKey}}`
    : "";

  // ScrollView needs contentContainerStyle
  const contentContainerProp = node.isScrollable && node.contentContainerStyles
    ? `contentContainerStyle={styles.${node.styleKey}_content}`
    : "";

  // Positioned nodes use inline style to avoid StyleSheet positioning edge cases
  const inlineStyle = Object.keys(node.inlineStyles).length > 0
    ? `style={[styles.${node.styleKey}]}`
    : styleRef;

  const props = [inlineStyle, contentContainerProp].filter(Boolean).join(" ");

  if (node.children.length === 0) {
    return `${indent}<${node.rnComponent} ${props} />`;
  }

  const childJsx = node.children
    .map((child) => renderLayoutNode(child, depth + 1))
    .join("\n");

  return `${indent}<${node.rnComponent} ${props}>\n${childJsx}\n${indent}</${node.rnComponent}>`;
}
```

---

## Step 8 — Validate Layout Integrity

Run a post-render structural check before returning the output.

```ts
// layout-converter/validateLayout.ts

export function validateLayoutIntegrity(
  root: LayoutNode,
  originalWidgetCount: number
): Violation[] {
  const violations: Violation[] = [];
  const convertedCount = countNodes(root);

  // 1. Node count must match — no widget may be silently dropped
  if (convertedCount !== originalWidgetCount) {
    violations.push({
      severity: "FATAL",
      message: `Layout node count mismatch. Expected ${originalWidgetCount}, got ${convertedCount}. Widget(s) were silently dropped during conversion.`,
    });
  }

  // 2. No Positioned node outside a Stack (position: 'relative') parent
  validatePositionedNesting(root, false, violations);

  // 3. No flex: 1 on ScrollView direct children (already caught in Step 5, re-validated here)
  validateScrollFlexChildren(root, violations);

  // 4. All alignment props are present where source had explicit alignment
  validateAlignmentCoverage(root, violations);

  return violations;
}
```

Run through this checklist before returning:

- [ ] Widget node count in output matches input — no nodes silently dropped
- [ ] Every `Row` output has `flexDirection: 'row'` in its style entry
- [ ] Every `Column` output has `flexDirection: 'column'` in its style entry
- [ ] Every explicit `MainAxisAlignment` has a corresponding `justifyContent` in output styles
- [ ] Every explicit `CrossAxisAlignment` has a corresponding `alignItems` in output styles
- [ ] No `Expanded` or `Flexible` node appears as a direct child of a `ScrollView`
- [ ] No `Positioned` node appears outside a `position: 'relative'` parent
- [ ] All `MediaQuery` expressions are either converted or emitted as `TODO` comments
- [ ] `violations[]` contains no `FATAL` entries before returning
- [ ] `flexMappings` contains an entry for every layout node in the tree

---

## Step 9 — Return the Conversion Result

Assemble all layout artefacts into the canonical output shape.

**Output schema:**

```json
{
  "layoutJSX": "string",
  "flexMappings": {
    "styleKey": {
      "flutterWidget": "string",
      "rnComponent": "string",
      "flexStyles": {},
      "notes": []
    }
  },
  "violations": []
}
```

---

## File Layout Reference

```
layout-converter/
├── index.ts                       ← Orchestrator: runs steps 1–9 in order
├── layoutMap.ts                   ← Step 2: Flutter layout widgets → RN mapping table
├── alignmentMapper.ts             ← Step 3: MainAxisAlignment / CrossAxisAlignment → Flexbox
├── traverseLayoutTree.ts          ← Step 4: depth-first traversal → LayoutNode tree
├── scrollHandler.ts               ← Step 5: scroll + flex compatibility validation
├── mediaQueryConverter.ts         ← Step 6: MediaQuery → Dimensions / hooks
├── renderLayoutJsx.ts             ← Step 7: LayoutNode tree → JSX string
├── validateLayout.ts              ← Step 8: post-render structural validation
├── assembleResult.ts              ← Step 9: final output shape + fatal gate
├── errors.ts                      ← LayoutFatalError, Violation types
└── __tests__/
    ├── alignmentMapper.test.ts
    ├── traverseLayoutTree.test.ts
    ├── scrollHandler.test.ts
    ├── mediaQueryConverter.test.ts
    └── validateLayout.test.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Hierarchy is inviolable | Parent-child relationships in the layout tree must be preserved exactly; reordering or flattening is never permitted |
| Alignment is never optional | Any explicit `MainAxisAlignment` or `CrossAxisAlignment` in the source must have a corresponding Flexbox prop in the output — omitting it is a FATAL |
| Table-driven mapping | All widget and alignment conversions are driven by `LAYOUT_MAP` and the alignment mappers; ad-hoc substitutions inside the traversal are forbidden |
| Scroll-flex incompatibility is a WARN | `flex: 1` inside a `ScrollView` on the same axis does not crash — it silently breaks scrolling. It must always be flagged |
| MediaQuery is always approximate | Every `MediaQuery` conversion carries a WARN because RN's `Dimensions` API and Flutter's `MediaQuery` have subtly different behaviors on orientation change and keyboard appearance |
| No silent drops | Every widget in the input must appear in the output — either converted or as a comment placeholder. A node count mismatch is a FATAL |
| Positioned requires Stack | A `Positioned` child without a `Stack` (position: 'relative') parent is always a FATAL — it will silently mis-render in React Native |
