---
name: final-validator
description: "MUST be used as the last skill in every Flutter-to-React Native conversion pipeline. Use when: a full module conversion has been executed and all 17 upstream skills have run; verifying completeness and correctness of the converted React Native module before it is committed; auditing any partial conversion to surface gaps; generating the mandatory conversion_validation.md report. Keywords: final validator, conversion validation, Flutter to React Native audit, module completeness, API coverage, screen coverage, component coverage, skill checklist, conversion report, pipeline gate, gap analysis, structure comparison."
priority: HIGH
auto-trigger: true
---

# Final Validator — Flutter → React Native Conversion Validator

> This skill is the mandatory last step of every Flutter-to-React Native conversion pipeline. Its sole output is a file named **`conversion_validation.md`**. No conversion is considered complete until that file exists, covers all six required sections, and reports an overall status of ✅. Do NOT assume anything. Every finding must be derived from actual source and converted files — never from inference or placeholder data.

---

## Output Contract

**Single output file:** `conversion_validation.md`

The file must contain exactly six top-level sections in this order:

1. `## Module Structure Comparison`
2. `## Component & Screen Coverage`
3. `## API Coverage`
4. `## Skill Execution Checklist`
5. `## Critical Issues`
6. `## Final Summary`

If any section cannot be completed because input is missing, write the section header followed by an explicit `⚠️ INCOMPLETE — <reason>` block. Never omit a section.

---

## Inputs Required

| Input | Required | Source |
|-------|----------|--------|
| Flutter module source files (`.dart` + folder tree) | ✅ Yes | Original Flutter module |
| Flutter module `README.md` | ✅ Yes | Flutter module root |
| React Native converted module files | ✅ Yes | All 17 upstream skill outputs |
| `api_info.md` | ⚠️ If available | API Integration / API Execution Trace skills |
| Outputs / logs from all 17 conversion skills | ✅ Yes | Pipeline execution context |

**Decision point:**
- If Flutter source files are absent → **FAIL**: `"FATAL: Flutter source module not provided. Cannot perform structure or coverage comparison without the source."`
- If `README.md` is absent → emit `⚠️ WARN` in the Module Structure section and skip Flutter tree extraction from README; fall back to parsing the `.dart` file paths directly.
- If React Native module files are absent → **FAIL**: `"FATAL: React Native converted module not provided. Nothing to validate."`
- If `api_info.md` is absent → the API Coverage section is populated from Flutter source analysis only; mark all API rows as `⚠️ Unverified`.
- If skill logs are absent for any upstream skill → mark that skill's checklist rows as `❓ Unknown — log not available`.

**Rule:** This skill is read-only. It never modifies, rewrites, or auto-fixes any file. It reports — the developer fixes.

---

## Step 1 — Extract Flutter Module Structure

Read the Flutter `README.md` to extract the declared folder tree. If `README.md` is absent or has no tree block, generate the tree by walking the `.dart` file paths in the input.

**Algorithm:**

```
1. Search README.md for a fenced block tagged with `tree`, `bash`, or `` ` ``-fenced directory listing.
2. If found, extract the raw tree text verbatim — do NOT reformat it.
3. If not found, reconstruct the tree from Flutter source file paths:
   - Group paths by their directory prefix.
   - Render as an indented tree, sorted alphabetically per directory level.
4. Store the extracted tree as flutterTree (string).
5. Parse flutterTree to enumerate:
   - flutterScreens[]  — files under screens/, pages/, views/
   - flutterComponents[] — files under widgets/, components/
   - flutterServices[]  — files under services/, repositories/, datasources/
   - flutterModels[]    — files under models/, entities/, dtos/
```

**Do NOT invent paths. Only record paths that are present in actual inputs.**

---

## Step 2 — Generate React Native Module Structure

Walk every file path in the React Native converted module output and render a full directory tree.

**Algorithm:**

```
1. Collect all RN output file paths.
2. Sort paths alphabetically.
3. Render as an indented ASCII tree (use ├──, └──, │   conventions).
4. Store as rnTree (string).
5. Parse rnTree to enumerate:
   - rnScreens[]     — files under screens/, pages/
   - rnComponents[]  — files under components/, widgets/
   - rnServices[]    — files under services/, api/, datasources/
   - rnModels[]      — files under models/, domain/, entities/
