---
name: domain-extraction
description: "MUST be used whenever business logic needs to be extracted into a pure TypeScript domain layer following clean architecture. Use when: isolating entities, use cases, and repository interfaces from Flutter domain classes or mixed UI+logic code; creating the domain layer of a new feature after the Feature Folder Generator has scaffolded the structure; verifying that an existing domain layer contains no framework dependencies; removing React, Axios, Redux, or any UI/infrastructure imports from business logic. Keywords: domain layer, clean architecture, entities, use cases, repository interfaces, pure typescript, business logic extraction, zero dependency, domain model, flutter migration."
priority: HIGH
auto-trigger: true
---

# Domain Extraction

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

> Trigger this skill **after** the Component Classifier has identified domain-layer methods and models, and **after** the Feature Folder Generator has created the `domain/` folder. This skill writes to `features/<name>/domain/` only. It must never import from, reference, or generate code that depends on React, React Native, Axios, Redux, any state management library, or any UI framework.

## The Zero-Dependency Rule

The domain layer is the innermost ring of clean architecture. It must be completely framework-agnostic:

- **No React / React Native** — the domain layer has no knowledge of components, hooks, or the render cycle
- **No Axios / Fetch / HTTP clients** — the domain layer defines *what* data it needs via repository interfaces; it never fetches it
- **No Redux / Zustand / MobX** — the domain layer contains pure business logic; state management is an infrastructure concern
- **No platform APIs** — `AsyncStorage`, `NativeModules`, file system, and device APIs are infrastructure, not domain

Violation of any of these rules is a **FATAL** that halts the skill. The domain layer is the last line of defense against framework coupling — if it is contaminated, no amount of clean architecture elsewhere can compensate.

---

## Step 1 — Receive and Validate Input

Accept the classified domain-layer artefacts from the Component Classifier and verify they are free of framework contamination before extraction begins.

**Input schema:**

```json
{
  "businessLogic": [
    {
      "methodNode": {
        "name": "string",
        "returnType": "string",
        "parameters": ["string"],
        "isAsync": false,
        "body": "string",
        "startLine": 0,
        "endLine": 0
      },
      "assignedLayer": "domain",
      "signals": ["string"],
      "violations": []
    }
  ],
  "models": [
    {
      "modelNode": {
        "name": "string",
        "fields": [
          { "name": "string", "type": "string", "isRequired": true, "isNullable": false }
        ],
        "hasFromJson": false,
        "hasToJson": false,
        "isFreezed": false
      },
      "assignedLayer": "domain",
      "reason": "string",
      "violations": []
    }
  ],
  "featureName": "string"
}
```

**Decision point:**
- If `businessLogic` and `models` are both empty → **FAIL**: `"FATAL: Both 'businessLogic' and 'models' are empty. There is no domain content to extract."`
- If any `businessLogic` entry has `assignedLayer` other than `"domain"` → **FAIL**: `"FATAL: Non-domain components passed to the Domain Extraction skill. Filter to domain-layer entries only."`
- If any `models` entry has `assignedLayer` of `"data"` (i.e. has `fromJson`/`toJson`) → remove it from domain extraction, add a WARN: `"Model '{name}' has JSON serialization and belongs in the data layer, not domain. Excluded from domain extraction."`
- If `featureName` is missing → **FAIL**: `"FATAL: 'featureName' is required to determine output paths."`

**Rule:** This skill never reads source files from disk, never invokes the Flutter Parser, and never reclassifies components. It works exclusively from the artefacts it receives.

---

## Step 1b — Load and Apply GSD Domain Concerns

If the `constitutionConfig` (passed via pipeline context) contains a non-empty `concerns[]` array, filter for concerns that affect the domain layer. These concerns represent anti-patterns found in the Flutter codebase that must NOT be replicated in the extracted domain layer.

```ts
// domain-extraction/loadDomainConcerns.ts
import type { CodebaseConcern } from "../constitution-reader/extractConcerns";

export function loadDomainConcerns(config: ConstitutionConfig): CodebaseConcern[] {
  const concerns = config.concerns ?? [];
  return concerns.filter((c) => c.affectedLayers.includes("domain"));
}
```

**Decision point:**
- If `config.concerns` is empty → emit INFO: `"No GSD concerns loaded for domain layer. Extraction proceeds with standard rules only."` Continue normally.
- If domain concerns are found → emit INFO: `"Loaded {count} GSD concerns affecting the domain layer. Anti-patterns will be actively checked during entity, use case, and policy extraction."`

