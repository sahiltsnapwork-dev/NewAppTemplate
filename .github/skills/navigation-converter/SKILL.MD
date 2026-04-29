---
name: navigation-converter
description: "MUST be used whenever Flutter navigation patterns need to be converted into React Navigation equivalents. Use when: converting Navigator.push/pop/pushNamed calls to React Navigation actions; mapping Flutter named routes to React Navigation stack screens; converting Flutter BottomNavigationBar or TabBar to React Navigation tab navigators; translating route arguments and params; handling nested navigators (stack inside tab, tab inside stack); generating typed route parameter interfaces. Keywords: navigation converter, react navigation, flutter navigation, stack navigator, tab navigator, named routes, navigator push pop, route params, nested navigation, navigator mapping."
priority: HIGH
auto-trigger: true
---

# Navigation Converter

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

> Trigger this skill **after** the Component Classifier has identified navigation calls and **before** any screen component files are written. The navigator structure this skill produces defines the route names, param types, and navigator hierarchy that all screen components and the Widget to JSX Converter depend on. React Navigation must be the only navigation library used — any other navigation library is a FATAL.

## SYSTEM RULE: NEVER SKIP UI DUE TO NAVIGATION

> **Navigation is always secondary to UI.** If a navigation target does not exist or is not yet implemented, the UI component that triggers the navigation MUST still be fully converted. The navigation call itself is stubbed with:
> - `onPress={() => console.log('Feature not implemented')}` OR
> - `Alert.alert('Feature not implemented')`
>
> **No screen or component may be excluded from the navigator structure because its destination screen is missing.** Missing destinations are declared in `RootStackParamList` with `undefined` params and a placeholder screen, or the navigation call is stubbed at the call site. UI is mandatory; navigation can be stubbed.

## Flutter Navigation vs. React Navigation

Flutter and React Navigation share conceptual similarities but differ in how navigation state is structured and accessed:

| Concern | Flutter | React Navigation |
|---------|---------|-----------------|
| Push a screen | `Navigator.push(context, MaterialPageRoute(...))` | `navigation.navigate('ScreenName')` |
| Push named route | `Navigator.pushNamed(context, '/route', arguments: {...})` | `navigation.navigate('RouteName', params)` |
| Pop | `Navigator.pop(context)` | `navigation.goBack()` |
| Replace | `Navigator.pushReplacement(...)` | `navigation.replace('ScreenName')` |
| Pop to root | `Navigator.popUntil(context, ModalRoute.isFirst)` | `navigation.popToTop()` |
| Pass params | `arguments: { id: 1 }` | `params: { id: 1 }` — typed via `RootStackParamList` |
| Read params | `ModalRoute.of(context)?.settings.arguments` | `route.params.id` |
| Tab navigation | `BottomNavigationBar` / `TabBar` | `createBottomTabNavigator()` |
| Stack in tab | `Navigator` inside a tab body | `createNativeStackNavigator()` nested inside a tab |

**Why incorrect mapping breaks navigation:** A `pushNamed` with untyped arguments silently passes `undefined` params in React Navigation, causing runtime crashes deep in the screen rather than at the call site. This skill generates a typed `RootStackParamList` to prevent exactly that.

---

## Step 1 — Receive and Validate Input

Accept classified navigation nodes from the Component Classifier and the list of classified screens from the presentation layer.

**Input schema:**

```json
{
  "navigationCalls": [
    {
      "type": "push | pop | replace | pushNamed | go | unknown",
      "destination": "string | null",
      "passesArguments": true,
      "containingMethod": "string",
      "callLine": 0
    }
  ],
  "screens": [
    {
      "name": "string",
      "type": "screen | component | layout | unknown",
      "widgetNode": {}
    }
  ],
  "existingRoutes": ["string"],
  "featureName": "string | null",
  "basePath": "string | null"
}
```

