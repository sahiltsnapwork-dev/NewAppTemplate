---
name: widget-to-jsx-converter
description: "MUST be used whenever Flutter/Dart widget trees need to be converted into React Native JSX. Use when: converting presentation-layer components from Flutter to React Native; mapping Flutter widgets (Container, Row, Column, Text, Stack, etc.) to their React Native equivalents; generating functional TypeScript components from classified Flutter widget nodes; translating widget props, children, and conditional rendering patterns into JSX. Keywords: widget converter, flutter to react native, jsx, typescript, functional component, container to view, row column flexbox, widget mapping, ui migration."
priority: HIGH
auto-trigger: true
---

# Widget to JSX Converter

> Trigger this skill **after** the Component Classifier skill has assigned widgets to the presentation layer. This skill converts widget tree nodes into React Native JSX — it must never classify, re-parse, or modify source Flutter code. All output must be functional TypeScript components; class components are strictly forbidden.

## SYSTEM RULE: NEVER SKIP UI DUE TO NAVIGATION

> **Every Flutter UI component MUST be converted to React Native, even if it contains navigation to features not yet implemented.** UI and navigation are separate concerns. If a navigation target is missing or not yet implemented, replace it with:
> - `onPress={() => console.log('Feature not implemented')}` OR
> - `Alert.alert('Feature not implemented')`
>
> **No UI component may be skipped, omitted, or deferred because of navigation dependencies, cross-feature references, or missing route targets.** Layout, styling, and position must remain intact. This rule is non-negotiable and overrides any other skip logic.

## Step 1 — Receive and Validate Input

Accept the `widgets` array from the Component Classifier's `presentation[]` output and verify it is ready for conversion:

- Confirm `widgets` is a non-empty array of `PresentationComponent` objects
- Confirm each entry contains a valid `WidgetNode` with a non-empty `name`
- Confirm no entry carries a `FATAL` violation from earlier skills

**Decision point:**
- If `widgets` is null, undefined, or empty → **FAIL**: `{ "violations": [{ "severity": "FATAL", "message": "Input 'widgets' is empty. Run the Flutter Parser and Component Classifier skills first." }] }`
- If any widget entry has `name: ""` or `name: null` → **FAIL**: `"FATAL: Widget with empty name cannot be converted. Parser output is malformed."`
- If a widget node has `type: "unknown"` → add a WARN and convert it as a generic `<View>` wrapper; do not skip it
- If `widgets` contains entries from layers other than `"presentation"` → **FAIL**: `"FATAL: Non-presentation components passed to the JSX converter. Run the Component Classifier skill and pass only presentation[] entries."`
- If a widget contains navigation calls to undefined or unimplemented routes → **DO NOT SKIP the widget**. Convert the full UI and replace the navigation call with: `onPress={() => console.log('Feature not implemented')}` or `Alert.alert('Feature not implemented')`. Add a WARN: `"Widget '{name}' contains navigation to unresolved route '{destination}'. Navigation stubbed with placeholder. UI preserved."`

**Rule:** This skill is a pure transformer. It never reads Dart source files, never re-invokes the parser, and never reclassifies components. It converts exactly what it receives.

**Rule:** No widget may be skipped due to navigation dependencies. Every widget in the input MUST appear in the output — either fully converted or as a View placeholder. Navigation to missing features is always stubbed, never used as a reason to omit UI.

---

## Step 2 — Load the Widget Mapping Table

Before converting any node, load the canonical Flutter-to-React Native widget map. All conversions must be driven by this table — ad-hoc string substitutions inside the traversal logic are forbidden.