**Application rules — apply to Steps 2, 2b, 2c, and 3 below:**
- Before extracting each entity, value object, policy, or use case, check if the source class/method matches any domain concern's anti-pattern description.
- If a match is found:
  - If concern severity is `CRITICAL` → add a FATAL violation: `"GSD CONCERN '{concern.title}': Source class '{className}' matches a CRITICAL anti-pattern flagged in CONCERNS.md. This pattern must NOT be replicated. Recommendation: {concern.recommendation}"`
  - If concern severity is `HIGH` → add a WARN violation with the same format but allow extraction to proceed with the concern's recommendation applied.
  - If concern severity is `MEDIUM` or `LOW` → add an INFO-level note in the generated file as a comment: `// NOTE [GSD-CONCERN]: {concern.title} — {concern.recommendation}`
- Common domain-layer concerns to watch for:
  - **God-class entities** — a single entity with 20+ fields suggests it should be decomposed
  - **Business logic in data models** — methods in a model that should be in a use case
  - **Missing repository interfaces** — use cases calling concrete data sources instead of interfaces
  - **Framework dependencies in domain** — any React, HTTP, or state management imports in domain code

---

## Step 2 — Extract Entities

Entities are pure data structures representing domain concepts. They have no serialization logic, no HTTP concerns, and no UI bindings.

```ts
// domain-extraction/extractEntities.ts

export interface EntityField {
  name: string;
  type: string;            // TypeScript type, e.g. "string", "number", "boolean", "Date"
  isRequired: boolean;
  isNullable: boolean;
  isReadonly: boolean;     // true for identifier fields (id, uuid, createdAt)
}

export interface ExtractedEntity {
  name: string;            // PascalCase, e.g. "Product", "UserProfile"
  fields: EntityField[];
  outputPath: string;      // e.g. "src/features/product/domain/models/Product.ts"
  fileContent: string;     // generated TypeScript source
  violations: Violation[];
}

export function extractEntity(
  model: ClassifiedModel,
  featureName: string,
  basePath: string
): ExtractedEntity {
  const violations: Violation[] = [];
  const fields = model.modelNode.fields.map((f) => mapField(f, violations));

  const fileContent = generateEntityFile(model.modelNode.name, fields, violations);

  return {
    name: model.modelNode.name,
    fields,
    outputPath: `${basePath}/features/${featureName}/domain/models/${model.modelNode.name}.ts`,
    fileContent,
    violations,
  };
}

function generateEntityFile(name: string, fields: EntityField[], violations: Violation[]): string {
  const fieldLines = fields.map((f) => {
    const modifier = f.isReadonly ? "readonly " : "";
    const optional = !f.isRequired ? "?" : "";
    const nullable = f.isNullable ? ` | null` : "";
    return `  ${modifier}${f.name}${optional}: ${f.type}${nullable};`;
  });

  return `// Domain entity — no framework dependencies permitted
export interface ${name} {
${fieldLines.join("\n")}
}
`;
}
```

**Quality checks:**
- Entities are generated as TypeScript `interface` declarations — never as classes with constructors, decorators, or method bodies
- Dart types must be mapped to TypeScript equivalents: `String` → `string`, `int`/`double` → `number`, `bool` → `boolean`, `DateTime` → `Date`, `List<T>` → `T[]`, `Map<K,V>` → `Record<K, V>`
- If a Dart type has no TypeScript equivalent → emit the field as `unknown` and add a WARN: `"Field '{name}' on entity '{entity}' has unmappable type '{dartType}'. Emitted as 'unknown'. Review manually."`
- Entity files must not contain any `import` statements — if a field type requires an import → extract that type as a separate entity and add a cross-reference WARN

---

## Step 2b — Extract Value Objects

Value objects are domain concepts that encapsulate both data *and* business behaviour for a self-contained primitive. Unlike entities (which are pure data interfaces), value objects are **classes** with readonly fields and domain methods that enforce invariants or apply formatting logic. Extract a value object whenever a Dart source class or field:
- Represents a quantity that carries business rules (currency, percentage, weight, date range)
- Has formatting logic tightly coupled to its type (e.g. `formatAsCrore()`, `formatAsLakhs()`)
- Enforces range or validity constraints (`amount >= 0`, `percentage between 0–100`)
- Is used as a composite field type on multiple entities

