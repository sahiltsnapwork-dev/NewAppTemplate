---
name: redux-state-generator
description: "MUST be used whenever a Redux Toolkit state layer needs to be generated for a feature following clean architecture. Use when: creating slice files with createSlice after domain use cases have been defined; generating createAsyncThunk wrappers that delegate to use cases (never to API clients directly); producing typed selectors for all slice state fields; managing loading, error, and data states for async operations; wiring the state layer of a feature after the Domain Extraction skill has produced use cases. Keywords: redux toolkit, createSlice, createAsyncThunk, selectors, state layer, thunk, loading state, error state, clean architecture, react native state, feature state."
priority: HIGH
auto-trigger: true
---

# Redux State Generator

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

> Trigger this skill **after** the Domain Extraction skill has produced use cases and **after** the Feature Folder Generator has scaffolded `features/<name>/state/`. This skill writes exclusively to `features/<name>/state/`. It is the only layer permitted to import Redux Toolkit. Thunks must delegate exclusively to use case `execute()` methods — direct API calls, Axios imports, or repository calls inside thunks are always **FATAL**.

## The Thunk Delegation Rule

The state layer's sole networking responsibility is orchestration — it calls use cases, manages loading/error states, and stores results. It never performs I/O itself:

| Permitted in a thunk | Forbidden in a thunk |
|---------------------|---------------------|
| `await useCase.execute(args)` | `await axios.get(...)` |
| `dispatch(otherAction())` | `await repository.fetchData()` |
| Argument validation | `fetch(url)` |
| Error type checking | Direct `AsyncStorage` reads |
| Returning a plain serializable value | Returning class instances or functions |

A thunk that bypasses its use case and calls infrastructure directly destroys the clean architecture boundary between state and data. This is a **FATAL** with no exceptions.

---

## BLoC-to-Redux Mapping

When input use cases originate from a BLoC-based Flutter source (detected via `parsedFlutter.blocNodes[]` from the Flutter Parser), apply this translation table before generating any slice or thunk:

| BLoC Concept | Redux Toolkit Equivalent |
|---|---|
| `Event` class | `createAsyncThunk` (one thunk per event) |
| `LoadingState` | `status: 'loading'` |
| `LoadedState` (with data) | `status: 'succeeded'`, data field in slice state |
| `ErrorState` | `status: 'failed'`, error field in slice state |
| Uninitialized / `UnState` | `status: 'idle'` |
| `bloc.add(SomeEvent())` | `dispatch(someEventThunk(args))` |

**God-slice prevention rule:** When a single BLoC declares more than 5 events, do NOT put all thunks in one slice file. Group thunks by concern into separate slice files named after their concern. For example, a `GetQuoteDetailsBloc` with 11 events should be split into:

```
state/store/getQuoteNewsSlice.ts        ← news + bulk block thunks
state/store/getQuoteFnoSlice.ts         ← futures & options thunks
state/store/getQuoteAnalyticsSlice.ts   ← peers, ratios, trend thunks
state/store/getQuoteOverviewSlice.ts    ← performance, key stats thunks
```

A slice with more than 5 `createAsyncThunk` definitions is a WARN: `"Slice '{sliceName}' contains {count} thunks. Consider splitting by concern to prevent an unmaintainable god-slice. Suggested split: [{suggestedSliceNames}]."`

---

## Step 1 — Receive and Validate Input

Accept the use case definitions from the Domain Extraction skill and any explicit state requirements from the caller.

**Input schema:**

```json
{
  "usecases": [
    {
      "name": "string",
      "methodName": "string",
      "params": [{ "name": "string", "type": "string" }],
      "returnType": "string",
      "isAsync": true,
      "repositoryDependencies": ["string"],
      "outputPath": "string"
    }
  ],
  "stateRequirements": [
    {
      "fieldName": "string",
      "type": "string",
      "initialValue": "string",
      "description": "string | null"
    }
  ],
  "featureName": "string",
  "basePath": "string | null",
  "sliceName": "string | null"
}
```

**Decision point:**
- If `usecases` is empty → **FAIL**: `"FATAL: No use cases provided. Run Domain Extraction skill first. The state layer cannot be generated without use cases to delegate to."`
- If `featureName` is missing → **FAIL**: `"FATAL: 'featureName' is required to determine output paths and slice naming."`
- If `sliceName` is null → derive it from `featureName`: `toCamelCase(featureName)` (e.g. `"productDetail"` → slice name `"productDetail"`, action prefix `"productDetail/"`)
- If any use case has a `returnType` of `"void"` → that use case generates a thunk with no `data` state field; add a WARN: `"UseCase '{name}' returns void. No data field will be added to the slice for this thunk's result."`
- If `stateRequirements` is empty → generate state fields automatically from use case return types only; do not fail

**Rule:** This skill never imports or references Axios, HTTP clients, repository implementations, or data source classes. It depends exclusively on use case types and Redux Toolkit.

---

## Step 1b — Load and Apply GSD State Concerns