**Decision point:**
- If `navigationCalls` and `screens` are both empty → **FAIL**: `"FATAL: No navigation calls or screens provided. Nothing to convert."`
- If `screens` is empty but `navigationCalls` is non-empty → **FAIL**: `"FATAL: Navigation calls found but no screens defined. Cannot build a navigator without screen components."`
- If any `navigationCalls` entry has `type: "unknown"` → add a WARN per entry: `"Navigation call in '{containingMethod}' at line {callLine} has unknown type. It will be emitted as a TODO comment. Identify the call type manually."` and continue
- If any `navigationCalls` entry has `destination: null` and `passesArguments: true` → add a WARN: `"Navigation call in '{containingMethod}' passes arguments to an unknown destination. Param type cannot be inferred."`

**Rule:** This skill generates navigator configuration and typed parameter interfaces only. It never generates screen component bodies — those are the responsibility of the Widget to JSX Converter.

---

## Step 2 — Load the Navigation Mapping Table

All Flutter navigation construct conversions must be driven by this table.

```ts
// navigation-converter/navigationMap.ts

export interface NavigationMapping {
  rnNavigatorType: "stack" | "tab" | "drawer" | "material-top-tab";
  rnPackage: string;
  createFn: string;
  notes?: string;
}

// Flutter widget/pattern → React Navigation navigator type
export const NAVIGATOR_MAP: Record<string, NavigationMapping> = {
  // Stack navigators
  Navigator:                  { rnNavigatorType: "stack", rnPackage: "@react-navigation/native-stack", createFn: "createNativeStackNavigator",    notes: "Default Flutter Navigator maps to native stack." },
  MaterialApp:                { rnNavigatorType: "stack", rnPackage: "@react-navigation/native-stack", createFn: "createNativeStackNavigator",    notes: "MaterialApp routes map to a root stack navigator." },
  CupertinoPageRoute:         { rnNavigatorType: "stack", rnPackage: "@react-navigation/native-stack", createFn: "createNativeStackNavigator",    notes: "CupertinoPageRoute uses the native iOS transition by default." },
  MaterialPageRoute:          { rnNavigatorType: "stack", rnPackage: "@react-navigation/native-stack", createFn: "createNativeStackNavigator" },

  // Tab navigators
  BottomNavigationBar:        { rnNavigatorType: "tab",              rnPackage: "@react-navigation/bottom-tabs",        createFn: "createBottomTabNavigator" },
  TabBar:                     { rnNavigatorType: "material-top-tab", rnPackage: "@react-navigation/material-top-tabs",  createFn: "createMaterialTopTabNavigator", notes: "TabBar inside Scaffold.body = in-screen top tabs. Only use createBottomTabNavigator when TabBar is the direct child of Scaffold.bottomNavigationBar." },
  TabBarView:                 { rnNavigatorType: "material-top-tab", rnPackage: "@react-navigation/material-top-tabs",  createFn: "createMaterialTopTabNavigator", notes: "Tab content area for in-screen top tabs. Each child is a tab screen body." },
  CupertinoTabScaffold:       { rnNavigatorType: "tab",              rnPackage: "@react-navigation/bottom-tabs",        createFn: "createBottomTabNavigator" },
  DefaultTabController:       { rnNavigatorType: "material-top-tab", rnPackage: "@react-navigation/material-top-tabs",  createFn: "createMaterialTopTabNavigator", notes: "Top tab controller maps to material top tabs." },

  // Drawer
  Drawer:                     { rnNavigatorType: "drawer", rnPackage: "@react-navigation/drawer",     createFn: "createDrawerNavigator" },
  DrawerHeader:               { rnNavigatorType: "drawer", rnPackage: "@react-navigation/drawer",     createFn: "createDrawerNavigator" },
};

// Flutter navigation action → React Navigation action
export const ACTION_MAP: Record<string, string> = {
  "Navigator.push":               "navigation.navigate",
  "Navigator.pushNamed":          "navigation.navigate",
  "Navigator.pop":                "navigation.goBack",
  "Navigator.pushReplacement":    "navigation.replace",
  "Navigator.pushAndRemoveUntil": "navigation.reset",
  "Navigator.popUntil":           "navigation.popToTop",          // approximation — see WARN
  "Navigator.popAndPushNamed":    "navigation.replace",
  "Navigator.pushNamedAndRemoveUntil": "navigation.reset",
  "context.go":                   "navigation.navigate",          // GoRouter
  "context.push":                 "navigation.navigate",          // GoRouter
  "context.replace":              "navigation.replace",           // GoRouter
  "context.pop":                  "navigation.goBack",            // GoRouter
};
```