```ts
// widget-to-jsx-converter/widgetMap.ts

export interface WidgetMapping {
  rnComponent: string;           // e.g. "View", "Text", "ScrollView"
  rnImport: string;              // e.g. "react-native"
  defaultProps?: Record<string, string>; // RN props applied unconditionally
  styleStrategy: "inline" | "stylesheet" | "none";
  childrenStrategy: "children" | "single-child" | "none";
  notes?: string;                // human-readable migration notes for the output
}

export const WIDGET_MAP: Record<string, WidgetMapping> = {
  // Layout
  Container:        { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children" },
  Row:              { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children", defaultProps: { "flexDirection": "'row'" } },
  Column:           { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children", defaultProps: { "flexDirection": "'column'" } },
  Stack:            { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children", defaultProps: { "position": "'relative'" } },
  Flex:             { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children" },
  Expanded:         { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children", defaultProps: { "flex": "1" } },
  Flexible:         { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children" },
  SizedBox:         { rnComponent: "View",        rnImport: "react-native", styleStrategy: "inline",     childrenStrategy: "none",         notes: "Use width/height props from SizedBox" },
  Padding:          { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "single-child", notes: "Map EdgeInsets to paddingTop/Right/Bottom/Left" },
  Center:           { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "single-child", defaultProps: { "alignItems": "'center'", "justifyContent": "'center'" } },
  Align:            { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "single-child" },
  Wrap:             { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children",     defaultProps: { "flexWrap": "'wrap'" } },

  // Text
  Text:             { rnComponent: "Text",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "none" },
  RichText:         { rnComponent: "Text",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children",     notes: "Flatten TextSpan children into nested <Text> elements" },
  SelectableText:   { rnComponent: "Text",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "none",         defaultProps: { "selectable": "{true}" } },

  // Scrolling
  SingleChildScrollView: { rnComponent: "ScrollView",  rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "single-child" },
  ListView:              { rnComponent: "FlatList",     rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "none",         notes: "Map itemBuilder to renderItem prop" },
  GridView:              { rnComponent: "FlatList",     rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "none",         defaultProps: { "numColumns": "2" }, notes: "Map gridDelegate crossAxisCount to numColumns" },

  // Input
  TextField:        { rnComponent: "TextInput",   rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "none" },
  TextFormField:    { rnComponent: "TextInput",   rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "none" },

  // Interaction
  GestureDetector:  { rnComponent: "TouchableOpacity", rnImport: "react-native", styleStrategy: "none", childrenStrategy: "single-child", notes: "Map onTap to onPress" },
  InkWell:          { rnComponent: "TouchableOpacity", rnImport: "react-native", styleStrategy: "none", childrenStrategy: "single-child", notes: "Map onTap to onPress" },
  ElevatedButton:   { rnComponent: "TouchableOpacity", rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children" },
  TextButton:       { rnComponent: "TouchableOpacity", rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children" },
  IconButton:       { rnComponent: "TouchableOpacity", rnImport: "react-native", styleStrategy: "none", childrenStrategy: "children" },

  // Media
  Image:            { rnComponent: "Image",       rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "none" },
  Icon:             { rnComponent: "Image",       rnImport: "react-native", styleStrategy: "inline",     childrenStrategy: "none",         notes: "Replace with an icon library component (e.g. @expo/vector-icons)" },

  // Scaffold / Structure
  Scaffold:         { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children",     notes: "AppBar → header component; bottomNavigationBar → tab navigator" },
  AppBar:           { rnComponent: "View",        rnImport: "react-native", styleStrategy: "stylesheet", childrenStrategy: "children",     notes: "Convert to a custom header component" },
  SafeArea:         { rnComponent: "SafeAreaView", rnImport: "react-native", styleStrategy: "none",      childrenStrategy: "single-child" },

  // In-screen tabs (NOT bottom navigation — these are body tabs inside a Scaffold)
  TabBar:               { rnComponent: "View",              rnImport: "react-native",                     styleStrategy: "stylesheet", childrenStrategy: "children",     notes: "In-screen top tab bar. Render as a custom tab header row with selectedIndex state — do NOT use createBottomTabNavigator for this pattern." },
  TabBarView:           { rnComponent: "View",              rnImport: "react-native",                     styleStrategy: "stylesheet", childrenStrategy: "children",     notes: "Tab content area. Each child is a tab body keyed by selectedIndex. Parent must have a bounded height." },
  DefaultTabController: { rnComponent: "View",              rnImport: "react-native",                     styleStrategy: "none",       childrenStrategy: "single-child", notes: "Replace with useState(selectedIndex) passed down to TabBar and TabBarView." },

  // Draggable bottom sheet / mini overlay
  DraggableScrollableSheet: { rnComponent: "BottomSheet",   rnImport: "@gorhom/bottom-sheet",             styleStrategy: "stylesheet", childrenStrategy: "single-child", notes: "Map initialChildSize→initialSnapPoint, minChildSize→minSnapPoint, maxChildSize→maxSnapPoint as percentage strings e.g. '50%'. Control via bottomSheetRef.current?.expand() / .close()." },

  // WebView / Chart rendering
  WebView:              { rnComponent: "WebView",            rnImport: "react-native-webview",             styleStrategy: "stylesheet", childrenStrategy: "none",         notes: "Map source.uri for URL responses, source.html for HTML responses. Add onLoadStart/onLoadEnd for loading state." },
  InAppWebView:         { rnComponent: "WebView",            rnImport: "react-native-webview",             styleStrategy: "stylesheet", childrenStrategy: "none",         notes: "Map initialUrlRequest.url to source={{ uri }}." },
  WebViewWidget:        { rnComponent: "WebView",            rnImport: "react-native-webview",             styleStrategy: "stylesheet", childrenStrategy: "none",         notes: "flutter_inappwebview WebViewWidget maps directly to react-native-webview <WebView>." },

  // Loading skeleton animations
  Shimmer:              { rnComponent: "ShimmerPlaceholder", rnImport: "react-native-shimmer-placeholder", styleStrategy: "stylesheet", childrenStrategy: "single-child", notes: "Wrap skeleton content as children. Add LinearGradient peer dependency." },

  // Fallback for unmapped widgets
  _unknown:         { rnComponent: "View",        rnImport: "react-native", styleStrategy: "none",       childrenStrategy: "children",     notes: "Unmapped widget — wrapped in View as placeholder" },
};
```