If the `constitutionConfig` (passed via pipeline context) contains a non-empty `concerns[]` array, filter for concerns that affect the state layer. These concerns represent anti-patterns in the Flutter codebase's state management (BLoC, Cubit, Provider, GetX) that must NOT be replicated in Redux.

```ts
// redux-state-generator/loadStateConcerns.ts
import type { CodebaseConcern } from "../constitution-reader/extractConcerns";

export function loadStateConcerns(config: ConstitutionConfig): CodebaseConcern[] {
  const concerns = config.concerns ?? [];
  return concerns.filter((c) => c.affectedLayers.includes("state"));
}
```

**Decision point:**
- If `config.concerns` is empty → emit INFO: `"No GSD concerns loaded for state layer. Slice generation proceeds with standard rules only."` Continue normally.
- If state concerns are found → emit INFO: `"Loaded {count} GSD concerns affecting the state layer. Anti-patterns will be actively checked during slice and thunk generation."`

**Application rules — apply to Steps 2–5 below:**
- Before generating each slice, check if the source BLoC/Controller matches any state concern's anti-pattern:
  - **God-BLoC → God-Slice prevention:** If a concern flags a BLoC with too many events/states, enforce the existing god-slice prevention rule (Step 3) with escalated severity: split into multiple slices per concern recommendation. Add a violation: `"GSD CONCERN '{concern.title}': Source BLoC '{blocName}' was flagged as a god-class in CONCERNS.md. Splitting into {n} concern-scoped slices per recommendation."`
  - **State duplication:** If a concern flags duplicate state across BLoCs, ensure the generated slices do not replicate the duplication — use shared selectors or a shared slice instead.
  - **Missing error handling:** If a concern flags missing error states in BLoCs, ensure every generated thunk has complete pending/fulfilled/rejected handlers (already enforced by Step 4, but escalate violation severity for concerned BLoCs).
  - **Direct API calls in state:** If a concern flags BLoCs calling APIs directly instead of through repositories, this reinforces the Thunk Delegation Rule — escalate from WARN to FATAL for concerned BLoCs.
- Tag all concern-derived violations with `source: "gsd-concern"` for traceability.

---

## Step 2 — Design the Slice State Shape

Before generating any Redux code, define the complete slice state interface. Every field must be accounted for — no field may be added ad-hoc inside a reducer without appearing in the state interface.

```ts
// redux-state-generator/designSliceState.ts

export type AsyncStatus = "idle" | "loading" | "succeeded" | "failed";

export interface AsyncStateField {
  dataField: string;         // e.g. "products"
  dataType: string;          // TypeScript type, e.g. "Product[]", "Product | null"
  statusField: string;       // e.g. "fetchProductsStatus"
  errorField: string;        // e.g. "fetchProductsError"
  linkedThunk: string;       // e.g. "fetchProductsThunk"
}

export interface SliceStateField {
  name: string;
  type: string;
  initialValue: string;      // TypeScript literal, e.g. "[]", "null", '"idle"'
  isAsyncData: boolean;      // true if driven by a thunk
  asyncMeta?: AsyncStateField;
}

export interface SliceStateShape {
  interfaceName: string;     // e.g. "ProductDetailState"
  fields: SliceStateField[];
}

export function designSliceState(
  useCases: ExtractedUseCase[],
  stateRequirements: StateRequirement[],
  featureName: string
): SliceStateShape {
  const interfaceName = `${toPascalCase(featureName)}State`;
  const fields: SliceStateField[] = [];

  // 1. Generate async data + status + error fields for each async use case
  for (const uc of useCases.filter((u) => u.isAsync)) {
    const dataFieldName = toCamelCase(stripUseCaseSuffix(uc.name)); // "FetchProductsUseCase" → "fetchProducts"
    const dataType      = uc.returnType.replace(/^Promise<|>$/g, "");
    const isArrayReturn = dataType.endsWith("[]");

    fields.push(
      { name: dataFieldName,           type: dataType,        initialValue: isArrayReturn ? "[]" : "null", isAsyncData: true,  asyncMeta: { dataField: dataFieldName, dataType, statusField: `${dataFieldName}Status`, errorField: `${dataFieldName}Error`, linkedThunk: `${dataFieldName}Thunk` } },
      { name: `${dataFieldName}Status`, type: "AsyncStatus",  initialValue: '"idle"',                     isAsyncData: false },
      { name: `${dataFieldName}Error`,  type: "string | null", initialValue: "null",                      isAsyncData: false },
    );
  }

  // 2. Add explicit state requirements
  for (const req of stateRequirements) {
    if (!fields.find((f) => f.name === req.fieldName)) {
      fields.push({ name: req.fieldName, type: req.type, initialValue: req.initialValue, isAsyncData: false });
    }
  }

  return { interfaceName, fields };
}
```

