---
name: feature-folder-generator
description: "MUST be used whenever a new feature folder needs to be scaffolded in a React Native project following feature-first clean architecture. Use when: creating a new feature from scratch; migrating a Flutter feature into a React Native feature-first structure; verifying an existing feature folder is complete and correctly layered; generating the initial folder tree before any code files are written. Keywords: feature folder, feature-first, folder structure, scaffolding, vertical slicing, clean architecture, presentation domain data state, react native folder generator, feature isolation."
priority: HIGH
auto-trigger: true
---

# Feature Folder Generator

> Trigger this skill **before** any code file is generated for a new feature. The folder structure produced here is the contract that all downstream skills (Widget to JSX Converter, Layout Converter, Styling Converter, etc.) use to determine where to write their output. No file may be placed in a feature directory that this skill has not declared.

## Step 1 — Receive and Validate Input

Accept `featureName` and verify it is safe to use as a directory name before generating anything.

**Input schema:**

```json
{
  "featureName": "string",
  "basePath": "string | null",
  "nestedUnder": "string | null"
}
```

- `featureName`: the logical name of the feature (e.g. `"auth"`, `"productDetail"`, `"UserProfile"`)
- `basePath`: optional root override (defaults to `"src/features"` if null)
- `nestedUnder`: optional parent feature name for nested features (see Step 4)