**Quality check:** Any Flutter navigation construct not in `NAVIGATOR_MAP` falls back to a `createNativeStackNavigator` and produces a WARN: `"Flutter navigator '{name}' has no mapping. Defaulted to native stack navigator. Review manually."`

---

## Step 3 — Infer Navigator Structure

Analyse the screens and navigation calls to determine whether the feature needs a stack navigator, a tab navigator, or a nested combination.

```ts
// navigation-converter/inferNavigatorStructure.ts

export type NavigatorKind = "stack" | "tab" | "drawer" | "nested-stack-in-tab" | "nested-tab-in-stack";

export interface NavigatorNode {
  kind: NavigatorKind;
  name: string;               // e.g. "ProductStackNavigator", "MainTabNavigator"
  screens: ScreenNode[];
  children: NavigatorNode[];  // nested navigators
  parentNavigator: string | null;
}

export interface ScreenNode {
  routeName: string;          // e.g. "ProductDetail", "Cart"
  componentName: string;      // PascalCase component name
  hasParams: boolean;
  paramShape: Record<string, string> | null; // inferred param type map
}

export function inferNavigatorStructure(
  screens: PresentationComponent[],
  navigationCalls: NavigationNode[],
  existingRoutes: string[]
): NavigatorNode {
  const tabScreens = screens.filter((s) => isTabRootScreen(s, navigationCalls));
  const hasTabNav  = tabScreens.length >= 2;

  if (hasTabNav) {
    // Each tab may contain its own stack
    const tabChildren = tabScreens.map((tab) => ({
      kind: "stack" as NavigatorKind,
      name: `${tab.name}Stack`,
      screens: buildStackScreens(tab, screens, navigationCalls),
      children: [],
      parentNavigator: "MainTabNavigator",
    }));

    return {
      kind: "nested-stack-in-tab",
      name: "MainTabNavigator",
      screens: tabScreens.map((s) => ({ routeName: s.name, componentName: s.name, hasParams: false, paramShape: null })),
      children: tabChildren,
      parentNavigator: null,
    };
  }

  return {
    kind: "stack",
    name: `${screens[0]?.name ?? "Root"}StackNavigator`,
    screens: screens.map((s) => buildScreenNode(s, navigationCalls)),
    children: [],
    parentNavigator: null,
  };
}
```

**Decision point:**
- If two or more screens appear as tab items (inferred from `BottomNavigationBar` children or tab-switching navigation calls) → generate a `createBottomTabNavigator` wrapping per-tab stack navigators
- If `TabBar` appears as a direct child of `Scaffold.bottomNavigationBar` → map to `createBottomTabNavigator` (bottom navigation). If `TabBar` appears inside `Scaffold.body` or any non-`bottomNavigationBar` slot → map to `createMaterialTopTabNavigator` (in-screen top tabs). Generate a single screen component that renders the tab header and content inline — do NOT create separate navigator screens for each tab. If placement cannot be determined → default to `createMaterialTopTabNavigator` and emit a WARN: `"TabBar placement ambiguous. Defaulted to in-screen top tabs (createMaterialTopTabNavigator). If this is a bottom navigator, update the NAVIGATOR_MAP entry manually."`
- If a `DraggableScrollableSheet` widget is detected in the presentation layer → do NOT add it to the navigator's screen list. It is a bottom sheet overlay, not a navigation route. Emit a WARN: `"DraggableScrollableSheet detected in presentation layer. This is an overlay — it must not be a navigator screen. Use @gorhom/bottom-sheet and control visibility via bottomSheetRef.current?.expand() / .close() from a state variable."`
- If nesting depth exceeds 3 levels (tab → stack → stack → ...) → add a WARN: `"Navigator nesting depth exceeds 3 levels. Deep nesting causes performance issues and makes back-stack management difficult. Consider flattening the hierarchy."`
- If `existingRoutes` is non-empty → merge inferred screens with existing routes; add a WARN for any inferred route that conflicts with an existing route name