**Quality checks:**
- Every async use case produces exactly three state fields: `data`, `status`, and `error` — never fewer
- `status` field type is always the `AsyncStatus` union (`"idle" | "loading" | "succeeded" | "failed"`) — never a plain boolean `isLoading` field
- `error` field type is always `string | null` — never an `Error` class instance (class instances are not serializable and will trigger Redux Toolkit's serializability check middleware)
- If a `stateRequirements` field duplicates a generated async field name → WARN and skip the duplicate: `"State requirement '{fieldName}' conflicts with auto-generated field. The generated field takes precedence."`

---

## Step 3 — Generate AsyncThunks (Co-located in the Slice File)

> **CRITICAL RULE — Co-location Mandate:** All `createAsyncThunk` definitions **must** be declared inside the same `*Slice.ts` file, above the `createSlice` call. Generating a separate `*Thunks.ts` or `*Thunk.ts` file for any feature is a **FATAL** violation. Separate thunk files fragment the state layer, break the "one file of truth" for a feature's async operations, require redundant cross-file imports, and were identified as a direct cause of architectural drift in real projects. The Redux Toolkit documentation itself recommends co-locating thunks and slices — this skill enforces that recommendation as a hard rule.

**Forbidden pattern (never generate):**
```
state/store/fetchPortfolioThunk.ts     ← FATAL: standalone thunk file
state/store/fetchWatchlistThunk.ts     ← FATAL: standalone thunk file
```

**Required pattern (always generate):**
```
state/store/portfolioSlice.ts          ← contains BOTH createAsyncThunk AND createSlice
```

Create one `createAsyncThunk` per async use case. Each thunk receives the use case instance via a typed extra argument — never instantiates or imports it directly. All thunks for a feature are declared as module-level consts in the slice file, above the `createSlice` call.

```ts
// redux-state-generator/generateThunks.ts
// NOTE: This module produces thunk code STRINGS only — they are injected into the slice file,
// never written to standalone files.

export interface GeneratedThunk {
  name: string;            // e.g. "fetchProductsThunk"
  actionType: string;      // e.g. "productDetail/fetchProducts"
  useCaseName: string;     // e.g. "FetchProductsUseCase"
  argType: string;         // TypeScript type of the thunk argument
  returnType: string;      // resolved (non-Promise) return type
  inlineCode: string;      // thunk source — injected into slice file, NOT its own outputPath
  violations: Violation[];
}

export function generateThunk(
  useCase: ExtractedUseCase,
  sliceName: string,
): GeneratedThunk {
  const violations: Violation[] = [];
  const thunkName   = `${toCamelCase(stripUseCaseSuffix(useCase.name))}Thunk`;
  const actionType  = `${sliceName}/${toCamelCase(stripUseCaseSuffix(useCase.name))}`;
  const argType     = buildArgType(useCase.params);
  const returnType  = useCase.returnType.replace(/^Promise<|>$/g, "");

  scanThunkBodyForForbiddenPatterns(useCase.methodName, violations);

  const inlineCode = generateThunkInlineCode(thunkName, actionType, useCase, argType, returnType, violations);

  return {
    name: thunkName, actionType, useCaseName: useCase.name,
    argType, returnType,
    inlineCode, violations,
    // outputPath is intentionally absent — thunks have no file of their own
  };
}

function generateThunkInlineCode(
  thunkName: string,
  actionType: string,
  useCase: ExtractedUseCase,
  argType: string,
  returnType: string,
  violations: Violation[]
): string {
  const argParam  = argType !== "void" ? `arg: ${argType}` : "_arg: void";
  const argSpread = argType !== "void" ? buildArgSpread(useCase.params) : "";
  const useCaseVar = toCamelCase(useCase.name);

  return `export const ${thunkName} = createAsyncThunk<
  ${returnType},
  ${argType},
  { extra: ThunkExtra; rejectValue: string }
>(
  '${actionType}',
  async (${argParam}, { extra, rejectWithValue }) => {
    try {
      return await extra.${useCaseVar}.execute(${argSpread});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return rejectWithValue(message);
    }
  }
);`;
}
```

**Decision point:**
- If the thunk argument is a single parameter → `argType` is that parameter's type directly
- If the thunk has multiple parameters → `argType` is an inline object type `{ param1: Type1; param2: Type2 }` — never a positional tuple
- If the thunk has no parameters → `argType` is `void`
- `rejectWithValue` must always accept a `string` — never an `Error` instance or complex object (non-serializable)
- If the caller attempts to set `outputPath` on a `GeneratedThunk` → **FATAL**: `"Thunk '{name}' was given a standalone outputPath. Thunks must be co-located in the slice file. Remove the outputPath and use inlineCode injection via generateSliceFile()."`

**Quality checks:**
- The thunk body must contain exactly one `await extra.{useCase}.execute(...)` call — never zero, never more than one
- `extra.{useCase}` syntax requires a `ThunkExtra` interface; emit it in a shared location (Step 7)
- Error messages extracted via `error instanceof Error ? error.message : 'Unknown error'` — the pattern is always verbatim to guarantee serializability

---

## Step 4 — Generate the Slice

Create the `createSlice` block with `extraReducers` handling all three states (`pending`, `fulfilled`, `rejected`) for every thunk, plus synchronous reducers for any non-async state requirements.

```ts
// redux-state-generator/generateSlice.ts

export function generateSliceFile(
  sliceName: string,
  stateShape: SliceStateShape,
  thunks: GeneratedThunk[],
  syncReducers: SyncReducerSpec[],
  featureName: string,
  basePath: string
): GeneratedFile {
  // Thunks are injected inline — no imports from separate thunk files.
  // A `*Thunks.ts` import here would be a FATAL architectural violation (see Step 3 co-location rule).
  const thunkInlineBlocks = thunks.map((t) => t.inlineCode).join("\n\n");

  const initialState = generateInitialState(stateShape);
  const extraReducers = generateExtraReducers(stateShape, thunks);
  const syncReducerBodies = syncReducers.map(generateSyncReducer).join("\n");

  return {
    outputPath: `${basePath}/features/${featureName}/state/store/${toCamelCase(featureName)}Slice.ts`,
    fileContent: `import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { ${stateShape.interfaceName} } from './${stateShape.interfaceName}';
import type { ThunkExtra } from '../../../shared/store/thunkExtra';

// ── Async Thunks (co-located — do NOT extract into separate *Thunks.ts files) ──
${thunkInlineBlocks}

const initialState: ${stateShape.interfaceName} = ${initialState};

const ${toCamelCase(featureName)}Slice = createSlice({
  name: '${sliceName}',
  initialState,
  reducers: {
${syncReducerBodies || "    // No synchronous reducers"}
  },
  extraReducers: (builder) => {
${extraReducers}
  },
});

export const { ${syncReducers.map((r) => r.actionName).join(", ")} } = ${toCamelCase(featureName)}Slice.actions;
export default ${toCamelCase(featureName)}Slice.reducer;
`,
  };
}

function generateExtraReducers(stateShape: SliceStateShape, thunks: GeneratedThunk[]): string {
  return thunks.map((thunk) => {
    const meta = stateShape.fields.find((f) => f.asyncMeta?.linkedThunk === thunk.name)?.asyncMeta!;

    return `    builder
      .addCase(${thunk.name}.pending, (state) => {
        state.${meta.statusField} = 'loading';
        state.${meta.errorField} = null;
      })
      .addCase(${thunk.name}.fulfilled, (state, action) => {
        state.${meta.statusField} = 'succeeded';
        state.${meta.dataField} = action.payload;
      })
      .addCase(${thunk.name}.rejected, (state, action) => {
        state.${meta.statusField} = 'failed';
        state.${meta.errorField} = action.payload ?? 'Unknown error';
      });`;
  }).join("\n\n");
}
```

**Quality checks:**
- Every thunk must have all three cases handled: `pending`, `fulfilled`, `rejected` — a thunk with only two cases is a WARN: `"Thunk '{name}' is missing a '{missingCase}' handler. Unhandled states leave the UI in a stuck state."`
- State mutations use Immer's draft syntax directly (`state.field = value`) — never `return { ...state, field: value }` (both work but Immer style is the RTK convention)
- `action.payload` in `rejected` is typed as `string` because `rejectValue: string` was declared in the thunk type — this is asserted in the generated code with `?? 'Unknown error'` to handle edge cases

---

### Step 4b — Do Not Generate an 'Empty' Status — Derive Empty State from Data

A common incorrect pattern is adding an `'empty'` status value to the `AsyncStatus` union and setting it in `fulfilled` when `action.payload` is an empty array. This creates **dead code** whenever the upstream use case correctly returns `ok([])` on empty (which it always should — see domain-extraction Step 3c). The `fulfilled` handler will set `status = 'succeeded'` with `data = []`, and the `'empty'` branch is never reached.

**Rules:**
- `AsyncStatus` is **always** `"idle" | "loading" | "succeeded" | "failed"` — never add `"empty"`.
- Empty-state UI detection must be derived in the **presentation layer** from the data field, not from a Redux status value. Generate a derived selector instead:

```ts
// Generated derived selector for empty-state detection (added to generateSelectors.ts output)
// If the data field is an array:
export const select{FieldName}IsEmpty = (state: RootState): boolean =>
  state.{sliceName}.{sliceStatus} === 'succeeded' &&
  Array.isArray(state.{sliceName}.{dataField}) &&
  state.{sliceName}.{dataField}.length === 0;
```

- If the pipeline detects that an upstream use case (from Domain Extraction) was generated with an `err('EMPTY_*')` path for empty collections, add a **FATAL**: `"The use case '{useCaseName}' returns err() for empty data. This means the slice's fulfilled handler will never receive an empty array — it maps to rejected instead. Fix the use case to return ok([]) for empty collections, then re-run this skill."`
- **Never generate** a `case 'empty':` branch, an `'empty'` initialValue, or any reducer logic that sets `status = 'empty'`. If such code already exists in the target slice file, flag it as dead code with a WARN: `"Status value 'empty' in '{sliceName}' slice is dead code. The upstream use case never fulfills with empty data — it rejects instead. Either fix the use case (preferred) or remove the 'empty' branch and derive empty-state from the data selector."`

---

## Step 5 — Generate Selectors

Create a typed selector file for every field in the slice state. Selectors are the only permitted way for the presentation layer to read state — direct `state.featureName.field` access in components is forbidden.

```ts
// redux-state-generator/generateSelectors.ts

export interface GeneratedSelector {
  name: string;           // e.g. "selectProducts", "selectFetchProductsStatus"
  returnType: string;
  stateField: string;     // path into the slice state
  isAsyncStatus: boolean;
  isAsyncError: boolean;
}

export function generateSelectorsFile(
  sliceName: string,
  stateShape: SliceStateShape,
  featureName: string,
  basePath: string
): GeneratedFile {
  const rootSelector = `(state: RootState) => state.${sliceName}`;

  const selectors = stateShape.fields.map((field) => {
    const selectorName = `select${toPascalCase(field.name)}`;
    return {
      name: selectorName,
      returnType: field.type,
      stateField: field.name,
      isAsyncStatus: field.name.endsWith("Status"),
      isAsyncError: field.name.endsWith("Error"),
    };
  });

  const selectorLines = selectors
    .map((s) => `export const ${s.name} = (state: RootState): ${s.returnType} => state.${sliceName}.${s.stateField};`)
    .join("\n");

  // Generate derived convenience selectors for async fields
  const asyncFields = stateShape.fields.filter((f) => f.isAsyncData && f.asyncMeta);
  const derivedSelectors = asyncFields.map((f) => {
    const prefix = toPascalCase(f.name);
    return [
      `export const select${prefix}IsLoading = (state: RootState): boolean => state.${sliceName}.${f.asyncMeta!.statusField} === 'loading';`,
      `export const select${prefix}HasError  = (state: RootState): boolean => state.${sliceName}.${f.asyncMeta!.statusField} === 'failed';`,
      `export const select${prefix}IsIdle    = (state: RootState): boolean => state.${sliceName}.${f.asyncMeta!.statusField} === 'idle';`,
    ].join("\n");
  }).join("\n\n");

  return {
    outputPath: `${basePath}/features/${featureName}/state/selectors/${toCamelCase(featureName)}Selectors.ts`,
    fileContent: `import type { RootState } from '../../../shared/store/rootReducer';

${selectorLines}

// Derived convenience selectors
${derivedSelectors}
`,
  };
}
```

**Quality checks:**
- Every field in the state interface has at least one selector — there must be no orphaned state fields
- Async fields get both a raw status selector (`selectFetchProductsStatus`) and three derived boolean selectors (`selectFetchProductsIsLoading`, `selectFetchProductsHasError`, `selectFetchProductsIsIdle`)
- Selectors are plain functions — no `createSelector` (reselect) memoization is added unless the caller explicitly requests it, to avoid introducing an undeclared dependency
- `RootState` is imported from a shared store location — the selector file never declares or re-exports `RootState`

---

## Step 6 — Detect Race Conditions and Concurrent Thunk Issues

Flag patterns that are known to cause race conditions in Redux Toolkit async thunks.

```ts
// redux-state-generator/detectRaceConditions.ts

export function detectRaceConditionRisks(
  thunks: GeneratedThunk[],
  stateShape: SliceStateShape
): Violation[] {
  const violations: Violation[] = [];

  for (const thunk of thunks) {
    const meta = stateShape.fields.find((f) => f.asyncMeta?.linkedThunk === thunk.name)?.asyncMeta;
    if (!meta) continue;

    // 1. If a thunk is dispatched while already loading — stale update risk
    violations.push({
      severity: "WARN",
      message: `Thunk '${thunk.name}': if dispatched while '${meta.statusField}' is 'loading', the previous result may be overwritten by a stale response. Consider using 'condition' option in createAsyncThunk to abort if already loading, or use RTK Query for request deduplication.`,
    });

    // 2. Multiple thunks writing to the same data field
    const conflictingThunks = thunks.filter(
      (t) => t.name !== thunk.name &&
      stateShape.fields.find((f) => f.asyncMeta?.linkedThunk === t.name)?.asyncMeta?.dataField === meta.dataField
    );
    for (const conflict of conflictingThunks) {
      violations.push({
        severity: "WARN",
        message: `Thunks '${thunk.name}' and '${conflict.name}' both write to state field '${meta.dataField}'. Last-write-wins semantics may cause inconsistent UI if both are in-flight simultaneously.`,
      });
    }
  }

  return violations;
}
```

**Rule:** Race condition warnings are always WARN — they do not block generation. They are surfaced so the developer can decide whether to add the `condition` abort guard or migrate to RTK Query.

---

## Step 7 — Generate the ThunkExtra Interface

The `ThunkExtra` interface is a shared contract that injects use case instances into all thunks. It must declare every use case that any thunk in the feature depends on.

```ts
// redux-state-generator/generateThunkExtra.ts

export function generateThunkExtraInterface(
  useCases: ExtractedUseCase[],
  basePath: string
): GeneratedFile {
  const useCaseImports = useCases
    .map((uc) => `import type { ${uc.name} } from '../../domain/usecases/${uc.name}';`)
    .join("\n");

  const useCaseFields = useCases
    .map((uc) => `  ${toCamelCase(uc.name)}: ${uc.name};`)
    .join("\n");

  return {
    outputPath: `${basePath}/shared/store/thunkExtra.ts`,
    fileContent: `${useCaseImports}

/**
 * ThunkExtra is injected into every createAsyncThunk via the Redux store's extra argument.
 * It provides use case instances to thunks without coupling thunks to concrete implementations.
 */
export interface ThunkExtra {
${useCaseFields}
}
`,
  };
}
```

**Quality check:** `ThunkExtra` imports use case types only — never repository implementations, data source classes, or Axios. The concrete wiring of `ThunkExtra` (injecting real implementations) is the responsibility of the store configuration, not this skill.

**Rule — canonical DI entrypoint:** Thunks receive use case instances exclusively via `ThunkExtra` injected through the Redux store's `extra` argument. The store is configured by calling `create{Feature}ThunkExtra()` from `features/{feature}/diBootstrap.ts` (generated by the Dependency Injector skill). **Never import from a `di/container.ts` singleton file.** If a `di/container.ts` file exists in the feature folder, it is dead code — flag it with a WARN: `"'di/container.ts' is not the canonical DI entrypoint. Thunks must receive use cases via ThunkExtra from the store's extra argument (wired through 'diBootstrap.ts'). Remove 'di/container.ts' to avoid confusion."` The only permitted import pattern for use cases inside thunk files is: `extra.{useCaseVar}.execute(...)` — never a direct import of any concrete class.

---

## Step 8 — Validate the State Layer

Run cross-reference and serializability validation across all generated state artefacts before returning.

```ts
// redux-state-generator/validateStateLayer.ts

// Patterns that indicate non-serializable values being stored in state
const NON_SERIALIZABLE_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /:\s*Error\b/,             description: "Error class instance" },
  { pattern: /:\s*Date\b/,              description: "Date class instance" },
  { pattern: /:\s*Map<|:\s*Set</,       description: "Map or Set instance" },
  { pattern: /:\s*\(\s*\)\s*=>/,        description: "Function reference" },
  { pattern: /:\s*Promise</,             description: "Promise" },
  { pattern: /:\s*\w+\[\]\s*\|\s*null/, description: "potential class array" },
];

export function validateStateLayer(
  stateShape: SliceStateShape,
  thunks: GeneratedThunk[],
  sliceFile: GeneratedFile,
  selectorsFile: GeneratedFile
): Violation[] {
  const violations: Violation[] = [];

  // 1. Check for non-serializable types in state interface
  for (const field of stateShape.fields) {
    for (const { pattern, description } of NON_SERIALIZABLE_PATTERNS) {
      if (pattern.test(field.type)) {
        violations.push({
          severity: "WARN",
          message: `State field '${field.name}' has type '${field.type}' which may be non-serializable (${description}). Redux Toolkit's serializability middleware will warn at runtime. Use a plain serializable type instead.`,
        });
      }
    }
  }

  // 2. Every thunk must have pending/fulfilled/rejected cases in the slice
  for (const thunk of thunks) {
    const hasPending   = sliceFile.fileContent.includes(`${thunk.name}.pending`);
    const hasFulfilled = sliceFile.fileContent.includes(`${thunk.name}.fulfilled`);
    const hasRejected  = sliceFile.fileContent.includes(`${thunk.name}.rejected`);

    if (!hasPending || !hasFulfilled || !hasRejected) {
      const missing = [!hasPending && "pending", !hasFulfilled && "fulfilled", !hasRejected && "rejected"].filter(Boolean);
      violations.push({
        severity: "FATAL",
        message: `Thunk '${thunk.name}' is missing extraReducers cases: [${missing.join(", ")}]. All three cases are required.`,
      });
    }
  }

  // 3. Every state field must have a selector
  for (const field of stateShape.fields) {
    const selectorName = `select${toPascalCase(field.name)}`;
    if (!selectorsFile.fileContent.includes(selectorName)) {
      violations.push({
        severity: "FATAL",
        message: `State field '${field.name}' has no selector '${selectorName}'. Every state field must be accessible via a selector.`,
      });
    }
  }

  // 4. Scan slice and thunk files for forbidden direct API usage
  for (const file of [sliceFile, ...thunks.map((t) => ({ fileContent: t.fileContent }))]) {
    if (/from ['"]axios['"]/.test(file.fileContent)) {
      violations.push({ severity: "FATAL", message: "Axios import detected in state layer. HTTP clients must never be imported in the state layer." });
    }
    if (/from ['"]react-query['"]|from ['"]@tanstack\//.test(file.fileContent)) {
      violations.push({ severity: "FATAL", message: "Data-fetching library detected in state layer. Use createAsyncThunk + use case delegation instead." });
    }
    if (/\.fetchData\(|\.getData\(|\.post\(|\.get\(/.test(file.fileContent)) {
      violations.push({ severity: "WARN", message: "Possible direct data source call detected in state layer. Thunks must delegate to use cases only." });
    }
  }

  return violations;
}
```

Run through this checklist before returning:

- [ ] Every async use case has exactly one corresponding thunk
- [ ] Every thunk has `pending`, `fulfilled`, and `rejected` cases in `extraReducers`
- [ ] Every state field has a corresponding selector in the selectors file
- [ ] No state field type is `Error`, `Date`, `Map`, `Set`, `Function`, or `Promise`
- [ ] `rejectWithValue` in every thunk accepts a `string`, not a class instance
- [ ] No thunk file contains `import axios` or any HTTP client import
- [ ] No thunk body contains a direct API call (`.get(`, `.post(`, `fetch(`, `axios.`)
- [ ] All thunk definitions are co-located inside `*Slice.ts` — no standalone `*Thunks.ts` files generated
- [ ] `AsyncStatus` union never includes `"empty"` — empty-state detection is a derived presentation selector
- [ ] `ThunkExtra` interface is generated and imports use case types only
- [ ] No `di/container.ts` import in any thunk file — use case access is exclusively via `extra.{useCaseVar}.execute()`
- [ ] No React, ReactNative, or UI framework imports in any state layer file
- [ ] Race condition WARNs emitted for every thunk (Step 6 — advisory, blocking only if FATAL)
- [ ] `violations[]` contains no `FATAL` entries before returning

---

## Step 9b — Generate Presentation Layer Custom Hooks

Generate a custom hook file in the **presentation layer** (`features/{feature}/presentation/hooks/`) for each screen or component that accesses state. These hooks encapsulate `useAppSelector` and `useAppDispatch` calls — presentation components must never import from the state layer directly.

```ts
// redux-state-generator/generatePresentationHooks.ts

export function generatePresentationHooksFile(
  featureName: string,
  stateShape: SliceStateShape,
  thunks: GeneratedThunk[],
  basePath: string
): GeneratedFile {
  const hookName = `use${toPascalCase(featureName)}State`;

  const selectorLines = stateShape.fields
    .filter((f) => f.isAsyncData)
    .flatMap((f) => [
      `  const ${f.name} = useAppSelector(select${toPascalCase(f.name)});`,
      `  const ${f.asyncMeta!.statusField} = useAppSelector(select${toPascalCase(f.asyncMeta!.statusField)});`,
      `  const ${f.asyncMeta!.errorField} = useAppSelector(select${toPascalCase(f.asyncMeta!.errorField)});`,
    ]);

  const dispatchLines = thunks.map(
    (t) => `  const dispatch${toPascalCase(t.name.replace('Thunk', ''))} = useCallback(\n    (${t.argType !== "void" ? `arg: ${t.argType}` : ""}) => dispatch(${t.name}(${t.argType !== "void" ? "arg" : ""})),\n    [dispatch]\n  );`
  );

  const returnFields = [
    ...stateShape.fields.filter((f) => f.isAsyncData).flatMap((f) => [f.name, f.asyncMeta!.statusField, f.asyncMeta!.errorField]),
    ...thunks.map((t) => `dispatch${toPascalCase(t.name.replace('Thunk', ''))}`),
  ];

  return {
    outputPath: `${basePath}/features/${featureName}/presentation/hooks/${hookName}.ts`,
    fileContent: `import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../app/state/hooks';
${stateShape.fields.filter((f) => f.isAsyncData).map((f) => `import { select${toPascalCase(f.name)}, select${toPascalCase(f.asyncMeta!.statusField)}, select${toPascalCase(f.asyncMeta!.errorField)} } from '../../state/selectors/${toCamelCase(featureName)}Selectors';`).join('\n')}
${thunks.map((t) => `import { ${t.name} } from '../../state';`).join('\n')}

/**
 * ${hookName} — canonical presentation hook for ${featureName} state access.
 * Components must import from this hook, NOT from the state layer directly.
 */
export function ${hookName}() {
  const dispatch = useAppDispatch();

${selectorLines.join('\n')}

${dispatchLines.join('\n\n')}

  return {
    ${returnFields.join(',\n    ')},
  };
}
`,
  };
}
```

**Rules:**
- This hook lives in `presentation/hooks/` — never in `state/` — because it ties Redux state to React/RN hooks, which are presentation-layer concerns.
- All `useCallback` wrappers include `[dispatch]` in the dependency array — `dispatch` is stable across renders (Redux guarantees this), so this is the correct minimal dep array.
- Components that need state access must import from this hook (e.g. `use${FeatureName}State()`), not from selectors or thunks directly. This enforces a single point of access.
- If the feature has multiple distinct screens with different state access patterns, generate one hook per screen: `use${ScreenName}State.ts` — not one mega-hook that all screens import.
- The hook must not import from the data layer or domain layer — it is a pure presentation-state bridge.

---

## Step 9 — Generate the State Layer Index Barrel

Export the slice reducer, all action creators, all selectors, and all thunks from a single `index.ts`.

```ts
// redux-state-generator/generateStateIndex.ts

export function generateStateIndex(
  featureName: string,
  sliceName: string,
  thunks: GeneratedThunk[],
  syncActionNames: string[],
  basePath: string
): GeneratedFile {
  const thunkExports   = thunks.map((t) => `export { ${t.name} } from './store/${t.name}';`).join("\n");
  const selectorExport = `export * from './selectors/${toCamelCase(featureName)}Selectors';`;
  const reducerExport  = `export { default as ${toCamelCase(featureName)}Reducer } from './store/${toCamelCase(featureName)}Slice';`;
  const actionExports  = syncActionNames.length
    ? `export { ${syncActionNames.join(", ")} } from './store/${toCamelCase(featureName)}Slice';`
    : "";

  return {
    outputPath: `${basePath}/features/${featureName}/state/index.ts`,
    fileContent: `// State Layer — public API\n// Import thunks, selectors, actions, and the reducer from this file only.\n\n${reducerExport}\n${actionExports ? actionExports + "\n" : ""}${thunkExports}\n${selectorExport}\n`,
  };
}
```

---

## File Layout Reference

```
redux-state-generator/
├── index.ts                          ← Orchestrator: runs steps 1–9b in order
├── designSliceState.ts               ← Step 2: use cases + requirements → SliceStateShape
├── generateThunks.ts                 ← Step 3: use case → createAsyncThunk (co-located in slice)
├── generateSlice.ts                  ← Step 4: createSlice + co-located thunks + extraReducers
├── generateSelectors.ts              ← Step 5: typed selectors + derived boolean selectors
├── detectRaceConditions.ts           ← Step 6: concurrent thunk risk warnings
├── generateThunkExtra.ts             ← Step 7: ThunkExtra interface for use case injection
├── validateStateLayer.ts             ← Step 8: serializability + completeness validation
├── generateStateIndex.ts             ← Step 9: state/index.ts barrel
├── generatePresentationHooks.ts      ← Step 9b: presentation/hooks/ custom hook per screen
├── errors.ts                         ← StateGeneratorFatalError, Violation types
└── __tests__/
    ├── designSliceState.test.ts
    ├── generateThunks.test.ts
    ├── generateSlice.test.ts
    ├── generateSelectors.test.ts
    ├── validateStateLayer.test.ts
    └── generatePresentationHooks.test.ts

Generated output (written to feature folder by caller):
src/features/<name>/state/
├── store/
│   ├── <featureName>Slice.ts    ← slice + ALL thunks co-located here (no standalone *Thunk.ts)
│   └── <FeatureName>State.ts    ← state interface
├── selectors/
│   └── <featureName>Selectors.ts
└── index.ts

src/features/<name>/presentation/
└── hooks/
    └── use<FeatureName>State.ts  ← generated by Step 9b; only entry point for components

src/shared/store/
└── thunkExtra.ts                ← ThunkExtra interface (shared across features)
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Thunks delegate, never fetch | A thunk calls `extra.useCase.execute()` and nothing else — any direct API call in a thunk is a FATAL |
| Three fields per async operation | Every async use case produces exactly `data`, `status`, and `error` state fields — boolean `isLoading` flags are forbidden |
| `AsyncStatus` over booleans | Status is always the three-value `"idle" \| "loading" \| "succeeded" \| "failed"` union — an `"empty"` value is dead code and a FATAL; empty-state detection belongs in a derived presentation selector |
| Serializable state always | `Error`, `Date`, `Map`, `Set`, and `Function` types in state are always WARNs — RTK's middleware will flag them at runtime |
| `rejectWithValue` is a string | Error payloads are always `string` — never class instances that would fail serializability checks |
| Selectors for every field | Every state field has a typed selector; components never access `state.featureName.field` directly |
| `ThunkExtra` for injection | Use case instances are injected via `ThunkExtra`, not imported directly — this keeps thunks testable with mock use cases |
| All three cases, always | A thunk missing `pending`, `fulfilled`, or `rejected` in `extraReducers` is a FATAL — incomplete case handling leaves the UI in irrecoverable states |
| Co-location mandate | All thunks live inside the slice file (`<featureName>Slice.ts`) — standalone `*Thunks.ts` files are FATAL; they create split ownership of the same async lifecycle |
| No framework imports in state | Importing `react`, `react-native`, or any UI library into a state file is FATAL — state layer must be UI-framework-agnostic |
| No DI container in state | `di/container.ts` must never be imported inside thunks or slice files — use case access is exclusively via `extra.{useCase}` from `ThunkExtra` |
| Presentation hook encapsulation | Components access state only through the generated `use{FeatureName}State()` hook in `presentation/hooks/` — never by importing selectors or thunks directly |