**Quality check:** Any Flutter widget not present in `WIDGET_MAP` must fall back to `_unknown` and produce a WARN: `"Widget '{name}' has no mapping. Converted to <View> placeholder. Review manually."`

---

## Step 2b — Check Component Reuse Map Before Converting

Before traversing any widget node, check the `componentReuseMap` from the Component Classifier output. If an existing RN component already matches the current widget, **emit an import statement and skip code generation entirely for that widget**. Never generate a new component when a reusable one already exists in the target project.

```ts
// widget-to-jsx-converter/reuseMapResolver.ts

import type { ExistingComponent } from '../component-classifier/types';

export interface ReuseResolution {
  reuse: true;
  existingComponent: ExistingComponent;
  importStatement: string;   // e.g. `import { PrimaryButton } from '../../../shared/components/PrimaryButton';`
  jsxUsage: string;          // e.g. `<PrimaryButton onPress={onPress} />`
}

export interface NoReuseResolution {
  reuse: false;
}

export type ReuseCheckResult = ReuseResolution | NoReuseResolution;

/**
 * Check whether an existing component in the catalog can satisfy this widget.
 * Checks by exact name match first, then by widget type category.
 */
export function checkReuseMap(
  widget: WidgetNode,
  componentReuseMap: Map<string, ExistingComponent>
): ReuseCheckResult {
  // 1. Exact name match (widget.name → catalogEntry.name)
  if (componentReuseMap.has(widget.name)) {
    const existing = componentReuseMap.get(widget.name)!;
    return buildReuseResolution(existing, widget);
  }

  // 2. Type-category match (e.g. ElevatedButton → any button in catalog)
  const category = inferWidgetCategory(widget.name);
  if (category) {
    for (const [, entry] of componentReuseMap) {
      if (entry.componentType === category) {
        return buildReuseResolution(entry, widget);
      }
    }
  }

  return { reuse: false };
}

function inferWidgetCategory(widgetName: string): ExistingComponent['componentType'] | null {
  const lower = widgetName.toLowerCase();
  if (lower.includes('button') || lower.includes('elevatedbutton') || lower.includes('textbutton')) return 'button';
  if (lower.includes('textfield') || lower.includes('textformfield') || lower.includes('input')) return 'input';
  if (lower.includes('checkbox') || lower.includes('switch') || lower.includes('radio')) return 'checkbox';
  if (lower.includes('modal') || lower.includes('dialog') || lower.includes('bottomsheet')) return 'modal';
  if (lower.includes('card') || lower.includes('tile')) return 'card';
  if (lower.includes('listitem') || lower.includes('listtile')) return 'list-item';
  if (lower.includes('appbar') || lower.includes('header') || lower.includes('navbar')) return 'header';
  if (lower.includes('badge') || lower.includes('chip') || lower.includes('tag')) return 'badge';
  return null;
}

function buildReuseResolution(
  existing: ExistingComponent,
  widget: WidgetNode
): ReuseResolution {
  // Derive a relative import path — callers must adjust the depth prefix to match the feature folder depth.
  const importStatement = `import { ${existing.name} } from '${existing.importPath}';