**Examples of value objects to extract:**
- `CurrencyAmount` — holds an amount + currency code + locale-aware formatting methods (`formatAsCrore()`, `formatAsLakhs()`, `toDisplayString()`)
- `Percentage` — holds a numeric percentage, enforces `0.0–100.0`, formats with `%`
- `DateRange` — holds `from` and `to` dates with `contains(date)`, `overlaps(other)` business methods

```ts
// domain-extraction/extractValueObjects.ts

export interface ExtractedValueObject {
  name: string;            // PascalCase, e.g. "CurrencyAmount"
  fields: EntityField[];   // readonly fields
  methods: ValueObjectMethod[];   // domain-behaviour methods
  outputPath: string;
  fileContent: string;
  violations: Violation[];
}

export interface ValueObjectMethod {
  name: string;        // e.g. "formatAsCrore"
  returnType: string;  // e.g. "string"
  body: string;        // implementation derived from Dart source
}

export function extractValueObject(
  sourceClass: ClassNode,
  featureName: string,
  basePath: string
): ExtractedValueObject {
  const violations: Violation[] = [];

  const fields = sourceClass.fields
    .filter((f) => f.isFinal || f.isConst)   // value objects have immutable fields
    .map((f) => mapField(f, violations));

  const methods = sourceClass.methods
    .filter((m) => !m.name.startsWith('_'))  // only public methods
    .map((m) => extractValueObjectMethod(m, violations));

  const fileContent = generateValueObjectFile(sourceClass.name, fields, methods, violations);

  return {
    name: sourceClass.name,
    fields,
    methods,
    outputPath: `${basePath}/features/${featureName}/domain/models/${sourceClass.name}.ts`,
    fileContent,
    violations,
  };
}

function generateValueObjectFile(
  name: string,
  fields: EntityField[],
  methods: ValueObjectMethod[],
  violations: Violation[]
): string {
  const fieldLines = fields.map((f) => `  readonly ${f.name}: ${f.type};`);
  const methodLines = methods.map((m) => `
  ${m.name}(): ${m.returnType} {
    ${m.body}
  }`);

  return `// Value Object — immutable domain type with business behaviour. No framework dependencies.
export class ${name} {
${fieldLines.join("\n")}

  constructor(${fields.map((f) => `${f.name}: ${f.type}`).join(", ")}) {
${fields.map((f) => `    this.${f.name} = ${f.name};`).join("\n")}
  }
${methodLines.join("\n")}
}
`;
}
```

**Quality checks:**
- Value objects are **classes**, not interfaces — they have constructors and methods
- All fields are `readonly` — value objects are immutable
- Value object methods must be pure (no I/O, no side effects, no state mutations)
- If a value object method imports a framework or platform API → **FATAL**: `"Value object '{name}' method '{method}' contains a framework dependency. Value objects must be pure domain logic."`
- A value object must **not** extend or implement any interface that originates outside the domain layer

**Rule — Anti-aggregation:** A file whose purpose is to *aggregate* data from multiple entities purely to build UI payloads (patterns like `PortfolioAggregation.ts`, `HoldingsSummaryAggregator.ts`, `PortfolioSummaryMapper.ts` that are 200+ lines across multiple unrelated entities) is not a domain concern — it is a presentation concern or a data mapper. If a source file with a name matching `*Aggregation*`, `*Aggregator*`, or `*Summary*` that contains **more than one distinct entity type** plus formatting or build methods is detected: emit a FATAL: `"File '{name}' appears to be a presentation-layer aggregation or mega-mapper disguised as domain logic. Decompose it: extract each entity as its own domain model, each formatting behaviour as its own value object, and any multi-entity assembly logic as a presentation-layer view model or data-layer mapper."`

---

## Step 2c — Extract Policy Classes

Policy classes encapsulate access control, eligibility, and business rule enforcement that applies across multiple entities or operations. They are pure domain classes with no UI dependencies and no data-fetching. Extract a policy class whenever a Dart source contains:
- Entitlement or access-gating logic (e.g. `canCreateWatchlist()`, `isPortfolioAccessible()`)
- Business limits and caps (e.g. maximum watchlists per user, minimum holding size)
- Read-only enforcement rules
- Any logic that answers "is this action permitted?" rather than "how do I perform this action?"