**Decision point:**
- If `featureName` is null, empty, or whitespace-only → **FAIL**: `"FATAL: 'featureName' is required. Cannot generate a folder structure without a feature name."`
- If `featureName` contains path separators (`/`, `\`), spaces, or special characters other than `-` and `_` → **FAIL**: `"FATAL: 'featureName' contains invalid characters: '{chars}'. Use camelCase, kebab-case, or snake_case only."`
- If `featureName` is a reserved word (`shared`, `core`, `common`, `utils`, `lib`, `index`) → **FAIL**: `"FATAL: '{featureName}' is a reserved folder name and cannot be used as a feature name."`
- If `basePath` is provided but contains `..` path traversal segments → **FAIL**: `"FATAL: 'basePath' contains path traversal segments. Use a safe relative path."`

**Rule:** This skill generates folder path strings only — it never creates directories on disk, writes files, or executes shell commands. Callers are responsible for materializing the returned paths.

---

## Step 1b — Load GSD Structure Data

If the `constitutionConfig` (passed via pipeline context) contains `featureModules[]` and `sharedModules[]` (populated from STRUCTURE.md by the GSD-first Constitution Reader), use them to inform folder generation decisions.

```ts
// feature-folder-generator/loadGsdStructure.ts

export interface GsdStructureData {
  featureModules: string[];   // Feature names declared in STRUCTURE.md (e.g. ["portfolio", "watchlist", "auth"])
  sharedModules: string[];    // Shared module names (e.g. ["core", "shared", "design-system"])
  conventions: string[];      // Naming/structure conventions from CONVENTIONS.md
  hasGsdData: boolean;
}

export function loadGsdStructure(config: ConstitutionConfig): GsdStructureData {
  return {
    featureModules: config.featureModules ?? [],
    sharedModules: config.sharedModules ?? [],
    conventions: config.conventions ?? [],
    hasGsdData: (config.featureModules?.length ?? 0) > 0 || (config.sharedModules?.length ?? 0) > 0,
  };
}
```

**Decision point:**
- If `featureModules[]` is non-empty → validate that the requested `featureName` appears in the list. If it does NOT appear: emit WARN: `"Feature '{featureName}' is not declared in STRUCTURE.md's feature module list: [{featureModules}]. Verify this is a new feature being added intentionally, not a misspelling of an existing feature."`
- If `sharedModules[]` is non-empty → verify no feature folder overlaps with a shared module name. If `featureName` matches a shared module name: **FAIL**: `"FATAL: '{featureName}' conflicts with shared module '{sharedModule}' declared in STRUCTURE.md. Features and shared modules must have distinct names."`
- If `conventions[]` includes folder naming rules (e.g., "use kebab-case for folders", "use PascalCase for component files") → apply those conventions in Step 2 (normalization) instead of defaults. Emit: `"INFO: Applying GSD-derived naming convention: '{convention}'."`
- If `hasGsdData` is false → emit INFO: `"No GSD structure data available. Using default feature-first scaffolding rules."` Continue with defaults.

---

## Step 2 — Normalize the Feature Name

Produce a single canonical folder name from the raw input, regardless of the casing convention supplied by the caller.

```ts
// feature-folder-generator/normalizeFeatureName.ts

export type NamingConvention = "kebab-case" | "camelCase" | "snake_case" | "PascalCase";

export interface NormalizedFeatureName {
  folderName: string;      // kebab-case, used for the directory
  componentPrefix: string; // PascalCase, used for generated file and component names
  originalInput: string;
  detectedConvention: NamingConvention;
}

export function normalizeFeatureName(raw: string): NormalizedFeatureName {
  const detectedConvention = detectConvention(raw);
  const words = splitIntoWords(raw); // handles camelCase, PascalCase, snake_case, kebab-case

  const folderName     = words.map((w) => w.toLowerCase()).join("-");         // kebab-case
  const componentPrefix = words.map((w) => capitalize(w)).join("");           // PascalCase

  return { folderName, componentPrefix, originalInput: raw, detectedConvention };
}

// Examples:
// "productDetail"  → { folderName: "product-detail", componentPrefix: "ProductDetail" }
// "UserProfile"    → { folderName: "user-profile",    componentPrefix: "UserProfile"   }
// "auth_flow"      → { folderName: "auth-flow",       componentPrefix: "AuthFlow"      }
// "cart-summary"   → { folderName: "cart-summary",    componentPrefix: "CartSummary"   }
```

**Quality check:** `folderName` must always be kebab-case after normalization, regardless of input convention. `componentPrefix` must always be PascalCase. Both must be derived from the same word split — they must never diverge.

---

## Step 3 — Generate the Required Layer Folders

Every feature must contain exactly these four layers. No layer may be omitted, and no additional layers may be added without an explicit constitution amendment.

```ts
// feature-folder-generator/generateFolderTree.ts

export const REQUIRED_LAYERS = [
  "presentation",
  "domain",
  "data",
  "state",
] as const;

export type RequiredLayer = (typeof REQUIRED_LAYERS)[number];

export interface LayerFolder {
  layer: RequiredLayer;
  path: string;           // full relative path from project root
  subFolders: string[];   // standard sub-directories within the layer
}

export const LAYER_SUBFOLDERS: Record<RequiredLayer, string[]> = {
  presentation: ["components", "screens", "hooks"],
  domain:       ["models", "usecases"],
  data:         ["repositories", "datasources", "mappers"],
  state:        ["store", "selectors"],
};

export function generateLayerFolders(
  normalized: NormalizedFeatureName,
  basePath: string
): LayerFolder[] {
  const featureRoot = `${basePath}/${normalized.folderName}`;

  return REQUIRED_LAYERS.map((layer) => ({
    layer,
    path: `${featureRoot}/${layer}`,
    subFolders: LAYER_SUBFOLDERS[layer].map((sub) => `${featureRoot}/${layer}/${sub}`),
  }));
}
```

**Decision point:**
- If the generated paths already exist in the project (caller signals this via `existingPaths[]`) → **FAIL**: `"FATAL: Feature '{folderName}' already exists at '{path}'. Use a different feature name or extend the existing feature manually."`
- If only some layers exist (partial feature) → **FAIL**: `"FATAL: Feature '{folderName}' exists but is incomplete. Missing layers: [{missingLayers}]. Do not overwrite — extend manually to avoid data loss."`

---

## Step 4 — Handle Nested Features

A feature may be nested inside a parent feature only when the constitution explicitly permits nested features. Nesting that is not declared in the constitution is always a violation.

```ts
// feature-folder-generator/handleNesting.ts

export interface NestedFeatureConfig {
  parentFeature: string;          // normalized folder name of the parent
  childFeature: string;           // normalized folder name of the child
  childBasePath: string;          // e.g. "src/features/checkout/features"
  violatesConstitution: boolean;
}

export function resolveNestedPath(
  normalized: NormalizedFeatureName,
  parentName: string,
  basePath: string,
  constitutionAllowsNesting: boolean
): NestedFeatureConfig {
  const parentNormalized = normalizeFeatureName(parentName);

  if (!constitutionAllowsNesting) {
    return {
      parentFeature: parentNormalized.folderName,
      childFeature: normalized.folderName,
      childBasePath: `${basePath}/${parentNormalized.folderName}/features`,
      violatesConstitution: true,
    };
  }

  return {
    parentFeature: parentNormalized.folderName,
    childFeature: normalized.folderName,
    childBasePath: `${basePath}/${parentNormalized.folderName}/features`,
    violatesConstitution: false,
  };
}
```

**Decision point:**
- If `nestedUnder` is provided and constitution does not permit nesting → **FAIL**: `"FATAL: Nested features are not permitted by the constitution. Place '{featureName}' as a top-level feature or amend the constitution first."`
- If `nestedUnder` references a parent feature that does not yet exist → **FAIL**: `"FATAL: Parent feature '{parentName}' does not exist. Create the parent feature first."`
- If nesting depth exceeds 1 (a nested feature nested inside another nested feature) → **FAIL**: `"FATAL: Features may only be nested one level deep. '{featureName}' would be at depth 2."`

---

## Step 5 — Generate Index and Barrel Files

Each layer folder must include a typed index file that controls what is exported from that layer. No layer may export symbols ad-hoc from individual files.

```ts
// feature-folder-generator/generateIndexFiles.ts

export interface IndexFile {
  path: string;          // full relative path including filename
  content: string;       // file content template
  layer: RequiredLayer;
}

export function generateIndexFiles(
  normalized: NormalizedFeatureName,
  layers: LayerFolder[]
): IndexFile[] {
  return layers.map((layer) => ({
    path: `${layer.path}/index.ts`,
    layer: layer.layer,
    content: generateIndexTemplate(layer.layer, normalized.componentPrefix),
  }));
}

function generateIndexTemplate(layer: RequiredLayer, prefix: string): string {
  const templates: Record<RequiredLayer, string> = {
    presentation: `// ${prefix} — Presentation Layer exports\n// Export screens, components, and hooks from this layer only.\n\nexport {};\n`,
    domain:       `// ${prefix} — Domain Layer exports\n// Export models and use cases. No framework dependencies.\n\nexport {};\n`,
    data:         `// ${prefix} — Data Layer exports\n// Export repository implementations and data source adapters.\n\nexport {};\n`,
    state:        `// ${prefix} — State Layer exports\n// Export store slices, atoms, or selectors.\n\nexport {};\n`,
  };
  return templates[layer];
}
```

**Rule:** Index files are generated as empty barrel files (`export {};`) — they are never pre-populated with imports. Downstream skills are responsible for adding exports as they generate code.

---

## Step 6 — Enforce Cross-Feature Isolation

Verify that the new feature's path does not create any structural pattern that would allow cross-feature imports.

```ts
// feature-folder-generator/enforceIsolation.ts

export interface IsolationCheck {
  passed: boolean;
  violations: Violation[];
}

export function enforceIsolation(
  normalized: NormalizedFeatureName,
  allExistingFeatures: string[],   // normalized folder names of all existing features
  basePath: string
): IsolationCheck {
  const violations: Violation[] = [];

  // 1. Feature name must not shadow a shared/core module name
  const SHARED_MODULE_NAMES = ["shared", "core", "common", "utils", "hooks", "components"];
  if (SHARED_MODULE_NAMES.includes(normalized.folderName)) {
    violations.push({
      severity: "FATAL",
      message: `Feature name '${normalized.folderName}' shadows a shared module. Rename to avoid import ambiguity.`,
    });
  }

  // 2. Feature path must not be a sub-path of another feature without explicit nesting
  for (const existingFeature of allExistingFeatures) {
    if (normalized.folderName.startsWith(existingFeature + "-")) {
      violations.push({
        severity: "WARN",
        message: `Feature '${normalized.folderName}' has a name that starts with existing feature '${existingFeature}'. Ensure these are intentionally separate features and not a missed nesting.`,
      });
    }
  }

  return { passed: violations.filter((v) => v.severity === "FATAL").length === 0, violations };
}
```

---

## Step 7 — Validate the Generated Structure

Run completeness validation before returning the folder list.

```ts
// feature-folder-generator/validateStructure.ts

export function validateStructure(
  layers: LayerFolder[],
  indexFiles: IndexFile[]
): Violation[] {
  const violations: Violation[] = [];

  // 1. All four required layers must be present
  const generatedLayers = new Set(layers.map((l) => l.layer));
  for (const required of REQUIRED_LAYERS) {
    if (!generatedLayers.has(required)) {
      violations.push({
        severity: "FATAL",
        message: `Required layer '${required}' is missing from the generated structure. All four layers must be present.`,
      });
    }
  }

  // 2. Each layer must have an index file
  const indexPaths = new Set(indexFiles.map((f) => f.path));
  for (const layer of layers) {
    const expectedIndex = `${layer.path}/index.ts`;
    if (!indexPaths.has(expectedIndex)) {
      violations.push({
        severity: "FATAL",
        message: `Layer '${layer.layer}' is missing its index.ts barrel file at '${expectedIndex}'.`,
      });
    }
  }

  // 3. Each layer must have all its declared sub-folders
  for (const layer of layers) {
    const expected = LAYER_SUBFOLDERS[layer.layer];
    const actual = layer.subFolders.map((p) => p.split("/").pop()!);
    for (const sub of expected) {
      if (!actual.includes(sub)) {
        violations.push({
          severity: "FATAL",
          message: `Sub-folder '${sub}' is missing from layer '${layer.layer}'. All declared sub-folders must be generated.`,
        });
      }
    }
  }

  return violations;
}
```

Run through this checklist before returning:

- [ ] `featureName` was normalized to kebab-case for folder name and PascalCase for component prefix
- [ ] All four required layers are present: `presentation`, `domain`, `data`, `state`
- [ ] Each layer contains all declared sub-folders
- [ ] Each layer has an `index.ts` barrel file
- [ ] Feature path does not conflict with an existing feature
- [ ] Nesting rules were checked against the constitution (if `nestedUnder` was provided)
- [ ] No layer path is a sub-path of another feature's root
- [ ] New/boilerplate project scaffolding ran when `isNewProject: true` (Step 7b)
- [ ] `violations[]` contains no `FATAL` entries before returning

---

## Step 7b — Scaffold Shared Infrastructure for New and Boilerplate Projects

When `isNewProject: true` (i.e. `targetProject.type` is `"boilerplate"` or `"new"` in the pipeline input), the target project has no prior `src/` structure. In addition to the feature folder tree, this skill generates the minimum shared scaffolding that any RN feature requires to function.

```ts
// feature-folder-generator/scaffoldNewProject.ts

export interface NewProjectScaffold {
  sharedFolders: string[];
  sharedFiles: Array<{ path: string; content: string }>;
  violations: Violation[];
}

export function scaffoldNewProject(
  featureName: string,
  resolvedBaseUrl: string | null
): NewProjectScaffold {
  const violations: Violation[] = [];

  const sharedFolders = [
    "src/shared/api/interceptors",
    "src/shared/errors",
    "src/app/state",
    "src/app/routing",
    "src/app/di",
  ];

  const sharedFiles: Array<{ path: string; content: string }> = [
    // App entry placeholder
    {
      path: "src/app/App.tsx",
      content: `import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from './state/store';
// TODO: import and register setupApiClient from '@/shared/api/setupApiClient' here
// TODO: add RootNavigator after generating navigation

export default function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <NavigationContainer>
        {/* TODO: add RootNavigator here */}
      </NavigationContainer>
    </Provider>
  );
}
`,
    },
    // Redux store placeholder
    {
      path: "src/app/state/store.ts",
      content: `import { configureStore } from '@reduxjs/toolkit';
// TODO: import feature reducers and ThunkExtra factories here
// See: Post-Pipeline Integration Checklist → Step 1: STORE WIRING

export const store = configureStore({
  reducer: {
    // TODO: add feature reducers here, e.g.:
    // ${featureName}: ${featureName}Slice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // TODO: add thunkMiddleware with extraArgument here, e.g.:
      // thunk: { extraArgument: create${toPascalCase(featureName)}ThunkExtra() },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`,
    },
    // Typed hooks
    {
      path: "src/app/state/hooks.ts",
      content: `import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`,
    },
    // DI container placeholder
    {
      path: "src/app/di/container.ts",
      content: `// Dependency Injection Container
// Register create<Feature>ThunkExtra factories here for each converted feature.
// See: Post-Pipeline Integration Checklist → Step 4: DI CONTAINER

export const diContainer = {
  // TODO: add feature ThunkExtra factory registrations here, e.g.:
  // ${featureName}: create${toPascalCase(featureName)}ThunkExtra,
} as const;
`,
    },
    // Minimal .gitignore entry for .env
    {
      path: ".gitignore.append",
      content: `# Environment variables — NEVER commit .env to source control
.env
.env.local
.env.*.local
`,
    },
  ];

  if (!resolvedBaseUrl) {
    violations.push({
      severity: "WARN",
      message: "No Base URL available during scaffold. src/shared/api/apiClient.ts will be generated with a TODO placeholder. Configure API_BASE_URL in .env before running the app.",
    });
  }

  return { sharedFolders, sharedFiles, violations };
}
```

**Decision point:**
- If `isNewProject` is `false` → skip Step 7b entirely. Existing project structure is not modified by this skill.
- If `isNewProject` is `true` but `src/app/state/store.ts` already exists in `targetProjectRnFiles` → skip generating that specific file and emit WARN: `"Existing store.ts detected. Shared store scaffold skipped for this file — add the feature wiring manually per the Post-Pipeline Integration Checklist."`
- The `.gitignore.append` file is a special file — the orchestrator merges its content into the existing `.gitignore` file (or creates a new `.gitignore` if none exists) rather than writing it as a standalone file.

**Rule:** Shared scaffolding files are always generated with TODO comments pointing to the Post-Pipeline Integration Checklist. They are never pre-wired — wiring a feature into `store.ts`, `App.tsx`, and `di/container.ts` is a manual integration step that the developer performs after reviewing the generated output.

---

## Step 8 — Return the Folder Manifest

Assemble all generated paths into the canonical output shape.

**Output schema:**

```json
{
  "featureName": "string",
  "folderName": "string",
  "componentPrefix": "string",
  "featureRoot": "string",
  "isNewProject": false,
  "folders": [
    "src/features/<name>/presentation",
    "src/features/<name>/presentation/components",
    "src/features/<name>/presentation/screens",
    "src/features/<name>/presentation/hooks",
    "src/features/<name>/domain",
    "src/features/<name>/domain/models",
    "src/features/<name>/domain/usecases",
    "src/features/<name>/data",
    "src/features/<name>/data/repositories",
    "src/features/<name>/data/datasources",
    "src/features/<name>/data/mappers",
    "src/features/<name>/state",
    "src/features/<name>/state/store",
    "src/features/<name>/state/selectors"
  ],
  "sharedFolders": [],
  "indexFiles": [
    { "path": "src/features/<name>/presentation/index.ts", "content": "string" },
    { "path": "src/features/<name>/domain/index.ts",       "content": "string" },
    { "path": "src/features/<name>/data/index.ts",         "content": "string" },
    { "path": "src/features/<name>/state/index.ts",        "content": "string" }
  ],
  "sharedScaffoldFiles": [],
  "violations": []
}
```

---

## File Layout Reference

```
feature-folder-generator/
├── index.ts                     ← Orchestrator: runs steps 1–8 in order
├── normalizeFeatureName.ts      ← Step 2: raw name → kebab-case + PascalCase
├── generateFolderTree.ts        ← Step 3: layer folders + sub-folders
├── handleNesting.ts             ← Step 4: nested feature path resolution
├── generateIndexFiles.ts        ← Step 5: barrel file templates per layer
├── enforceIsolation.ts          ← Step 6: cross-feature conflict checks
├── validateStructure.ts         ← Step 7: completeness validation
├── scaffoldNewProject.ts        ← Step 7b: shared infrastructure for new/boilerplate projects
├── assembleManifest.ts          ← Step 8: final output shape + fatal gate
├── errors.ts                    ← FolderGeneratorFatalError, Violation types
└── __tests__/
    ├── normalizeFeatureName.test.ts
    ├── generateFolderTree.test.ts
    ├── enforceIsolation.test.ts
    ├── scaffoldNewProject.test.ts
    └── validateStructure.test.ts
```

### Generated Feature Structure Reference

```
src/
├── app/                                ← Generated for new/boilerplate projects only
│   ├── App.tsx                         ← Root app component with TODOs
│   ├── state/
│   │   ├── store.ts                    ← Redux store placeholder
│   │   └── hooks.ts                    ← Typed useAppSelector/useAppDispatch
│   ├── routing/                        ← Empty folder — RootNavigator populated after Step 8
│   └── di/
│       └── container.ts               ← DI container placeholder
├── shared/
│   └── api/                           ← Populated by API Integration skill
│       └── interceptors/
└── features/
    └── <feature-name>/
        ├── presentation/
        │   ├── components/
        │   ├── screens/
        │   ├── hooks/
        │   └── index.ts
        ├── domain/
        │   ├── models/
        │   ├── usecases/
        │   └── index.ts
        ├── data/
        │   ├── repositories/
        │   ├── datasources/
        │   ├── mappers/
        │   └── index.ts
        └── state/
            ├── store/
            ├── selectors/
            └── index.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| All four layers are mandatory | A feature without any one of `presentation`, `domain`, `data`, or `state` is always a FATAL — partial structures are never acceptable |
| Path generation only | This skill returns path strings and file content; it never creates directories on disk or executes shell commands |
| Kebab-case folders, PascalCase prefixes | Folder names are always kebab-case; component/file name prefixes are always PascalCase — both derived from the same word split |
| No cross-feature leakage | A feature's folder name must not shadow shared modules, sub-path existing features, or violate isolation rules from the constitution |
| Reserved names are blocked | `shared`, `core`, `common`, `utils`, `lib`, and `index` are unconditionally rejected as feature names |
| Nesting is opt-in | Features may only be nested when the constitution explicitly permits it; depth is capped at 1 |
| Barrel files are empty by default | `index.ts` files are generated as `export {}` — downstream skills populate them; this skill never pre-imports symbols |
| Existing features are never overwritten | If a feature or any of its layers already exists on disk, the skill FAILs rather than silently merging or replacing |
| New project scaffolding runs once | `scaffoldNewProject` only runs when `isNewProject: true`. It generates shared infrastructure placeholders — never pre-wired feature code. All wiring is a developer-performed integration step |