// REUSE: existing component used instead of generating new one — verify props are compatible`;

  // Emit the JSX usage with a TODO for the caller to wire up props.
  const jsxUsage = `<${existing.name}
  {/* TODO: map props from '${widget.name}' to '${existing.name}' prop interface */}
/>`;

  return { reuse: true, existingComponent: existing, importStatement, jsxUsage };
}
```

**Integration with the traversal loop (Step 3):**

In `convertNode`, call `checkReuseMap(widget, componentReuseMap)` as the **first action** before any mapping or prop conversion:

```ts
export function convertNode(
  widget: WidgetNode,
  depth: number,
  keyPrefix: string,
  componentReuseMap: Map<string, ExistingComponent>  // ← threaded through from the orchestrator
): ConvertedNode {
  // --- REUSE CHECK: must come before widget map lookup ---
  const reuseResult = checkReuseMap(widget, componentReuseMap);
  if (reuseResult.reuse) {
    return {
      jsx: reuseResult.jsxUsage,
      imports: new Set([]),        // import is handled via importStatement, not the RN imports set
      additionalImports: [reuseResult.importStatement],
      styleEntries: [],
      violations: [{
        severity: 'INFO',
        message: `Widget '${widget.name}' resolved to existing component '${reuseResult.existingComponent.name}'. No new component generated.`,
      }],
    };
  }

  // --- NORMAL CONVERSION: proceed only if no reuse match found ---
  const mapping = WIDGET_MAP[widget.name] ?? WIDGET_MAP['_unknown'];
  // ... rest of existing convertNode logic
}
```

**Rules:**
- `componentReuseMap` is threaded through from the orchestrator input (`classifiedComponents.componentReuseMap`). If it is `undefined` or empty, the reuse check is skipped silently — this is not an error.
- When a reuse match is found, the node's children are **not traversed** — the existing component is assumed to handle its own children and internal structure.
- The `importStatement` is collected into a separate `additionalImports[]` array (not the `Set<string> imports` for RN components) so the assembler can emit it as a top-level import rather than as part of the `react-native` import destructure.
- Reuse resolutions are always surfaced as `INFO` violations so the final output clearly shows which widgets were satisfied by existing components vs. newly generated.
- A type-category match (fuzzy) produces an `INFO` with an additional `"Confirm props compatibility"` note; an exact name match produces a plain `INFO`.

---

## Step 3 — Traverse the Widget Tree and Convert Nodes

Walk the widget tree depth-first. Convert each node using the mapping table before recursing into children.

```ts
// widget-to-jsx-converter/convertNode.ts

export interface ConvertedNode {
  jsx: string;               // the rendered JSX string for this node and its subtree
  imports: Set<string>;      // RN component names needed (collected bottom-up)
  styleEntries: StyleEntry[]; // StyleSheet.create entries emitted for this node
  violations: Violation[];
}

export interface StyleEntry {
  key: string;   // e.g. "container", "row_1", "text_title"
  styles: Record<string, string>; // CSS-in-JS style map
}