```ts
// domain-extraction/extractPolicies.ts

export interface ExtractedPolicy {
  name: string;           // PascalCase + "Policy" suffix, e.g. "WatchlistPolicy"
  methods: PolicyMethod[];
  outputPath: string;
  fileContent: string;
  violations: Violation[];
}

export interface PolicyMethod {
  name: string;       // e.g. "canCreateWatchlist", "isReadOnly"
  params: UseCaseParam[];
  returnType: "boolean" | "Result<void>" | "string";
  rationale: string;  // human-readable business rule description, surfaced as a comment
}

export function extractPolicy(
  sourceClass: ClassNode,
  featureName: string,
  basePath: string
): ExtractedPolicy {
  const violations: Violation[] = [];

  const methods = sourceClass.methods
    .filter((m) => isPolicyMethod(m))
    .map((m) => extractPolicyMethod(m, violations));

  const fileContent = generatePolicyFile(sourceClass.name, methods, violations);

  return {
    name: sourceClass.name,
    methods,
    outputPath: `${basePath}/features/${featureName}/domain/models/${sourceClass.name}.ts`,
    fileContent,
    violations,
  };
}

function generatePolicyFile(
  name: string,
  methods: PolicyMethod[],
  violations: Violation[]
): string {
  const methodBodies = methods.map((m) => {
    const paramList = m.params.map((p) => `${p.name}: ${p.type}`).join(", ");
    return `  /** ${m.rationale} */
  ${m.name}(${paramList}): ${m.returnType} {
    // TODO: implement policy rule
    throw new Error('${name}.${m.name}() not yet implemented');
  }`;
  });

  return `// Policy class — encapsulates business rules and access control.
// No framework dependencies, no I/O.
export class ${name} {
${methodBodies.join("\n\n")}
}
`;
}

function isPolicyMethod(method: MethodNode): boolean {
  const name = method.name.toLowerCase();
  return (
    name.startsWith("can") ||
    name.startsWith("is") ||
    name.startsWith("has") ||
    name.startsWith("allows") ||
    name.startsWith("check") ||
    name.includes("entitlement") ||
    name.includes("eligib") ||
    name.includes("permitted") ||
    name.includes("readonly") ||
    name.includes("limit")
  );
}
```

**Quality checks:**
- Policy class names always end with `Policy` (e.g. `WatchlistPolicy`, `PortfolioEntitlementPolicy`)
- Policy methods return `boolean`, `Result<void>` (for rules that return a reason when violated), or `string` (for business rule explanation) — they never return complex domain entities
- If a policy method contains an API call or attempts to fetch data → **FATAL**: `"Policy method '{name}' in '{policyName}' performs I/O. Policies are pure rule evaluators — they receive all data they need as parameters. Move data fetching to a use case that calls the policy."`
- Policy classes are in `domain/models/` — same folder as entities and value objects

---

## Step 3 — Extract Use Cases

A use case encapsulates a single business operation. Each domain-layer method classified by the Component Classifier becomes exactly one use case class.

```ts
// domain-extraction/extractUseCases.ts

export interface UseCaseParam {
  name: string;
  type: string;
}

export interface ExtractedUseCase {
  name: string;             // PascalCase + "UseCase" suffix, e.g. "FetchProductUseCase"
  methodName: string;       // original Dart method name
  params: UseCaseParam[];
  returnType: string;       // TypeScript return type, wrapped in Promise if async
  isAsync: boolean;
  repositoryDependencies: string[];  // repository interface names this use case calls
  outputPath: string;
  fileContent: string;
  violations: Violation[];
}

export function extractUseCase(
  classified: ClassifiedMethod,
  featureName: string,
  basePath: string
): ExtractedUseCase {
  const violations: Violation[] = [];
  const name = toUseCaseName(classified.methodNode.name); // e.g. "fetchProduct" → "FetchProductUseCase"

  // Detect repository references within the method body
  const repositoryDependencies = detectRepositoryReferences(classified.methodNode.body, violations);

  // Scan for forbidden imports in the method body
  scanForForbiddenDependencies(classified.methodNode.body, violations);

  const params = classified.methodNode.parameters.map(parseParam);
  const returnType = mapReturnType(classified.methodNode.returnType, classified.methodNode.isAsync);

  const fileContent = generateUseCaseFile(name, params, returnType, classified.methodNode.isAsync, repositoryDependencies, violations);

  return {
    name,
    methodName: classified.methodNode.name,
    params,
    returnType,
    isAsync: classified.methodNode.isAsync,
    repositoryDependencies,
    outputPath: `${basePath}/features/${featureName}/domain/usecases/${name}.ts`,
    fileContent,
    violations,
  };
}

function generateUseCaseFile(
  name: string,
  params: UseCaseParam[],
  returnType: string,
  isAsync: boolean,
  deps: string[],
  violations: Violation[]
): string {
  const depImports = deps
    .map((d) => `import type { ${d} } from '../interfaces/${d}';`)
    .join("\n");

  const paramList = params.map((p) => `${p.name}: ${p.type}`).join(", ");
  const asyncKeyword = isAsync ? "async " : "";
  const awaitOrReturn = isAsync ? "return await" : "return";

  return `${depImports ? depImports + "\n\n" : ""}export class ${name} {
${deps.map((d) => `  constructor(private readonly ${toCamelCase(d)}: ${d}) {}`).join("\n")}

  ${asyncKeyword}execute(${paramList}): ${returnType} {
    // TODO: implement use case logic
    throw new Error('${name}.execute() not yet implemented');
  }
}
`;
}
```