---

## Step 4 — Infer Route Parameter Types

For every screen that receives navigation arguments, generate a typed param interface entry for `RootStackParamList`.

```ts
// navigation-converter/inferParamTypes.ts

export interface RouteParamEntry {
  routeName: string;
  params: Record<string, string> | "undefined"; // "undefined" = no params
}

export function inferParamTypes(
  screens: ScreenNode[],
  navigationCalls: NavigationNode[]
): RouteParamEntry[] {
  return screens.map((screen) => {
    const callsToScreen = navigationCalls.filter(
      (c) => c.destination === screen.routeName || c.destination === screen.componentName
    );

    if (callsToScreen.length === 0 || !callsToScreen.some((c) => c.passesArguments)) {
      return { routeName: screen.routeName, params: "undefined" };
    }

    // Build param shape from all calls — union of all argument keys observed
    const params: Record<string, string> = {};
    for (const call of callsToScreen.filter((c) => c.passesArguments)) {
      const inferred = inferParamShape(call);
      Object.assign(params, inferred);
    }

    return { routeName: screen.routeName, params };
  });
}

function inferParamShape(call: NavigationNode): Record<string, string> {
  // Params are inferred from the raw Dart argument map if available.
  // If the argument is a variable reference, emit the param as 'unknown'.
  // Example: { id: "number", name: "string", filter: "unknown" }
  return {}; // populated from call.destination argument parsing
}
```

**Quality checks:**
- If a param type cannot be inferred (dynamic expression) → emit `unknown` for that param and add a WARN: `"Param '{key}' for route '{routeName}' has a dynamic value. Typed as 'unknown'. Replace with the correct type manually."`
- If two navigation calls to the same screen pass different argument shapes → union the shapes and add a WARN: `"Route '{routeName}' receives inconsistent param shapes from multiple call sites. Unified shape: {shape}. Verify all callers supply compatible params."`
- Screens with no navigation calls pointing to them → `params: "undefined"` (not optional — undefined signals no params expected)

---

## Step 5 — Generate the Param List Type

Produce the `RootStackParamList` (and per-navigator param lists if nested) that types the entire navigation tree.

```ts
// navigation-converter/generateParamList.ts

export function generateParamListFile(
  navigatorNode: NavigatorNode,
  paramEntries: RouteParamEntry[],
  basePath: string
): GeneratedFile {
  const entries = paramEntries.map((entry) => {
    const paramsType = entry.params === "undefined"
      ? "undefined"
      : `{\n${Object.entries(entry.params).map(([k, v]) => `    ${k}: ${v};`).join("\n")}\n  }`;
    return `  ${entry.routeName}: ${paramsType};`;
  });

  const nestedParamLists = navigatorNode.children.map((child) =>
    generateNestedParamList(child, paramEntries)
  );

  return {
    outputPath: `${basePath}/shared/navigation/navigationTypes.ts`,
    fileContent: `import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
${entries.join("\n")}
};

${nestedParamLists.join("\n\n")}

// Typed screen props helpers — use these in screen components instead of raw useNavigation()
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type BottomTabScreenProps_<T extends keyof RootTabParamList> =
  BottomTabScreenProps<RootTabParamList, T>;
`,
  };
}
```

**Rule:** `RootStackParamList` must include every screen in the navigator tree — including screens that take no params (`params: undefined`). An incomplete `RootStackParamList` causes TypeScript to silently allow navigation to undefined routes.

---

## Step 6 — Generate the Navigator Components

Produce the navigator component files — one per navigator in the hierarchy.