export function convertNode(
  widget: WidgetNode,
  depth: number,
  keyPrefix: string
): ConvertedNode {
  const mapping = WIDGET_MAP[widget.name] ?? WIDGET_MAP["_unknown"];
  const violations: Violation[] = [];

  if (!WIDGET_MAP[widget.name]) {
    violations.push({
      severity: "WARN",
      message: `Widget '${widget.name}' has no mapping. Converted to <View> placeholder. Review manually.`,
    });
  }

  const props = convertProps(widget.props, mapping, widget.name, violations);
  const styleKey = mapping.styleStrategy !== "none"
    ? `${keyPrefix}_${widget.name.toLowerCase()}_${depth}`
    : null;

  const convertedChildren = widget.children.map((child, i) =>
    convertNode(child, depth + 1, `${keyPrefix}_${i}`)
  );

  const childJsx = buildChildJsx(convertedChildren, mapping.childrenStrategy);
  const jsx = renderJsxElement(mapping.rnComponent, props, styleKey, childJsx, depth);

  const imports = new Set<string>([mapping.rnComponent]);
  for (const child of convertedChildren) child.imports.forEach((imp) => imports.add(imp));

  const styleEntries = styleKey
    ? [mapFlutterPropsToStyles(styleKey, widget.props, mapping.defaultProps), ...convertedChildren.flatMap((c) => c.styleEntries)]
    : convertedChildren.flatMap((c) => c.styleEntries);

  return { jsx, imports, styleEntries, violations: [...violations, ...convertedChildren.flatMap((c) => c.violations)] };
}
```

**Quality checks:**
- Depth-first traversal must handle unlimited nesting; no recursion depth cap may be applied silently
- A node's `key` prop is always generated as `key="{keyPrefix}"` when the node appears inside a list context (`FlatList` parent)
- `childrenStrategy: "single-child"` nodes with more than one child produce a WARN and wrap extras in a `<View>`

---

## Step 4 — Map Flutter Props to React Native Props

Convert Flutter widget props to their RN equivalents. Prop mapping must be explicit and table-driven — no dynamic string manipulation of prop names.

```ts
// widget-to-jsx-converter/propMapper.ts

// Flutter prop → RN prop + value transformer
export const PROP_MAP: Record<string, (value: string) => string | null> = {
  // Text
  "style.fontSize":        (v) => `fontSize={${v}}`,
  "style.fontWeight":      (v) => `fontWeight={${mapFontWeight(v)}}`,
  "style.color":           (v) => `color={${mapColor(v)}}`,
  "textAlign":             (v) => `textAlign="${mapTextAlign(v)}"`,

  // Layout
  "width":                 (v) => `width={${v}}`,
  "height":                (v) => `height={${v}}`,
  "padding":               (v) => null,  // handled by styleMapper — not a direct RN prop
  "margin":                (v) => null,  // handled by styleMapper

  // Interaction
  "onTap":                 (v) => `onPress={${v}}`,
  "onPressed":             (v) => `onPress={${v}}`,
  "onChanged":             (v) => `onChangeText={${v}}`,

  // Image
  "image":                 (v) => `source={${mapImageSource(v)}}`,
  "fit":                   (v) => `resizeMode="${mapBoxFit(v)}"`,

  // Text input
  "controller":            (_) => null,  // RN uses controlled value/onChangeText — emit WARN
  "obscureText":           (v) => `secureTextEntry={${v}}`,
  "keyboardType":          (v) => `keyboardType="${mapKeyboardType(v)}"`,
  "maxLines":              (v) => v === "1" ? `multiline={false}` : `multiline={true} numberOfLines={${v}}`,
};
```

**Decision point:**
- Props with no entry in `PROP_MAP` are dropped and produce a WARN: `"Prop '{propName}' on '{widgetName}' has no React Native equivalent. Dropped from output."`
- Props whose value is a Dart variable reference (e.g. `widget.title`, `_controller`) are emitted as `{propValue}` JSX expressions unchanged; they are never resolved
- `controller` props (Flutter `TextEditingController`) produce a WARN: `"Flutter TextEditingController detected on '{widgetName}'. Replace with React Native controlled input pattern (value + onChangeText)."`

---

### Step 4b — Detect and Handle Session-Bound Prop Values

Session-bound props are props whose names match known identity or session patterns AND whose resolved value is an empty string (`''`) or a zero-equivalent (`0`, `'0'`). These indicate that the converter could not resolve a runtime session value from the Dart source. **Emitting an empty default silently is a RUNTIME BLOCKER** — the consuming use case or API guard will reject the call immediately.

```ts
// widget-to-jsx-converter/sessionBoundDetector.ts