```

---

## Step 3 — Validate Component & Screen Coverage

Compare Flutter enumerated lists against React Native lists.

```
For each category (screens, components):
  - Count Flutter items  → flutterCount
  - Count RN items       → rnCount
  - Identify missing     → missingItems = flutterItems NOT present in rnItems
                          (match by normalized name: strip file extension, convert snake_case/PascalCase)
  - Status = ✅ if missingItems is empty, else ❌
```

---

## Step 4 — Validate API Coverage

**Sources to scan for Flutter API calls:**
1. All `.dart` files — search for:
   - `http.get(`, `http.post(`, `http.put(`, `http.delete(`, `http.patch(`
   - `dio.get(`, `dio.post(`, `dio.put(`, `dio.delete(`, `dio.patch(`
   - `client.get(`, `client.post(`, etc.
   - Any string containing `'/api/`, `'/v1/`, `'/v2/` as endpoint literals
2. `api_info.md` — extract all documented endpoints (method + path)

**For each discovered Flutter API call, record:**

```ts
{
  method: "GET | POST | PUT | DELETE | PATCH",
  endpoint: string,          // normalized path, e.g. /users/{id}
  baseUrl: string | null,
  headers: Record<string, string> | null,
  requestBody: object | null,
  queryParams: string[] | null,
}
```

**Validate against React Native:**
- Search all RN data source files (`.ts` files in `datasources/`, `services/`, `api/`) for the same method + endpoint combination.
- For each Flutter API call:
  - `URL Match` = ✅ if exact endpoint path is present in RN code, ⚠️ if partial match (path differs by trailing slash or param name), ❌ if absent.
  - `Status` = ✅ if URL Match is ✅ and method matches, else ❌.

---

## Step 5 — Validate All 17 Skill Executions

For each of the 17 upstream skills, define expected tasks and compare against actual skill log output.

**The 17 Skills (in pipeline execution order):**

| # | Skill Name | Skill ID |
|---|-----------|---------|
| 1 | README / Constitution Reader | `readme-constitution-reader` |
| 2 | Flutter Parser | `flutter-parser` |
| 3 | Flutter → RN Orchestrator | `flutter-rn-orchestrator` |
| 4 | Component Classifier | `component-classifier` |
| 5 | Feature Folder Generator | `feature-folder-generator` |
| 6 | Widget to JSX Converter | `widget-to-jsx-converter` |
| 7 | Layout Converter | `layout-converter` |
| 8 | Styling Converter | `styling-converter` |
| 9 | Navigation Converter | `navigation-converter` |
| 10 | Domain Extraction | `domain-extraction` |
| 11 | Data Layer Builder | `data-layer-builder` |
| 12 | API Integration | `api-integration` |
| 13 | API Execution Trace | `api-execution-trace` |
| 14 | Redux State Generator | `redux-state-generator` |
| 15 | Dependency Injector | `dependency-injector` |
| 16 | TypeScript Enforcer | `typescript-enforcer` |
| 17 | Test Generator | `test-generator` |

**For each skill, check the skill log for evidence that the expected tasks were completed. Mark each task:**
- `[x]` — Evidence found in skill output / generated files
- `[ ] ❌` — No evidence found; task is missing

---

## Step 6 — Aggregate Critical Issues and Final Summary

Collect all ❌ and ⚠️ findings across all sections. Produce the final verdict.

**Overall Status rules:**
- ✅ — All sections pass: no missing screens, no missing APIs, no missing skill tasks, structure matches.
- ⚠️ — Minor gaps only: warnings present but no blocking ❌ items.
- ❌ — One or more ❌ items in any section.

---

## Output Template — `conversion_validation.md`

Generate this file verbatim with all placeholders replaced by actual validated data:

```markdown
# Conversion Validation Report
**Module:** <module-name>
**Date:** <ISO-8601 date>
**Flutter Source:** <source path>
**React Native Output:** <output path>

---

## Module Structure Comparison

### Flutter Module Structure
\`\`\`
<flutterTree — verbatim from README.md or reconstructed from file paths>
\`\`\`

### React Native Module Structure
\`\`\`
<rnTree — generated by walking all RN output file paths>
\`\`\`

---

## Component & Screen Coverage

| Type | Flutter | RN | Status |
|------|--------|----|--------|
| Screens | <count> | <count> | ✅/❌ |
| Components | <count> | <count> | ✅/❌ |

### Missing Screens
<List each missing screen as: - `ScreenName` (Flutter path: `<path>`)>
<Write "None" if no screens are missing>

### Missing Components
<List each missing component as: - `ComponentName` (Flutter path: `<path>`)>
<Write "None" if no components are missing>

---

## API Coverage

| API | Method | Flutter Endpoint | RN Endpoint | URL Match | Status |
|-----|--------|-----------------|-------------|-----------|--------|
<One row per Flutter API call discovered>

### Missing APIs
<List each API absent from RN as: - `METHOD /endpoint` — found in `<flutter file>:<line>`>
<Write "None" if all APIs are present>

### Mismatched APIs
<List each URL mismatch as: - `METHOD /flutter-path` → RN has `METHOD /rn-path` — check path params and trailing slashes>
<Write "None" if no mismatches>

---

## Skill Execution Checklist

### Skill 1: README / Constitution Reader

**Expected:**
- [ ] README.md parsed and module architecture extracted
- [ ] Tech stack identified (state management, routing, HTTP client)
- [ ] Constitution config emitted to pipeline context
- [ ] Folder conventions (usecases casing, layer names) declared

**Status:**
- [x/❌] README.md parsed and module architecture extracted
- [x/❌] Tech stack identified
- [x/❌] Constitution config emitted to pipeline context
- [x/❌] Folder conventions declared

---

### Skill 2: Flutter Parser

**Expected:**
- [ ] All `.dart` files parsed into AST representations
- [ ] Widgets, screens, models, repositories, services enumerated
- [ ] Navigation routes extracted from Navigator/GoRouter calls
- [ ] API call sites extracted (HTTP library, method, endpoint, headers, body)
- [ ] State management pattern identified

**Status:**
- [x/❌] All `.dart` files parsed into AST representations
- [x/❌] Widgets, screens, models, repositories, services enumerated
- [x/❌] Navigation routes extracted
- [x/❌] API call sites extracted
- [x/❌] State management pattern identified

---

### Skill 3: Flutter → RN Orchestrator

**Expected:**
- [ ] Pipeline context initialized with module name, source path, and resolved base URL
- [ ] All 17 skills invoked in strict dependency order
- [ ] Inter-skill artifact boundaries validated at each handoff
- [ ] `stopOnCritical` enforced — pipeline halted on any unresolved CRITICAL failure
- [ ] Final pipeline status emitted as `conversionReport`

**Status:**
- [x/❌] Pipeline context initialized
- [x/❌] All 17 skills invoked in order
- [x/❌] Inter-skill artifact boundaries validated
- [x/❌] `stopOnCritical` enforced
- [x/❌] `conversionReport` emitted

---

### Skill 4: Component Classifier

**Expected:**
- [ ] All Flutter widgets classified by type (screen, reusable component, layout, atomic)
- [ ] Existing RN components catalogued for reuse matching
- [ ] Reuse map generated (`flutterWidgetName → existingRNComponent`)
- [ ] New component generation list produced for widgets with no reuse match

**Status:**
- [x/❌] All Flutter widgets classified
- [x/❌] Existing RN components catalogued
- [x/❌] Reuse map generated
- [x/❌] New component generation list produced

---

### Skill 5: Feature Folder Generator

**Expected:**
- [ ] Feature folder scaffold created with all four layers: `presentation/`, `domain/`, `data/`, `state/`
- [ ] Required sub-folders created per layer (`components/`, `screens/`, `hooks/` in presentation; `models/`, `useCases/`, `interfaces/` in domain; `repositories/`, `datasources/`, `mappers/` in data; `store/`, `selectors/` in state)
- [ ] `index.ts` barrel files created for each layer
- [ ] Folder structure matches constitution-declared conventions

**Status:**
- [x/❌] Feature folder scaffold created with all four layers
- [x/❌] Required sub-folders created per layer
- [x/❌] `index.ts` barrel files created
- [x/❌] Folder structure matches constitution conventions

---

### Skill 6: Widget to JSX Converter

**Expected:**
- [ ] Every Flutter widget converted to a functional React Native component (no class components)
- [ ] Dart-specific syntax removed (`BuildContext`, `@override`, `StatefulWidget`, etc.)
- [ ] Props extracted from Flutter widget constructor parameters
- [ ] `useState` / `useEffect` hooks generated for stateful widgets
- [ ] Default export present in every generated `.tsx` file
- [ ] No `.dart` imports remaining in generated files

**Status:**
- [x/❌] Every Flutter widget converted to a functional RN component
- [x/❌] Dart-specific syntax removed
- [x/❌] Props extracted from constructor parameters
- [x/❌] Hooks generated for stateful widgets
- [x/❌] Default export present in every `.tsx` file
- [x/❌] No `.dart` imports remaining

---

### Skill 7: Layout Converter

**Expected:**
- [ ] Flutter `Column` → RN `View` with `flexDirection: 'column'`
- [ ] Flutter `Row` → RN `View` with `flexDirection: 'row'`
- [ ] Flutter `Stack` → RN `View` with `position: 'relative'` children
- [ ] Flutter `Expanded` / `Flexible` → RN `flex` prop
- [ ] Flutter `Padding` → RN `padding` style prop (not a wrapper component)
- [ ] Flutter `SizedBox` → RN `View` with explicit `width`/`height`
- [ ] Flutter `ListView` / `GridView` → RN `FlatList` / `SectionList`
- [ ] Flutter `SingleChildScrollView` → RN `ScrollView`

**Status:**
- [x/❌] Column/Row/Stack layout mappings applied
- [x/❌] Expanded/Flexible → flex prop conversion applied
- [x/❌] Padding wrapper → style prop conversion applied
- [x/❌] SizedBox → View with dimensions applied
- [x/❌] ListView/GridView → FlatList/SectionList applied
- [x/❌] SingleChildScrollView → ScrollView applied

---

### Skill 8: Styling Converter

**Expected:**
- [ ] Flutter theme colors mapped to RN design tokens (no raw hex values in StyleSheet blocks)
- [ ] Flutter `TextStyle` properties mapped to RN `Text` style props
- [ ] Flutter `BoxDecoration` mapped to RN `View` style (`borderRadius`, `backgroundColor`, `borderWidth`, etc.)
- [ ] All spacing values sourced from token constants (no magic numbers)
- [ ] `StyleSheet.create()` used for all style definitions (no inline style object literals)
- [ ] Flutter `Color(0xFFxxxxxx)` values replaced with token references

**Status:**
- [x/❌] Flutter theme colors mapped to design tokens
- [x/❌] TextStyle → RN Text style props applied
- [x/❌] BoxDecoration → View style props applied
- [x/❌] Spacing values sourced from tokens
- [x/❌] `StyleSheet.create()` used throughout
- [x/❌] Flutter Color int literals removed

---

### Skill 9: Navigation Converter

**Expected:**
- [ ] `RootStackParamList` type declared with all screen route names
- [ ] Every screen registered in the navigator (`Stack.Screen` / `Tab.Screen`)
- [ ] `NavigationContainer` appears exactly once (in `AppNavigator.tsx`)
- [ ] Flutter `Navigator.push` / `pop` calls replaced with `navigation.navigate()` / `navigation.goBack()`
- [ ] Flutter bottom navigation tabs mapped to React Navigation tab navigator
- [ ] Deep link configuration generated if Flutter had route names

**Status:**
- [x/❌] `RootStackParamList` declared with all screen routes
- [x/❌] Every screen registered in navigator
- [x/❌] `NavigationContainer` appears exactly once
- [x/❌] Flutter Navigator calls replaced with RN navigation calls
- [x/❌] Tab navigation mapped
- [x/❌] Deep link configuration generated (if applicable)

---

### Skill 10: Domain Extraction

**Expected:**
- [ ] Flutter model classes converted to TypeScript interfaces / types (no classes with business logic in domain)
- [ ] Domain use case classes generated (one use case per Flutter service method or BLoC event)
- [ ] Domain repository interfaces declared (no concrete implementations in domain layer)
- [ ] Domain layer has zero imports from `react`, `react-native`, `axios`, `redux`, or any UI/HTTP framework
- [ ] `domain/index.ts` exports models, interfaces, and use cases only

**Status:**
- [x/❌] Flutter model classes → TypeScript interfaces
- [x/❌] Use case classes generated
- [x/❌] Repository interfaces declared
- [x/❌] Domain layer has zero framework imports
- [x/❌] `domain/index.ts` exports correct items

---

### Skill 11: Data Layer Builder

**Expected:**
- [ ] Repository implementations generated — each `implements` its domain interface
- [ ] DTO types declared in `datasources/` only (no DTOs in domain or presentation)
- [ ] Mapper functions generated for every DTO → domain model conversion
- [ ] Data source classes inject `apiClient` (not `axios` directly)
- [ ] `AxiosResponse<T>` never crosses the data/domain boundary (unwrapped in data source)
- [ ] `data/index.ts` exports repository implementations only (no DTOs, no mappers, no data sources)

**Status:**
- [x/❌] Repository implementations generated with `implements`
- [x/❌] DTO types scoped to `datasources/`
- [x/❌] Mapper functions generated for every DTO → model
- [x/❌] Data sources inject `apiClient`
- [x/❌] `AxiosResponse` unwrapped in data sources
- [x/❌] `data/index.ts` exports only repository implementations

---

### Skill 12: API Integration

**Expected:**
- [ ] Single shared `apiClient` Axios instance created in `shared/api/apiClient.ts`
- [ ] Base URL sourced from `process.env.API_BASE_URL` (not hard-coded)
- [ ] Request interceptor injects auth token from storage
- [ ] Response interceptor handles 401 token refresh (if `tokenRefreshEndpoint` is declared)
- [ ] Response interceptor normalizes error shape across all endpoints
- [ ] `.env.example` generated with `API_BASE_URL` placeholder
- [ ] No `axios.create()` or `fetch()` calls anywhere outside `apiClient.ts`

**Status:**
- [x/❌] Single shared `apiClient` created in `shared/api/apiClient.ts`
- [x/❌] Base URL from env variable
- [x/❌] Request interceptor injects auth token
- [x/❌] Response interceptor handles 401 refresh
- [x/❌] Error shape normalization applied
- [x/❌] `.env.example` generated
- [x/❌] No rogue `axios.create()` or `fetch()` calls

---

### Skill 13: API Execution Trace

**Expected:**
- [ ] Every Flutter API call site traced and logged (file, line, method, endpoint, headers, body, params)
- [ ] Execution trace mapped to generated RN data source method (1:1 or documented N:1)
- [ ] Discrepancy log produced for any Flutter call that has no RN counterpart
- [ ] `api_info.md` produced or updated with all discovered endpoints
- [ ] All FATAL discrepancies (missing endpoints, wrong methods) surfaced in pipeline log

**Status:**
- [x/❌] Every Flutter API call site traced and logged
- [x/❌] Execution trace mapped to RN data source methods
- [x/❌] Discrepancy log produced
- [x/❌] `api_info.md` produced / updated
- [x/❌] FATAL discrepancies surfaced

---

### Skill 14: Redux State Generator

**Expected:**
- [ ] One Redux slice generated per Flutter BLoC / ChangeNotifier / Cubit / Provider
- [ ] Slice state interface defined with `status: 'idle' | 'loading' | 'succeeded' | 'failed'` and `error: string | null`
- [ ] `createAsyncThunk` generated for each async operation — thunk delegates to `extra.<useCase>.execute()`
- [ ] `extraReducers` handles `pending`, `fulfilled`, and `rejected` for every thunk
- [ ] No `axios` / `fetch` calls inside thunks
- [ ] Selectors generated for all state fields
- [ ] Slice and thunks co-located in `*Slice.ts` (no standalone `*Thunks.ts` files)

**Status:**
- [x/❌] One Redux slice per Flutter state manager
- [x/❌] Slice state interface with status + error fields
- [x/❌] `createAsyncThunk` delegates to use case
- [x/❌] `extraReducers` has pending/fulfilled/rejected for every thunk
- [x/❌] No HTTP calls in thunks
- [x/❌] Selectors generated for all state fields
- [x/❌] Thunks co-located in slice file

---

### Skill 15: Dependency Injector

**Expected:**
- [ ] `diBootstrap.ts` created in the feature root
- [ ] `create<Feature>ThunkExtra()` factory function exported from `diBootstrap.ts`
- [ ] Every use case instantiated with its concrete repository implementation injected
- [ ] `storeWiring.snippet.ts` generated with manual integration instructions (store.ts, navigator, tab config)
- [ ] No concrete implementations imported directly in presentation or state layers (only interfaces / use cases)

**Status:**
- [x/❌] `diBootstrap.ts` created in feature root
- [x/❌] `create<Feature>ThunkExtra()` exported
- [x/❌] Every use case instantiated with injected repository
- [x/❌] `storeWiring.snippet.ts` generated
- [x/❌] No concrete implementations leaked into presentation/state

---

### Skill 16: TypeScript Enforcer

**Expected:**
- [ ] All generated files use strict TypeScript (`strict: true` compatible — no `any` without explicit justification)
- [ ] Every function has explicit return type annotations
- [ ] No `@ts-ignore` or `@ts-expect-error` comments in generated files
- [ ] All interface and type names follow PascalCase
- [ ] No implicit `any` from untyped function parameters
- [ ] No `Object` type used — replaced with specific interfaces or `Record<K, V>`

**Status:**
- [x/❌] No `any` types without explicit justification
- [x/❌] Every function has explicit return type
- [x/❌] No `@ts-ignore` / `@ts-expect-error` in generated files
- [x/❌] Interface/type names follow PascalCase
- [x/❌] No implicit `any` from untyped parameters
- [x/❌] No `Object` type used

---

### Skill 17: Test Generator

**Expected:**
- [ ] Unit tests generated for every domain use case
- [ ] Unit tests generated for every Redux slice (initial state, pending, fulfilled, rejected)
- [ ] Unit tests generated for every repository implementation (mocked data source)
- [ ] Component rendering tests generated for screens and key reusable components
- [ ] All tests use the project's declared test framework (Jest + React Native Testing Library)
- [ ] No real API calls in tests — all data sources mocked

**Status:**
- [x/❌] Use case unit tests generated
- [x/❌] Redux slice unit tests generated
- [x/❌] Repository unit tests generated
- [x/❌] Component rendering tests generated
- [x/❌] Correct test framework used
- [x/❌] All data sources mocked

---

## Critical Issues

<List every ❌ finding from all sections above, grouped by category. Example format:>

### Missing Screens
- `LoginScreen` — present in Flutter (`lib/screens/login_screen.dart`), absent from React Native output

### Missing APIs
- `POST /auth/refresh` — called in `AuthService.dart:42`, no matching RN data source method found

### Incomplete Skill Executions
- Skill 14 (Redux State Generator): `extraReducers` missing `rejected` case for `fetchUserThunk`

### Structural Gaps
- `domain/` layer is absent from the RN module — Domain Extraction skill output not found

<Write "None — all checks passed." if there are no critical issues.>

---

## Final Summary

| Category | Status |
|----------|--------|
| Module Structure | ✅/❌ |
| Screens | ✅/❌ |
| Components | ✅/❌ |
| APIs | ✅/❌ |
| Skill Executions (17/17) | ✅/⚠️/❌ |

**Overall Status: ✅ / ⚠️ / ❌**

> ✅ Conversion is complete. All screens, components, APIs, and skill tasks are accounted for.
> ⚠️ Conversion has warnings. Review ⚠️ items before committing.
> ❌ Conversion has blocking gaps. Resolve all ❌ items and re-run this skill before committing.
```

---

## Strict Validation Rules

| Rule | Enforcement |
|------|------------|
| Never assume a screen exists | Count only files actually present in RN output |
| Never assume an API is covered | Match only on method + endpoint path found in actual RN code |
| Never summarize without evidence | Every ❌ must cite the Flutter source file and line where the item was found |
| Never skip a skill row | All 17 skills must appear in the checklist, even if their log is missing |
| Missing log = unknown, not passing | A skill with no log entry is marked `❓ Unknown` — never `[x]` |
| Structure trees must be real | Both trees must reflect actual files — no placeholder or example paths |
| One output file only | This skill produces exactly `conversion_validation.md` and nothing else |
| Read-only | This skill never modifies source or converted files — it audits and reports |

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Actual data only | Every count, path, and finding derives from real input files — never from assumption |
| Strict coverage | A conversion is complete only when screens, components, APIs, and all 17 skill tasks are accounted for |
| No silent omissions | Missing items are always listed explicitly — a blank "Missing" section must say "None" |
| Overall status is binary | ✅ requires zero ❌ items across all sections; a single ❌ sets overall status to ❌ |
| Warnings do not block | ⚠️ items set overall status to ⚠️ only if no ❌ items exist |
| Output is developer-readable | Tables, checklists, and tree blocks — no prose summaries that obscure gaps |