**Quality checks:**
- Use case names are always PascalCase + `UseCase` suffix — `fetchProducts` → `FetchProductsUseCase`
- Each use case has exactly one public method: `execute()` — no additional public methods
- Constructor injection is the only permitted way to supply dependencies — property injection and service locators are forbidden
- If the method body contains `setState`, `emit`, `notifyListeners`, or any state-mutation pattern → add a WARN: `"Method '{name}' contains state mutation. This belongs in the state layer, not a use case."`

---

### Step 3b — Enforce the Canonical Result Type

All use case `execute()` methods must return `Result<T>` from the project's shared type location. Returning ad-hoc shaped objects (`{ ok: true, data }`, `{ success: true, data }`, plain thrown errors, or unwrapped values) is **FATAL** — inconsistent result shapes break every shared error boundary, loading state, and downstream handler that consumes use case output.

**Canonical `Result<T>` type (generated once at `src/shared/types/Result.ts`):**

```ts
// shared/types/Result.ts — generated once per project; never redeclared per-feature.

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(error: string): Result<never> {
  return { ok: false, error };
}
```

**Rules for use case return types:**
- Every `execute()` method return type must be `Promise<Result<T>>` (async) or `Result<T>` (sync).
- The `ok` field is **always** the discriminant — never `success`, `status`, `isOk`, `valid`, or any other name.
- The `error` field is always `string` — never an `Error` class instance, an error code enum by itself, or a complex object.
- If the pipeline is generating use cases for multiple features, **all features share the same `Result<T>` from `src/shared/types/Result.ts`**. Never generate a per-feature `Result` type.

**Enforcement in generated use case files:**

```ts
import type { Result } from '../../../shared/types/Result';
import { ok, err } from '../../../shared/types/Result';

export class FetchWatchlistsUseCase {
  constructor(private readonly watchlistRepository: WatchlistRepository) {}

  async execute(entityId: string): Promise<Result<Watchlist[]>> {
    // Parameter guard — always validate before calling the repository
    if (!entityId || entityId.trim() === '') {
      return err('INVALID_ENTITY_ID');   // ← never throw; always return err()
    }
    // ... repository call
  }
}
```

**FATAL**: Any generated use case file that does not import `Result` from the shared location must be blocked from output. The violation message must be: `"UseCase '{name}' does not use the canonical Result<T> type from 'shared/types/Result'. Non-standard result shapes break shared error handling. Fix before proceeding."`

---

### Step 3c — Empty Collections Are Valid Fulfilled Results

A common error in use case generation is treating an empty collection as an error condition. **An empty array is valid business data** — it means "the user has no items", which is a normal state, not a failure. Libraries and callers that render an empty-state UI component rely on `ok: true, data: []` to distinguish "no data yet" from "fetch failed".

**Rule:** A use case that receives an empty array from the repository **must** return `ok([])` — never `err('EMPTY_*')` or `err('NO_DATA')`. Returning an error for empty data forces the state layer to render an error message instead of a proper empty state component, and makes the slice's `'empty'` status branch unreachable dead code.

```ts
// WRONG — generates dead 'empty' state in the slice and shows error UI to users with no data
if (holdings.length === 0) {
  return err('EMPTY_HOLDINGS');   // ← FATAL: empty is not an error
}

// CORRECT — let the presentation layer decide how to render zero items
return ok(holdings);   // slice.fulfilled handler receives [], status → 'succeeded'
```

**Enforcement:** When scanning a method body from the Flutter source that contains an empty-check before returning:
- If the empty-check leads to an error return → add a FATAL: `"Method '{name}' returns an error for an empty collection. Empty collections are valid data. Return ok([]) instead of err('{errorCode}')."`
- Flag the corresponding `err(...)` call for replacement with `ok([])`
- Do NOT generate the `err(...)` path for empty-collection guards

---

## Step 4 — Extract Repository Interfaces