// Prop names that are expected to carry live session/identity values at runtime.
// When these are emitted as empty string or zero, downstream API guards will reject them.
export const SESSION_BOUND_PROP_NAMES = new Set([
  'entityId', 'tradingAccountNo', 'clientCode', 'userId', 'sessionId',
  'accountId', 'accountNo', 'portfolioId', 'customerId', 'clientId',
  'userCode', 'profileId', 'principalId', 'subjectId',
]);

export type SessionBoundResolution = 'useAuth' | 'ts-expect-error';

export function detectSessionBoundProp(
  propName: string,
  resolvedValue: string
): boolean {
  const isSessionName = SESSION_BOUND_PROP_NAMES.has(propName);
  const isEmptyDefault = resolvedValue === "''" || resolvedValue === '""'
    || resolvedValue === "'0'" || resolvedValue === '0'
    || resolvedValue === '' ;
  return isSessionName && isEmptyDefault;
}

export function emitSessionBoundProp(
  propName: string,
  componentName: string,
  resolution: SessionBoundResolution,
  violations: Violation[]
): string {
  violations.push({
    severity: "FATAL",
    message: `Prop '${propName}' on '${componentName}' resolved to an empty default. ` +
      `This is a session-bound value that must come from a live auth/session context. ` +
      `Automatic resolution attempted (${resolution}). Review before running the app.`,
  });

  if (resolution === 'useAuth') {
    // Wire from the project's auth hook. The component will need 'useAuth' added to its imports.
    return `${propName}={auth.${propName}}`;
  }

  // Fallback: emit a TypeScript compile error so the developer cannot ship without resolving it.
  return `{/* @ts-expect-error TODO: '${propName}' must be wired from session/auth context — do not default to empty */}
        ${propName}={"" /* FIXME */}`;
}
```

**Rules:**
- When a session-bound prop is detected, attempt `'useAuth'` resolution first: add `const auth = useAuth();` to the component body and wire `propName={auth.propName}`. This requires `useAuth` to be importable from the project's auth module — emit the import as `import { useAuth } from '../../../shared/hooks/useAuth';` and add a WARN if the path is uncertain.
- If the project has no detectable `useAuth` equivalent (no auth hook found in `constitutionConfig`), fall back to `'ts-expect-error'` resolution to force a compile error.
- **Never emit `propName=''` or `propName={0}` for a session-bound prop without a FATAL violation.** A silent empty default is guaranteed to fail at runtime against any API guard that checks `if (!entityId)` or `if (clientCode <= 0)`.
- The presence of any session-bound FATAL in the violations array must be surfaced prominently in the Step 9 output summary.

---

## Step 5 — Map Flutter Styles to StyleSheet

Collect all style-related props and emit a `StyleSheet.create` block. All visual values must use design-system tokens if `constitutionConfig.techStack.designSystem.tokensOnly` is `true`.

```ts
// widget-to-jsx-converter/styleMapper.ts

export function mapStyleEntry(
  key: string,
  flutterProps: Record<string, string>,
  defaultProps: Record<string, string> | undefined,
  tokensOnly: boolean
): StyleEntry {
  const styles: Record<string, string> = { ...(defaultProps ?? {}) };

  // EdgeInsets → padding breakdown
  if (flutterProps["padding"]) {
    Object.assign(styles, parseEdgeInsets(flutterProps["padding"]));
  }
  if (flutterProps["margin"]) {
    Object.assign(styles, parseEdgeInsetsAsMargin(flutterProps["margin"]));
  }

  // Decoration → borderRadius, backgroundColor, border
  if (flutterProps["decoration"]) {
    Object.assign(styles, parseBoxDecoration(flutterProps["decoration"]));
  }

  if (tokensOnly) {
    validateTokenUsage(styles); // emits WARN for any raw hex/number values
  }

  return { key, styles };
}
```

**Rule:** Raw hex color values (e.g. `#FF0000`, `Color(0xFFFF0000)`) are emitted as-is when `tokensOnly` is `false`. When `tokensOnly` is `true`, they produce a WARN: `"Raw color value '{value}' used in '{key}'. Replace with a design token."`