```ts
// navigation-converter/generateNavigatorComponents.ts

export function generateStackNavigator(
  node: NavigatorNode,
  paramListName: string,
  basePath: string
): GeneratedFile {
  const screenImports = node.screens
    .map((s) => `import ${s.componentName} from '../../features/${toKebabCase(s.componentName)}/presentation/screens/${s.componentName}';`)
    .join("\n");

  const screenElements = node.screens
    .map((s) => `      <Stack.Screen name="${s.routeName}" component={${s.componentName}} />`)
    .join("\n");

  return {
    outputPath: `${basePath}/shared/navigation/${node.name}.tsx`,
    fileContent: `import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ${paramListName} } from './navigationTypes';
${screenImports}

const Stack = createNativeStackNavigator<${paramListName}>();

const ${node.name} = () => {
  return (
    <Stack.Navigator>
${screenElements}
    </Stack.Navigator>
  );
};

export default ${node.name};
`,
  };
}

export function generateTabNavigator(
  node: NavigatorNode,
  tabParamListName: string,
  childStackComponents: GeneratedFile[],
  basePath: string
): GeneratedFile {
  const stackImports = node.children
    .map((child) => `import ${child.name} from './${child.name}';`)
    .join("\n");

  const tabScreens = node.children
    .map((child) => `      <Tab.Screen name="${child.name.replace("Stack", "")}" component={${child.name}} />`)
    .join("\n");

  return {
    outputPath: `${basePath}/shared/navigation/${node.name}.tsx`,
    fileContent: `import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ${tabParamListName} } from './navigationTypes';
${stackImports}

const Tab = createBottomTabNavigator<${tabParamListName}>();

const ${node.name} = () => {
  return (
    <Tab.Navigator>
${tabScreens}
    </Tab.Navigator>
  );
};

export default ${node.name};
`,
  };
}
```

**Quality checks:**
- Every `Stack.Screen` must reference a component that exists in the screens list — an unresolved component reference is a WARN: `"Screen '{routeName}' references component '{componentName}' which was not found in the presentation layer. Add the component or correct the route name."`
- Navigators are functional components only — no class-based navigator wrappers
- Generic type parameter (`<ParamList>`) must always be applied to the `createNativeStackNavigator<T>()` call — untyped navigators defeat the purpose of `RootStackParamList`

---

## Step 7 — Convert Navigation Call Sites

Generate the React Navigation equivalents for each Flutter navigation call. These snippets are injected into the screen components by the Widget to JSX Converter.

```ts
// navigation-converter/convertCallSites.ts

export interface ConvertedNavigationCall {
  originalCall: string;       // e.g. "Navigator.pushNamed(context, '/detail', arguments: { id: 1 })"
  rnCall: string;             // e.g. "navigation.navigate('ProductDetail', { id: 1 })"
  requiresUseNavigation: boolean;
  requiresUseRoute: boolean;
  violation: Violation | null;
}

export function convertNavigationCall(call: NavigationNode): ConvertedNavigationCall {
  const rnAction = ACTION_MAP[call.type] ?? null;

  if (!rnAction) {
    return {
      originalCall: call.type,
      rnCall: `/* TODO: convert navigation call: ${call.type} */`,
      requiresUseNavigation: false,
      requiresUseRoute: false,
      violation: {
        severity: "WARN",
        message: `Navigation call type '${call.type}' has no mapping. Emitted as a TODO comment. UI component is preserved.`,
      },
    };
  }

  // If destination is missing or unresolved, stub with placeholder — NEVER skip the UI component
  if (!call.destination) {
    return {
      originalCall: call.type,
      rnCall: `() => console.log('Feature not implemented')`,
      requiresUseNavigation: false,
      requiresUseRoute: false,
      violation: {
        severity: "WARN",
        message: `Navigation call in '${call.containingMethod}' targets an unknown destination. Stubbed with placeholder. UI component preserved.`,
      },
    };
  }

  const destination = call.destination ? `'${call.destination}'` : "/* TODO: route name */";
  const params      = call.passesArguments ? ", params" : "";

  // Special cases
  if (call.type === "Navigator.pushAndRemoveUntil" || call.type === "Navigator.pushNamedAndRemoveUntil") {
    return {
      originalCall: call.type,
      rnCall: `navigation.reset({ index: 0, routes: [{ name: ${destination} }] })`,
      requiresUseNavigation: true,
      requiresUseRoute: false,
      violation: {
        severity: "WARN",
        message: `'${call.type}' mapped to navigation.reset(). Verify the reset state matches the intended back-stack behavior.`,
      },
    };
  }

  if (call.type === "Navigator.popUntil") {
    return {
      originalCall: call.type,
      rnCall: `navigation.popToTop() /* approximation of popUntil — verify target screen */`,
      requiresUseNavigation: true,
      requiresUseRoute: false,
      violation: {
        severity: "WARN",
        message: `'Navigator.popUntil' mapped to 'navigation.popToTop()'. This is an approximation — popUntil with a non-root predicate requires manual implementation using navigation.getState().`,
      },
    };
  }

  return {
    originalCall: call.type,
    rnCall: `${rnAction}(${call.type === "Navigator.pop" ? "" : destination + params})`,
    requiresUseNavigation: call.type !== "Navigator.pop" || true,
    requiresUseRoute: call.passesArguments,
    violation: null,
  };
}
```