Repository interfaces define the data contracts the domain layer needs, expressed purely in domain types. They must not reference HTTP clients, ORM models, or platform APIs.

```ts
// domain-extraction/extractRepositoryInterfaces.ts

export interface RepositoryMethod {
  name: string;
  params: UseCaseParam[];
  returnType: string;
  isAsync: boolean;
}

export interface ExtractedRepositoryInterface {
  name: string;             // e.g. "ProductRepository"
  methods: RepositoryMethod[];
  entityDependencies: string[];  // entity type names used in method signatures
  outputPath: string;
  fileContent: string;
  violations: Violation[];
}

export function extractRepositoryInterface(
  repositoryName: string,
  useCases: ExtractedUseCase[],
  entities: ExtractedEntity[],
  featureName: string,
  basePath: string
): ExtractedRepositoryInterface {
  const violations: Violation[] = [];

  // Collect all methods referenced across use cases that depend on this repository
  const methods = useCases
    .filter((uc) => uc.repositoryDependencies.includes(repositoryName))
    .flatMap((uc) => inferRepositoryMethods(uc, violations));

  const entityDependencies = collectEntityDependencies(methods, entities);
  const fileContent = generateRepositoryInterfaceFile(repositoryName, methods, entityDependencies, violations);

  return {
    name: repositoryName,
    methods,
    entityDependencies,
    outputPath: `${basePath}/features/${featureName}/domain/interfaces/${repositoryName}.ts`,
    fileContent,
    violations,
  };
}

function generateRepositoryInterfaceFile(
  name: string,
  methods: RepositoryMethod[],
  entityDeps: string[],
  violations: Violation[]
): string {
  const entityImports = entityDeps
    .map((e) => `import type { ${e} } from '../models/${e}';`)
    .join("\n");

  const methodLines = methods.map((m) => {
    const asyncMark = m.isAsync ? "Promise<" : "";
    const asyncClose = m.isAsync ? ">" : "";
    const paramList = m.params.map((p) => `${p.name}: ${p.type}`).join(", ");
    return `  ${m.name}(${paramList}): ${asyncMark}${m.returnType}${asyncClose};`;
  });

  return `${entityImports ? entityImports + "\n\n" : ""}// Repository interface — implemented in the data layer
export interface ${name} {
${methodLines.join("\n")}
}
`;
}
```

**Quality checks:**
- Repository interfaces are `interface` declarations only — no `class`, no `abstract class`, no method bodies
- Method return types must use domain entity types — never raw HTTP response types (`AxiosResponse`, `Response`, `fetch`) or ORM types
- If a method signature contains a non-entity, non-primitive type → add a WARN: `"Return type '{type}' in '{repositoryName}.{methodName}' is not a domain entity. Verify it is not a data-layer type leaking into domain."`

---

## Step 5 — Scan for Forbidden Dependencies

Run an explicit dependency scan across all generated file contents before writing any output. This is the primary enforcement gate for the zero-dependency rule.