---

## Step 6 — Handle Conditional Rendering

Detect Flutter conditional patterns (ternary operators in widget props, `if` inside widget lists) and translate them to JSX conditional expressions.

```ts
// widget-to-jsx-converter/conditionalMapper.ts

// Flutter pattern                     → JSX output
// condition ? WidgetA() : WidgetB()  → {condition ? <WidgetA /> : <WidgetB />}
// if (condition) WidgetA()           → {condition && <WidgetA />}
// condition == null ? ... : ...      → {condition == null ? ... : ...}   (preserve null check)

export function mapConditionalExpression(
  dartExpression: string,
  convertedTrueBranch: string,
  convertedFalseBranch: string | null
): string {
  if (convertedFalseBranch) {
    return `{${dartExpression} ? ${convertedTrueBranch} : ${convertedFalseBranch}}`;
  }
  return `{${dartExpression} && ${convertedTrueBranch}}`;
}
```

**Quality check:** Conditions are emitted verbatim from the Dart expression — they are never evaluated or simplified. Complex Dart expressions that cannot be syntactically mapped to a JSX expression produce a WARN: `"Conditional expression in '{widgetName}' could not be mapped to JSX. Emitted as a TODO comment."` — followed by `{/* TODO: convert condition: {rawExpression} */}`.

---

## Step 7 — Assemble the Final Component File

Combine the converted JSX tree, collected imports, and `StyleSheet.create` block into a complete, valid TypeScript functional component file.

```ts
// widget-to-jsx-converter/assembleComponent.ts

export function assembleComponent(
  componentName: string,       // PascalCase, derived from widget name
  propsInterface: string,      // TypeScript interface for props, empty string if none
  jsxBody: string,
  imports: Set<string>,
  styleEntries: StyleEntry[]
): string {
  const rnImports = [...imports].sort().join(", ");
  const hasStyles = styleEntries.length > 0;

  return `
import React from 'react';
import { ${rnImports}${hasStyles ? ", StyleSheet" : ""} } from 'react-native';
${propsInterface ? `\n${propsInterface}\n` : ""}
const ${componentName} = (${propsInterface ? `props: ${componentName}Props` : ""}) => {
  return (
${indent(jsxBody, 4)}
  );
};
${hasStyles ? `\nconst styles = StyleSheet.create({\n${renderStyleEntries(styleEntries)}\n});\n` : ""}
export default ${componentName};
`.trimStart();
}
```

**Quality checks:**
- `componentName` must be PascalCase; if the source widget name is not PascalCase, apply `toPascalCase()` and add a WARN noting the rename
- The file must never contain `class` components, `Component` imports, or `extends React.Component`
- `StyleSheet.create` is only emitted when `styleEntries` is non-empty
- The output must be a complete file — no orphaned JSX fragments, no missing closing tags

---

## Step 8 — Validate the JSX Output

Run syntax and structural validations on the assembled component string before returning.

```ts
// widget-to-jsx-converter/validateJsx.ts

export function validateJsx(jsx: string, componentName: string): Violation[] {
  const violations: Violation[] = [];

  // 1. Every opening tag must have a matching closing tag or be self-closing
  if (!isBalanced(jsx)) {
    violations.push({ severity: "FATAL", message: `JSX output for '${componentName}' has unbalanced tags.` });
  }

  // 2. Must export a default functional component
  if (!jsx.includes(`export default ${componentName}`)) {
    violations.push({ severity: "FATAL", message: `Component '${componentName}' is missing its default export.` });
  }

  // 3. Must not contain class component patterns
  if (/extends\s+(React\.Component|Component|PureComponent)/.test(jsx)) {
    violations.push({ severity: "FATAL", message: `Output for '${componentName}' contains a class component. Only functional components are permitted.` });
  }

  // 4. Must not contain raw Dart syntax remnants
  const dartRemnants = ["Widget ", "BuildContext", "final ", " => {", "@override"];
  for (const remnant of dartRemnants) {
    if (jsx.includes(remnant)) {
      violations.push({ severity: "WARN", message: `Possible Dart syntax remnant '${remnant}' found in '${componentName}'. Review the output.` });
    }
  }

  return violations;
}
```