**Decision point:**
- `Navigator.popUntil` → always WARN; `navigation.popToTop()` is emitted as an approximation
- `Navigator.pushAndRemoveUntil` → `navigation.reset()` with a WARN to verify reset state
- Any call with `destination: null` → emit a TODO comment for the route name and add a WARN

---

## Step 8 — Generate the Root Navigation Entry Point

Produce the root `AppNavigator` that wraps everything in `NavigationContainer`.

```ts
// navigation-converter/generateAppNavigator.ts

export function generateAppNavigator(
  rootNavigatorName: string,
  basePath: string
): GeneratedFile {
  return {
    outputPath: `${basePath}/shared/navigation/AppNavigator.tsx`,
    fileContent: `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import ${rootNavigatorName} from './${rootNavigatorName}';

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <${rootNavigatorName} />
    </NavigationContainer>
  );
};

export default AppNavigator;
`,
  };
}
```

**Rule:** `NavigationContainer` must appear exactly once in the app — in `AppNavigator.tsx`. Nested navigators must never wrap themselves in an additional `NavigationContainer`.

---

## Step 9 — Validate Navigation Output

Run cross-reference and completeness checks before returning.

```ts
// navigation-converter/validateNavigation.ts

export function validateNavigation(
  paramList: RouteParamEntry[],
  navigatorNodes: NavigatorNode[],
  convertedCalls: ConvertedNavigationCall[],
  generatedFiles: GeneratedFile[]
): Violation[] {
  const violations: Violation[] = [];
  const declaredRoutes = new Set(paramList.map((e) => e.routeName));

  // 1. Every navigation call destination must exist in RootStackParamList
  for (const call of convertedCalls) {
    const destination = extractDestination(call.rnCall);
    if (destination && !declaredRoutes.has(destination)) {
      violations.push({
        severity: "FATAL",
        message: `Navigation call targets route '${destination}' which is not declared in RootStackParamList. Add the screen to the navigator or correct the route name.`,
      });
    }
  }

  // 2. Every screen in the navigator tree must have a RootStackParamList entry
  for (const node of allNodes(navigatorNodes)) {
    for (const screen of node.screens) {
      if (!declaredRoutes.has(screen.routeName)) {
        violations.push({
          severity: "FATAL",
          message: `Screen '${screen.routeName}' is in the navigator tree but missing from RootStackParamList.`,
        });
      }
    }
  }

  // 3. NavigationContainer must appear exactly once
  const containerCount = generatedFiles.filter((f) =>
    f.fileContent.includes("NavigationContainer")
  ).length;
  if (containerCount > 1) {
    violations.push({
      severity: "FATAL",
      message: `NavigationContainer appears in ${containerCount} files. It must appear exactly once — in AppNavigator.tsx only.`,
    });
  }

  // 4. No screen component imports React Navigation directly (they use typed props)
  for (const file of generatedFiles) {
    if (file.outputPath.includes("/screens/") && file.fileContent.includes("useNavigation")) {
      violations.push({
        severity: "WARN",
        message: `Screen '${file.outputPath}' uses 'useNavigation()'. Prefer typed screen props (navigation prop via RootStackScreenProps) for full type safety.`,
      });
    }
  }

  return violations;
}
```