```ts
// domain-extraction/forbiddenDependencyScanner.ts

export interface ForbiddenDependency {
  pattern: RegExp;
  category: string;
  severity: "FATAL" | "WARN";
  remediation: string;
}

export const FORBIDDEN_DEPENDENCIES: ForbiddenDependency[] = [
  // UI frameworks
  { pattern: /from ['"]react['"]/,                  category: "React",            severity: "FATAL", remediation: "Remove React imports. The domain layer must have zero UI dependencies." },
  { pattern: /from ['"]react-native['"]/,            category: "React Native",     severity: "FATAL", remediation: "Remove React Native imports. The domain layer must have zero UI dependencies." },
  { pattern: /from ['"]@react-navigation/,           category: "React Navigation", severity: "FATAL", remediation: "Navigation belongs in the presentation layer." },
  { pattern: /from ['"]expo-/,                       category: "Expo",             severity: "FATAL", remediation: "Expo APIs belong in the data or infrastructure layer." },

  // HTTP / networking
  { pattern: /from ['"]axios['"]/,                   category: "Axios",            severity: "FATAL", remediation: "HTTP clients belong in the data layer. Define a repository interface instead." },
  { pattern: /from ['"]react-query['"]/,             category: "React Query",      severity: "FATAL", remediation: "Data fetching hooks belong in the presentation or data layer." },
  { pattern: /from ['"]@tanstack\//,                 category: "TanStack",         severity: "FATAL", remediation: "Data fetching libraries belong in the data layer." },
  { pattern: /\bfetch\s*\(/,                         category: "Fetch API",        severity: "FATAL", remediation: "Direct fetch() calls belong in the data layer. Use a repository interface." },

  // State management
  { pattern: /from ['"]redux['"]/,                   category: "Redux",            severity: "FATAL", remediation: "Redux belongs in the state layer. Remove from domain." },
  { pattern: /from ['"]@reduxjs\/toolkit['"]/,       category: "Redux Toolkit",    severity: "FATAL", remediation: "Redux Toolkit belongs in the state layer." },
  { pattern: /from ['"]zustand['"]/,                 category: "Zustand",          severity: "FATAL", remediation: "Zustand belongs in the state layer." },
  { pattern: /from ['"]jotai['"]/,                   category: "Jotai",            severity: "FATAL", remediation: "Jotai belongs in the state layer." },
  { pattern: /from ['"]mobx['"]/,                    category: "MobX",             severity: "FATAL", remediation: "MobX belongs in the state layer." },

  // Platform / native APIs
  { pattern: /AsyncStorage/,                         category: "AsyncStorage",     severity: "FATAL", remediation: "Storage belongs in the data layer. Define an interface." },
  { pattern: /NativeModules/,                        category: "NativeModules",    severity: "FATAL", remediation: "Native modules belong in the infrastructure layer." },
  { pattern: /from ['"]@react-native-community\//,  category: "RN Community",     severity: "FATAL", remediation: "Platform libraries belong in the data or infrastructure layer." },

  // Decorators that imply framework coupling
  { pattern: /@Injectable|@inject|@provide/,         category: "DI decorator",     severity: "WARN",  remediation: "DI decorators tie domain to a specific DI framework. Use constructor injection instead." },
];

export function scanForForbiddenDependencies(
  fileContent: string,
  fileName: string
): Violation[] {
  return FORBIDDEN_DEPENDENCIES
    .filter(({ pattern }) => pattern.test(fileContent))
    .map(({ category, severity, remediation }) => ({
      severity,
      message: `Forbidden dependency '${category}' detected in domain file '${fileName}'. ${remediation}`,
    }));
}
```

**Rule:** Any FATAL from this scan must prevent the affected file from being included in the output. The caller receives the violations array; the file is excluded with a `/* BLOCKED: forbidden dependency — see violations */` placeholder.

---

## Step 6 — Generate the Domain Index Barrel

Update the feature's `domain/index.ts` to export all generated entities, use cases, and interfaces.

```ts
// domain-extraction/generateDomainIndex.ts

export function generateDomainIndex(
  entities: ExtractedEntity[],
  useCases: ExtractedUseCase[],
  interfaces: ExtractedRepositoryInterface[]
): string {
  const entityExports   = entities.map((e)   => `export type { ${e.name} } from './models/${e.name}';`);
  const useCaseExports  = useCases.map((uc)  => `export { ${uc.name} } from './usecases/${uc.name}';`);
  const interfaceExports = interfaces.map((i) => `export type { ${i.name} } from './interfaces/${i.name}';`);

  return [
    "// Domain Layer — public API",
    "// Only import from this file outside the domain layer.",
    "",
    ...entityExports,
    ...(entityExports.length ? [""] : []),
    ...useCaseExports,
    ...(useCaseExports.length ? [""] : []),
    ...interfaceExports,
  ].join("\n") + "\n";
}
```

**Rule:** The domain `index.ts` uses `export type` for entities and interfaces (they are types only) and `export` for use case classes. This distinction enforces that entity types are erased at runtime and prevents accidental value-level use of interface declarations.

---

## Step 7 — Validate the Domain Layer

Run final validation across all generated domain artefacts before returning.