**Rule:** Any `FATAL` validation violation must prevent the component from being returned. The caller receives the violations array and must not proceed with an invalid JSX output.

---

## Step 9 — Return the Conversion Result

Assemble all per-component results into the final output shape and run the completeness checklist.

```ts
// Output shape
{
  "jsx": string,          // full file content of the converted component
  "violations": Violation[]
}
```

Run this checklist before returning:

- [ ] `jsx` is a non-empty string
- [ ] JSX has balanced tags (validated in Step 8)
- [ ] Component is a functional component — no `class`, no `extends Component`
- [ ] All imports are from `react-native` or other declared dependencies — no Dart/Flutter imports
- [ ] `StyleSheet.create` block is present if any widget had style props
- [ ] No raw Dart keywords remain in the output (`Widget`, `BuildContext`, `StatefulWidget`, `setState`)
- [ ] Every unmapped widget has a corresponding WARN in `violations[]`
- [ ] Every dropped prop has a corresponding WARN in `violations[]`
- [ ] `violations[]` contains no `FATAL` entries before returning
- [ ] Component name is PascalCase and matches the `export default` statement

---

## File Layout Reference

```
widget-to-jsx-converter/
├── index.ts                    ← Orchestrator: runs steps 1–9 in order
├── widgetMap.ts                ← Step 2: Flutter widget → RN component mapping table
├── reuseMapResolver.ts         ← Step 2b: existing component catalog lookup before code generation
├── convertNode.ts              ← Step 3: recursive widget tree traversal (calls reuseMapResolver first)
├── propMapper.ts               ← Step 4: Flutter props → RN props
├── sessionBoundDetector.ts     ← Step 4b: session-bound prop detection + safe emission
├── styleMapper.ts              ← Step 5: Flutter style props → StyleSheet entries
├── conditionalMapper.ts        ← Step 6: Dart conditionals → JSX expressions
├── assembleComponent.ts        ← Step 7: imports + JSX + styles → full .tsx file
├── validateJsx.ts              ← Step 8: structural + syntax validation
├── assembleResult.ts           ← Step 9: final output shape + fatal gate
├── errors.ts                   ← ConversionFatalError, Violation types
└── __tests__/
    ├── widgetMap.test.ts
    ├── reuseMapResolver.test.ts
    ├── convertNode.test.ts
    ├── propMapper.test.ts
    ├── sessionBoundDetector.test.ts
    ├── validateJsx.test.ts
    └── assembleComponent.test.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Reuse before generation | The reuse map check (Step 2b) runs before any widget-map lookup — if an existing RN component satisfies the widget, no new component code is generated |
| Functional components only | Every output component uses arrow-function syntax; class components are a FATAL violation |
| TypeScript always | All output files are `.tsx`; `any` types are only emitted for unresolvable Dart expressions and always paired with a WARN |
| Table-driven conversion | Widget and prop mappings live in explicit tables; ad-hoc string substitution inside traversal logic is forbidden |
| Verbatim expressions | Dart variable references and conditional expressions are emitted unchanged — never evaluated or resolved |
| Unmapped → placeholder + WARN | Unknown widgets become `<View>` placeholders; unknown props are dropped; both always produce WARN violations |
| No silent drops | Every piece of Flutter code that cannot be converted must be accounted for in `violations[]` or as a `{/* TODO */}` comment |
| **UI is mandatory, navigation can be stubbed** | **No UI component is ever skipped because of navigation dependencies.** If a widget's `onTap`/`onPressed` targets a missing route, the UI is fully converted and the navigation call is replaced with `onPress={() => console.log('Feature not implemented')}` or `Alert.alert('Feature not implemented')`. Layout, styling, and position remain intact. |
| Session-bound props are FATALs | Props that carry identity/session values and resolve to an empty default must produce a FATAL and be wired to `useAuth` or a `@ts-expect-error` — never silently emitted as empty |
| Token enforcement | Raw style values produce WARN violations when the constitution mandates design-system tokens |