Run through this checklist before returning:

- [ ] Every screen in the navigator tree has an entry in `RootStackParamList`
- [ ] Every navigation call destination exists as a declared route name
- [ ] `NavigationContainer` appears in exactly one file (`AppNavigator.tsx`)
- [ ] All navigator components use the generic type parameter (`createNativeStackNavigator<ParamList>()`)
- [ ] `Navigator.popUntil` calls have WARN violations noting the approximation
- [ ] `Navigator.pushAndRemoveUntil` calls have WARN violations noting the reset behavior
- [ ] No nested navigator wraps itself in an additional `NavigationContainer`
- [ ] `navigationTypes.ts` exports `RootStackParamList` and typed screen prop helpers
- [ ] `violations[]` contains no `FATAL` entries before returning

---

## File Layout Reference

```
navigation-converter/
├── index.ts                             ← Orchestrator: runs steps 1–9 in order
├── navigationMap.ts                     ← Step 2: Flutter navigator + action mapping tables
├── inferNavigatorStructure.ts           ← Step 3: screens + calls → NavigatorNode tree
├── inferParamTypes.ts                   ← Step 4: navigation calls → param shape inference
├── generateParamList.ts                 ← Step 5: RootStackParamList + typed prop helpers
├── generateNavigatorComponents.ts       ← Step 6: stack + tab navigator .tsx files
├── convertCallSites.ts                  ← Step 7: Flutter call → RN navigation call string
├── generateAppNavigator.ts              ← Step 8: AppNavigator.tsx with NavigationContainer
├── validateNavigation.ts                ← Step 9: route coverage + container count check
├── errors.ts                            ← NavigationFatalError, Violation types
└── __tests__/
    ├── inferNavigatorStructure.test.ts
    ├── inferParamTypes.test.ts
    ├── convertCallSites.test.ts
    └── validateNavigation.test.ts

Generated output:
src/shared/navigation/
├── AppNavigator.tsx              ← NavigationContainer wrapper (exactly one)
├── navigationTypes.ts            ← RootStackParamList + typed screen props
├── MainTabNavigator.tsx          ← Tab navigator (if tabs detected)
├── <Feature>StackNavigator.tsx   ← Per-tab or root stack navigators
└── index.ts                      ← Re-exports AppNavigator and navigationTypes
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| React Navigation only | No other navigation library is permitted — Expo Router, React Native Navigation, and custom solutions are all FATALs |
| `RootStackParamList` is complete | Every screen — including param-free screens — must appear in `RootStackParamList`; an incomplete list allows navigation to undefined routes |
| Typed navigators always | Every `createNativeStackNavigator` and `createBottomTabNavigator` call must carry its generic type param — untyped navigators defeat TypeScript safety |
| One `NavigationContainer` | `NavigationContainer` appears exactly once in `AppNavigator.tsx`; duplicate containers corrupt navigation state |
| `popUntil` is always approximate | `Navigator.popUntil` with a non-root predicate has no direct equivalent — it is always converted with a WARN |
| Params are typed at the boundary | Argument shapes are inferred at conversion time and surfaced as `unknown` when dynamic — callers must replace `unknown` before shipping |
| Table-driven action mapping | All Flutter action → RN action conversions use `ACTION_MAP`; ad-hoc string substitutions in the converter logic are forbidden |
| **UI is mandatory, navigation can be stubbed** | **No UI component is ever skipped because its navigation target is missing or unimplemented.** Missing destinations are stubbed with `onPress={() => console.log('Feature not implemented')}` or `Alert.alert('Feature not implemented')`. The UI is always fully converted — layout, styling, and position intact. Navigation is a separate concern from UI rendering. |