```ts
// domain-extraction/validateDomainLayer.ts

export function validateDomainLayer(
  entities: ExtractedEntity[],
  useCases: ExtractedUseCase[],
  interfaces: ExtractedRepositoryInterface[]
): Violation[] {
  const violations: Violation[] = [];

  // 1. Every use case that declares a repository dependency must have a matching interface
  for (const uc of useCases) {
    for (const dep of uc.repositoryDependencies) {
      if (!interfaces.find((i) => i.name === dep)) {
        violations.push({
          severity: "FATAL",
          message: `UseCase '${uc.name}' depends on '${dep}' but no corresponding repository interface was generated. Add the interface or remove the dependency.`,
        });
      }
    }
  }

  // 2. Every repository interface method return type must resolve to a known entity or primitive
  const knownEntityNames = new Set(entities.map((e) => e.name));
  const primitives = new Set(["string", "number", "boolean", "void", "null", "undefined", "Date", "unknown"]);

  for (const iface of interfaces) {
    for (const method of iface.methods) {
      const base = stripGenericAndPromise(method.returnType);
      if (!knownEntityNames.has(base) && !primitives.has(base)) {
        violations.push({
          severity: "WARN",
          message: `Return type '${method.returnType}' in '${iface.name}.${method.name}' does not resolve to a known domain entity or primitive. This may be a data-layer type leaking into the domain.`,
        });
      }
    }
  }

  // 3. No entity contains a field of a non-primitive, non-entity type
  for (const entity of entities) {
    for (const field of entity.fields) {
      const base = stripArray(field.type);
      if (!knownEntityNames.has(base) && !primitives.has(base) && base !== "unknown") {
        violations.push({
          severity: "WARN",
          message: `Field '${field.name}' on entity '${entity.name}' has type '${field.type}' which is not a known entity or primitive. Verify it is not a data-layer type.`,
        });
      }
    }
  }

  return violations;
}
```

Run through this checklist before returning:

- [ ] Every generated file was scanned by `forbiddenDependencyScanner` — no scan was skipped
- [ ] No file in the output contains imports from React, React Native, Axios, Redux, or any state management library
- [ ] All entities are `interface` declarations with no method bodies
- [ ] All use cases have exactly one public method: `execute()`
- [ ] All repository interfaces are `interface` declarations with no method bodies
- [ ] Every use case dependency has a matching repository interface in the output
- [ ] All entity field types are primitives, `Date`, arrays of primitives/entities, or known domain entities
- [ ] `domain/index.ts` exports all generated entities (as types), use cases, and interfaces
- [ ] `domainOutput.features[]` is populated with one entry per distinct feature name extracted from the source — this array drives the per-feature invocation of `data-layer-builder`, `dependency-injector`, and `api-execution-trace` in the orchestrator. An empty `features[]` will cause those steps to fall back to a single module-level invocation with a WARN.
- [ ] `violations[]` contains no `FATAL` entries before returning

---

## File Layout Reference

```
domain-extraction/
├── index.ts                          ← Orchestrator: runs steps 1–7 in order
├── extractEntities.ts                ← Step 2: ClassifiedModel[] → ExtractedEntity[]
├── extractUseCases.ts                ← Step 3: ClassifiedMethod[] → ExtractedUseCase[]
├── extractRepositoryInterfaces.ts    ← Step 4: use case deps → ExtractedRepositoryInterface[]
├── forbiddenDependencyScanner.ts     ← Step 5: zero-dependency enforcement gate
├── generateDomainIndex.ts            ← Step 6: domain/index.ts barrel generator
├── validateDomainLayer.ts            ← Step 7: cross-reference + type integrity checks
├── typeMapper.ts                     ← Dart → TypeScript type mapping table
├── errors.ts                         ← DomainExtractionFatalError, Violation types
└── __tests__/
    ├── extractEntities.test.ts
    ├── extractUseCases.test.ts
    ├── extractRepositoryInterfaces.test.ts
    ├── forbiddenDependencyScanner.test.ts
    └── validateDomainLayer.test.ts

Generated output (written to feature folder by caller):
src/features/<name>/domain/
├── models/
│   └── <Entity>.ts
├── usecases/
│   └── <Name>UseCase.ts
├── interfaces/
│   └── <Name>Repository.ts
└── index.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Zero external dependencies | React, React Native, Axios, Redux, Zustand, and all platform APIs are FATALs — the domain layer imports nothing outside TypeScript primitives and other domain types |
| Interfaces, not classes | Entities and repository interfaces are TypeScript `interface` declarations; use cases are the only classes permitted in the domain layer |
| Single-responsibility use cases | Each use case has exactly one `execute()` method; multi-operation classes must be split |
| Constructor injection only | Dependencies (repositories) are injected via constructor; service locators, singletons, and DI decorators are forbidden |
| No serialization in entities | Entities with `fromJson`/`toJson` belong in the data layer; the domain layer never knows about JSON or HTTP response shapes |
| Repository interfaces define the boundary | The domain layer declares what data it needs; the data layer decides how to fetch it — this direction is inviolable |
| Export types, not values | Entities and interfaces are exported with `export type` to ensure runtime erasure and prevent accidental value coupling |
| Forbidden scan is blocking | A file that fails the forbidden-dependency scan is excluded from output entirely — it is never returned with the violation noted but the content intact |
