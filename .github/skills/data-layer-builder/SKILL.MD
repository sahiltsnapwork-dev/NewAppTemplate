---
name: data-layer-builder
description: "MUST be used whenever the data layer of a feature needs to be implemented after domain interfaces have been defined. Use when: implementing repository interfaces from the domain layer using Axios or another HTTP client; generating API data source classes from classified API call nodes; creating DTO-to-entity mappers that translate HTTP response shapes into domain entities; adding error handling and retry logic to data sources; wiring the data layer into a feature after the Domain Extraction skill has defined the contracts. Keywords: data layer, repository implementation, api datasource, dto mapper, axios, entity mapping, data source, http client, error handling, retry, clean architecture, flutter migration."
priority: HIGH
auto-trigger: true
---

# Data Layer Builder

> Trigger this skill **after** the Domain Extraction skill has produced repository interfaces and entities, and **after** the Feature Folder Generator has scaffolded `features/<name>/data/`. This skill writes exclusively to `features/<name>/data/`. It is the only layer permitted to import HTTP clients, platform storage APIs, or external data sources. No domain entity must be returned to callers in a raw DTO or HTTP response shape — every response must pass through a mapper.

## The Data Layer Contract

The data layer exists to fulfill the contracts declared by the domain layer. Its three responsibilities are strictly bounded:

| Responsibility | Permitted | Forbidden |
|----------------|-----------|-----------|
| Repository implementation | Implement every method on the domain interface | Add methods not declared in the interface |
| API data source | Use Axios (or the declared HTTP client) to fetch data | Call APIs from outside the data layer |
| DTO mapping | Transform API response shapes into domain entities | Return raw DTOs or `AxiosResponse` objects to callers |

Any code that imports an HTTP client outside of the data layer is a **FATAL**. Any repository method that returns a DTO instead of a domain entity is a **FATAL**.

---

## Step 1 — Receive and Validate Input

Accept the classified API calls from the Flutter Parser and the repository interfaces from the Domain Extraction skill.

**Input schema:**

```json
{
  "apiCalls": [
    {
      "library": "string",
      "method": "GET | POST | PUT | DELETE | PATCH | UNKNOWN",
      "rawEndpoint": "string",
      "containingMethod": "string",
      "callLine": 0,
      "responseUsage": "json | webview-url | html | unknown"
    }
  ],
  "interfaces": [
    {
      "name": "string",
      "methods": [
        {
          "name": "string",
          "params": [{ "name": "string", "type": "string" }],
          "returnType": "string",
          "isAsync": true
        }
      ],
      "entityDependencies": ["string"]
    }
  ],
  "entities": [
    {
      "name": "string",
      "fields": [
        { "name": "string", "type": "string", "isRequired": true, "isNullable": false }
      ]
    }
  ],
  "featureName": "string",
  "basePath": "string | null",
  "httpClient": "axios | fetch | custom",
  "baseUrl": "string | null"

  ,"uiBindings": [
    {
      "componentName": "string",
      "componentType": "chart|table|list",
      "dtoName": "string",
      "bindings": {
        "label": "string",
        "value": "string",
        "color": "string|null"
      },
      "chartType": "donut|pie|bar|line",
      "legend": { "enabled": true, "position": "right|bottom|top|left" },
      "percentageFormat": { "decimals": 1, "suffix": "%" },
      "palette": ["#hex", "#hex"]
    }
  ]
}
```

**Decision point:**
- If `interfaces` is empty → **FAIL**: `"FATAL: No repository interfaces provided. Run Domain Extraction skill first."`
- If `apiCalls` is empty and `interfaces` is non-empty → add a WARN: `"No API calls provided. Repository implementations will be generated as stubs only."` and continue
- If `entities` is empty → **FAIL**: `"FATAL: No domain entities provided. Mapper generation requires entity definitions."`
- If `featureName` is missing → **FAIL**: `"FATAL: 'featureName' is required to determine output paths."`
- If any `apiCall.method` is `"UNKNOWN"` → add a WARN per call: `"API call in '{containingMethod}' has unknown HTTP method. Generated data source method will require manual review."`
- If any `apiCall.responseUsage` is `"unknown"` → add a WARN per call: `"API call in '{containingMethod}' has unresolved responseUsage. Treating as 'json'. If this endpoint returns a WebView URL, update responseUsage in the flutter-parser output and re-run the pipeline."`
- If `baseUrl` is null → add a WARN: `"'baseUrl' not provided. Base URL will be emitted as a TODO placeholder. Replace before running the app."` and use `"/* TODO: set baseUrl */"` in generated code

**Rule:** This skill never reads source files, never invokes previous skills, and never modifies the domain interfaces it receives. It implements them.

---

## Step 1e — Multi-Level Feature Dependency Handling

Many features have **multi-level functionality**: a parent feature loads data, then passes identifiers down to child sub-features that load additional data (e.g. a portfolio list → portfolio detail → holdings of each holding). Each level has its own API calls, DTOs, and repository methods. The data layer must capture and wire ALL levels — not just the first.

**Multi-level detection rules:**

1. **Nested navigation with API calls**: If the flutter-parser detected navigation nodes (`navigation[]`) where the destination screen also has API call nodes, this signals a multi-level feature. Both the parent and child screens' API calls must each have their own data source method and repository method.

2. **Parent-child data dependency**: If a parent API response contains an identifier field (e.g. `id`, `portfolioId`, `holdingCode`, `scrip`, `exchangeCode`) that is used as a `pathParam` or `queryParam` in a child API call → the generated thunk for the child call must accept that identifier as a parameter. A hard-coded child API call that does not accept a runtime parent-supplied identifier will always fail or fetch data for the wrong entity.

3. **Parallel sub-calls after parent resolves**: If multiple child API calls depend on the same parent identifier (e.g. after loading a portfolio, the app calls both `/portfolio/{id}/holdings` and `/portfolio/{id}/performance`) → generate all child calls as separate repository methods and separate Redux thunks. The orchestrating thunk (in the state layer) dispatches all child thunks in parallel after the parent thunk resolves.

**For each detected multi-level dependency, emit:**
- A WARN in `violations[]`: `"Multi-level dependency detected: '{childMethod}' depends on data from '{parentMethod}'. The child data source method accepts '{paramName}: {paramType}' as a required parameter. Ensure the Redux thunk dispatches this after the parent thunk resolves."`
- A `// MULTI-LEVEL: called after {parentMethod} resolves; {paramName} supplied from parent response` comment in the generated child data source method.
- A `// PARENT THUNK: dispatches {childThunk}({paramName}) in its then() callback` comment in the generated parent repository implementation.

**Session-bound field wiring:**
If the flutter-parser flagged any fields in `sessionBoundFields[]` (fields carrying session identity like `clientCode`, `tradingAccountNo`, `sessionId`), those fields must be wired from the auth/session context — NOT hardcoded and NOT left as empty-string defaults.
- For each session-bound field in any generated request body → emit WARN: `"Session-bound field '{fieldName}' in '{methodName}' must be sourced from the auth context at runtime. Generated code uses a TODO placeholder — replace with the actual session context selector before shipping."`
- Generated request body placeholder: `const sessionField = /* TODO: get {fieldName} from auth/session context */;`

---

## Step 1d — Apply README Context as Supplementary Input

If `readmeContext` is provided by the orchestrator, use it to validate the generated data layer against documented intent. GSD-derived domain interfaces and API calls are always authoritative.

**Priority rule (non-negotiable):**
- GSD data present for an implementation decision → use GSD data, ignore README
- GSD data absent → use README insights as supplementary guidance only
- GSD and README conflict → use GSD; emit `"README CONFLICT: GSD states '{gsdValue}' for '{topic}' but README states '{readmeValue}'. Using GSD value — it is derived from the actual codebase."`

**README context application for this skill:**
- Use `readmeContext.insights.dataFlowDescription` to validate that the generated repository → use case → thunk data chain matches the README-described sequence. If README describes a flow step requiring a repository method absent from any interface, emit WARN: `"README data flow step implies repository method not declared in domain interface. Implement via interface extension or verify the README description."`
- Use `readmeContext.insights.businessRules` to annotate mapper validation logic: rules that imply type constraints (e.g. "price must be positive") should be reflected as validation guards in mapper code.
- If `readmeContext.insights.source === "none"` → emit INFO: `"[README Context] No README insights. Data layer generation proceeds from domain interfaces only."` and skip validation steps.

**What README context MUST NOT do in this skill:**
- Add repository methods not declared in domain interfaces
- Override the Data Layer Contract (no raw DTOs returned to callers)
- Import HTTP clients outside the data layer based on README descriptions

---

## Step 2 — Infer the DTO Shape

Before generating mappers, infer the expected API response structure (the DTO) from the available API call nodes and entity definitions. DTOs mirror API response shapes — they are distinct from domain entities.

```ts
// data-layer-builder/inferDtoShape.ts

export interface DtoField {
  name: string;           // snake_case, as it typically appears in JSON responses
  type: string;           // TypeScript type for the raw JSON value
  isRequired: boolean;
  isNullable: boolean;
  mappedEntityField: string | null;  // corresponding domain entity field name
}

export interface InferredDto {
  name: string;           // e.g. "ProductDto" (entity name + "Dto")
  fields: DtoField[];
  sourceEntity: string;   // the domain entity this DTO maps to
  violations: Violation[];
}

// Type mapping from domain TypeScript types to expected JSON/DTO types
const ENTITY_TO_DTO_TYPE: Record<string, string> = {
  "string":  "string",
  "number":  "number",
  "boolean": "boolean",
  "Date":    "string",   // dates arrive as ISO strings from APIs
  "unknown": "unknown",
};

export function inferDtoFromEntity(entity: ExtractedEntity): InferredDto {
  const violations: Violation[] = [];

  const fields: DtoField[] = entity.fields.map((f) => {
    const dtoType = ENTITY_TO_DTO_TYPE[f.type] ?? f.type;
    const snakeName = toSnakeCase(f.name); // camelCase → snake_case for JSON field names

    if (!ENTITY_TO_DTO_TYPE[f.type]) {
      violations.push({
        severity: "WARN",
        message: `Entity field '${f.name}' has type '${f.type}' with no known DTO equivalent. Emitted as-is. Verify the API response shape matches.`,
      });
    }

    return {
      name: snakeName,
      type: dtoType,
      isRequired: f.isRequired,
      isNullable: f.isNullable,
      mappedEntityField: f.name,
    };
  });

  return {
    name: `${entity.name}Dto`,
    fields,
    sourceEntity: entity.name,
    violations,
  };
}
```

**Quality checks:**
- DTO field names default to the `snake_case` equivalent of entity field names — this is a **starting assumption only**, not a verified contract. API providers (especially CMOTS) use inconsistent casing arbitrarily: some endpoints return `snake_case`, others `PascalCase`, `ALL_CAPS`, or `camelCase` within the same API surface.
- `Date` entity fields become `string` in the DTO — ISO 8601 string parsing happens in the mapper, not the DTO
- If an entity field type is an array of entities (e.g. `Product[]`) → the DTO field type becomes `ProductDto[]` and a nested DTO is generated for the referenced entity
- DTOs are TypeScript `interface` declarations only — no methods, no class decorators

**Rule 1 — DTO field names must be verified against real API responses, not assumed from entity names:**
Never write a mapper using field names derived by convention (e.g. converting `divAmount` to `div_amount` or assuming `PascalCase` from `camelCase`). The actual server may return `DivAmount`, `DIVAMOUNT`, or `divAmount` — all three are possible on different endpoints from the same provider.
- For every DTO field, emit a WARN tagged `[FIELD-UNVERIFIED]`: `"WARN [FIELD-UNVERIFIED]: DTO field name '{dtoFieldName}' for entity field '{entityFieldName}' was inferred by convention. Verify the actual JSON key in the API response before shipping — wrong casing causes silent undefined values in the UI."`
- Mark each inferred DTO field with a `// TODO [FIELD-VERIFY]: confirm key name in real API response` comment in the generated DTO interface.
- Never suppress or omit this WARN even when a prior run used the same field name — the API server may have changed casing between deployments.

**Rule 1b — Exhaustive response key mapping:**
Every top-level key in the expected `response.data` (or `response.data.data`) must be explicitly mapped. Unknown keys must not be dropped silently.
- If the response DTO has a field that is a plain `Record<string, unknown>` or `object` type at the top level → do NOT emit it as an opaque object. Instead, emit a WARN: `"DTO field '{fieldName}' on '{dtoName}' is an untyped object (Record<string, unknown>). Every key in this object should be explicitly typed. Expand the DTO definition or add a comment listing known keys."`
- After generating a mapper, emit an `// UNMAPPED KEYS CHECK` comment block that lists every DTO field that has no corresponding entity field, so developers can identify data that is being received but not surfaced in the UI: `"// UNMAPPED KEYS: The following DTO fields are received from the API but not mapped to the entity: [{fieldNames}]. If any of these are needed in the UI, add them to the entity and re-run the pipeline."`
- If the response shape includes a wrapper envelope (e.g. `{ data: { innerKey: [...] } }` or `{ result: { data: [...] } }`) → generate the full unwrap chain in the repository method. Never assume the mapper receives the raw `response.data` directly — always trace the path to the actual data array or object. Emit WARN: `"Response envelope detected for '{methodName}': data path appears to be 'response.data.{innerKey}'. Generated unwrap: 'const resdata = response.data?.{innerKey}'. Verify this path against the actual API response."`

---

## Step 3 — Generate DTO-to-Entity Mappers

Every DTO must have a corresponding mapper that converts it to the domain entity. Mappers are pure functions — no side effects, no HTTP calls, no async operations.

```ts
// data-layer-builder/generateMappers.ts

export interface GeneratedMapper {
  dtoName: string;
  entityName: string;
  outputPath: string;
  fileContent: string;
  violations: Violation[];
}

export function generateMapper(
  dto: InferredDto,
  entity: ExtractedEntity,
  featureName: string,
  basePath: string
): GeneratedMapper {
  const violations: Violation[] = [...dto.violations];
  const fieldMappings = buildFieldMappings(dto.fields, entity.fields, violations);
  const fileContent = generateMapperFile(dto, entity, fieldMappings, violations);

  return {
    dtoName: dto.name,
    entityName: entity.name,
    outputPath: `${basePath}/features/${featureName}/data/mappers/${entity.name}Mapper.ts`,
    fileContent,
    violations,
  };
}

// Build chartSpec JSON and data mapper outputs per UI binding
export function buildChartSpecsAndMappers(
  dtos: InferredDto[],
  uiBindings: any[] | undefined,
  featureName: string,
  basePath: string,
  defaultPalette: string[] = ['#3366CC','#DC3912','#FF9900','#109618','#990099']
) {
  const outputs: Array<{ outputPath: string; fileContent: string }> = [];
  uiBindings?.forEach((b) => {
    if (b.componentType !== 'chart') return;
    const dto = dtos.find((d) => d.name === b.dtoName);
    const spec = {
      componentName: b.componentName,
      chartType: b.chartType || 'donut',
      bindings: b.bindings,
      legend: b.legend || { enabled: true, position: 'right' },
      palette: b.palette || defaultPalette,
      percentageFormat: b.percentageFormat || { decimals: 1, suffix: '%' }
    };
    outputs.push({
      outputPath: `${basePath}/features/${featureName}/presentation/components/${b.componentName}/chartSpec.json`,
      fileContent: JSON.stringify(spec, null, 2)
    });
  });

  // Emit a small runtime utility the component or datasource can import:
  const mapperContent = `export function mapDtoToChartData(dtoList, bindings, palette) {
  const total = dtoList.reduce((s, it) => s + (Number(it[bindings.value] ?? it[bindings.value?.toLowerCase()] ?? 0)), 0) || 1;
  return dtoList.map((it, idx) => {
    const value = Number(it[bindings.value] ?? it[bindings.value?.toLowerCase()] ?? 0);
    return {
      label: it[bindings.label] ?? it[bindings.label?.toLowerCase()] ?? '',
      value,
      color: it[bindings.color] ?? palette[idx % palette.length],
      percentage: ((value / total) * 100)
    };
  });
};`;
  outputs.push({
    outputPath: `${basePath}/shared/mappers/chartMapper.ts`,
    fileContent: mapperContent
  });

  return outputs;
}

function generateMapperFile(
  dto: InferredDto,
  entity: ExtractedEntity,
  fieldMappings: FieldMapping[],
  violations: Violation[]
): string {
  const dtoImport   = `import type { ${dto.name} } from '../datasources/dtos/${dto.name}';`;
  const entityImport = `import type { ${entity.name} } from '../../domain/models/${entity.name}';`;

  const mappingLines = fieldMappings.map((m) => {
    if (!m.isMapped) {
      violations.push({
        severity: "WARN",
        message: `Field '${m.entityField}' on entity '${entity.name}' has no corresponding DTO field. Emitted as undefined. Verify the API response.`,
      });
      return `  ${m.entityField}: undefined, // TODO: no matching DTO field found`;
    }
    return `  ${m.entityField}: ${m.transform},`;
  });

  return `${dtoImport}
${entityImport}

export function map${entity.name}FromDto(dto: ${dto.name}): ${entity.name} {
  return {
${mappingLines.join("\n")}
  };
}

export function map${entity.name}ListFromDto(dtos: ${dto.name}[]): ${entity.name}[] {
  return dtos.map(map${entity.name}FromDto);
}
`;
}
```

**Decision point:**
- If any entity field has no corresponding DTO field → add a WARN and emit a `// TODO:` comment for that field — do not **FAIL**, as the API may include the field at runtime
- If a DTO field exists in the API response but has no corresponding entity field → drop it silently (DTOs may carry extra fields the domain does not need); add a WARN only if the dropped field looks like an identifier (`id`, `uuid`, `_id`)
- `Date` fields: emit `new Date(dto.fieldName)` as the transform — never emit the raw string
- Nested DTO fields: call the nested mapper recursively — `mapNestedEntityFromDto(dto.nestedField)`

**Rule 2 — Always emit both-case fallback access in every mapper field, even after verification:**
Even when a field name has been verified against the live API, emit a fallback chain to guard against future server-side casing changes that would otherwise silently produce `undefined` in the UI:
```ts
// Instead of:  dto.DivAmount
// Emit:        dto.DivAmount ?? dto.divAmount ?? dto.div_amount ?? 0
```
The fallback chain must use `??` (nullish coalescing), not `||`, so that legitimate `0`, `false`, or `""` values are preserved. The first key in the chain must be the verified casing from the real API response. Subsequent keys cover the most likely alternative casings (camelCase, snake_case). The final fallback must be a type-appropriate default (`0`, `""`, `false`, `null`, or `[]`) — never `undefined`.
- If an entity field has no verified casing yet (`[FIELD-UNVERIFIED]`), emit all three casing variants in the fallback chain and add the `// TODO [FIELD-VERIFY]` comment on the same line.
- Emit an INFO per mapper: `"INFO: Both-case fallback chains generated for all fields in '{mapperName}'. Replace with single verified keys after confirming the API response shape."`

**Quality check:** Every mapper must have a matching list-mapper (`mapEntityListFromDto`) — never force callers to manually loop over the single-item mapper.

**Rule — One Mapper File Per Entity:** Each entity must have its own dedicated mapper file (e.g. `HoldingMapper.ts`, `WatchlistMapper.ts`). A single mapper file that contains mapping functions for more than one unrelated entity is a **FATAL** — these "mega-mappers" (e.g. a 275-line `PortfolioSummaryMapper.ts` that maps `Holding`, `PortfolioSummary`, `ValuationSummary`, and `CorporateAction` all in one file) cause:
- Merge conflicts when multiple features touch the same file
- Untested mapper paths hiding behind a single test file
- Undiscoverable mapping logic when debugging data shape issues

If the pipeline detects a source Dart file whose name matches `*Mapper*` or `*Mapper.dart` and which contains `fromJson`/`toJson` methods for **more than one distinct entity type** → split it immediately: emit one `<EntityName>Mapper.ts` file per entity, each containing exactly the `mapFromDto` and `mapListFromDto` functions for that entity alone. Add a WARN for each split: `"Mega-mapper '{fileName}' contained mappings for {N} entities. Split into {N} focused mapper files."`

---

### Step 3b — Generate Defensive Response Shape Guards

The DTO shape inferred from Flutter model fields is an assumption, not a verified contract. If the actual API returns a different shape (e.g. `{ watchlistList: [...] }` instead of a flat array, or an extra wrapper envelope), `Array.isArray(resdata)` will be `false` and the feature will silently return a `FETCH_FAILED` error with no diagnostic information.

Every repository implementation that receives a raw API response **must** include a shape guard before passing the response to the mapper.

```ts
// data-layer-builder/generateResponseShapeGuard.ts

// Generated shape guard — inserted at the top of each repository method
// before the mapper is called. Logs the actual shape on mismatch.

export function generateArrayShapeGuard(
  dtoName: string,
  rawResponseVar: string,   // e.g. "resdata"
  violations: Violation[]
): string {
  violations.push({
    severity: "WARN",
    message: `DTO '${dtoName}' is typed as an array. The shape guard below assumes the API returns ` +
      `a flat array in '${rawResponseVar}'. If the real API wraps the list (e.g. { items: [...] }), ` +
      `update the guard and adjust the mapper call. Verify against the actual API response before shipping.`,
  });

  return `
    // SHAPE GUARD — verify before production: this assumes '${rawResponseVar}' is a flat ${dtoName}[].
    // If the API wraps the list (e.g. { ${toCamelCase(dtoName.replace('DTO','').replace('Dto',''))}List: [...] }),
    // replace '${rawResponseVar}' with the correct nested path.
    if (!Array.isArray(${rawResponseVar})) {
      console.error(
        '[${dtoName}] Unexpected response shape. Expected array, got:',
        JSON.stringify(${rawResponseVar}).slice(0, 200)
      );
      return { ok: false, error: 'FETCH_FAILED' };
    }`;
}

export function generateObjectShapeGuard(
  dtoName: string,
  requiredFields: string[],
  rawResponseVar: string,
  violations: Violation[]
): string {
  violations.push({
    severity: "WARN",
    message: `DTO '${dtoName}' shape guard checks for fields: [${requiredFields.join(', ')}]. ` +
      `Verify these field names against the real API response before shipping.`,
  });

  const fieldChecks = requiredFields
    .map((f) => `typeof ${rawResponseVar}.${f} !== 'undefined'`)
    .join(' && ');

  return `
    // SHAPE GUARD — verify required fields exist on '${rawResponseVar}'
    if (!${rawResponseVar} || !(${fieldChecks})) {
      console.error(
        '[${dtoName}] Unexpected response shape. Missing required fields. Got:',
        JSON.stringify(${rawResponseVar}).slice(0, 200)
      );
      return { ok: false, error: 'FETCH_FAILED' };
    }`;
}
```

**Rules:**
- Every generated mapper call site in a repository implementation must be preceded by the appropriate shape guard.
- Array-typed DTOs use `generateArrayShapeGuard`; object-typed DTOs use `generateObjectShapeGuard` with at minimum the identifier field(s) of the DTO.
- The shape guard `console.error` call must include the **actual `JSON.stringify` of the received value** (truncated to 200 chars) so developers can diagnose mismatches without attaching a debugger.
- Shape guards are emitted with a `// SHAPE GUARD — verify before production:` comment to make them easy to locate and update after API contract clarification.

**Rule 4 — Handle both array and object response shapes in every repository method:**
Never assume `response.data` is always an array or always a plain object. Some endpoints that logically return a single entity wrap it in a single-element array (e.g. `compBackground` returns `[{...}]` not `{...}`). Calling `mapEntityFromDto(response.data)` when `response.data` is `[{...}]` passes an array to a function that expects an object, silently producing `undefined` for every mapped field.

Every generated repository method that calls a single-object mapper must unwrap the response before mapping:
```ts
// Generated by data-layer-builder — inserted before every single-object mapper call:
const rawData = response.data;
const dto: EntityDto = Array.isArray(rawData) ? rawData[0] : rawData;
if (!dto) {
  console.error('[EntityMapper] Response was empty or first array element was undefined. Full response:', JSON.stringify(rawData).slice(0, 200));
  return { ok: false, error: 'FETCH_FAILED' };
}
const entity = mapEntityFromDto(dto);
```
- The `Array.isArray` unwrap is emitted unconditionally for all single-object DTOs — not only when the DTO is suspected to be array-wrapped. This is a no-op when the API returns a plain object and a lifesaver when it unexpectedly returns a single-element array.
- For list-returning DTOs (mapper call is `mapEntityListFromDto`), the existing `generateArrayShapeGuard` applies instead — do not add a single-element unwrap for list endpoints.
- Emit an INFO per method: `"INFO: Array-or-object unwrap guard emitted for '{methodName}'. Verify whether the API returns a plain object or a single-element array and remove the redundant branch after confirmation."`

---

## Step 4 — Generate API Data Sources

Create a typed data source class for each group of API calls. The data source is the only class in the feature permitted to call Axios directly.

```ts
// data-layer-builder/generateApiDataSource.ts

export interface GeneratedApiDataSource {
  name: string;            // e.g. "ProductApiDataSource"
  methods: DataSourceMethod[];
  outputPath: string;
  fileContent: string;
  violations: Violation[];
}

export interface DataSourceMethod {
  name: string;            // e.g. "fetchProduct"
  httpMethod: string;      // GET | POST | PUT | DELETE | PATCH
  endpoint: string;        // raw endpoint string from API call node
  params: UseCaseParam[];
  returnType: string;      // the DTO type, e.g. "ProductDto"
  isAsync: true;           // data source methods are always async
}

export function generateApiDataSource(
  apiCalls: ApiCallNode[],
  dtos: InferredDto[],
  featureName: string,
  basePath: string,
  baseUrl: string,
  httpClient: "axios" | "fetch" | "custom"
): GeneratedApiDataSource {
  const violations: Violation[] = [];
  const name = `${toPascalCase(featureName)}ApiDataSource`;

  // Split calls by response usage before generating methods.
  // WebView-URL and HTML calls skip DTO + mapper entirely.
  const methods = apiCalls.map((call) => {
    if (call.responseUsage === 'webview-url' || call.responseUsage === 'html') {
      return buildWebViewDataSourceMethod(call, violations);
    }
    return buildDataSourceMethod(call, dtos, violations);
  });
  const fileContent = generateDataSourceFile(name, methods, baseUrl, httpClient, featureName, violations);

  return { name, methods, outputPath: `${basePath}/features/${featureName}/data/datasources/${name}.ts`, fileContent, violations };
}

// Generates a string-returning data source method for WebView-URL and HTML responses.
// No DTO is inferred, no mapper is generated, and no shape guard is applied.
function buildWebViewDataSourceMethod(
  call: ApiCallNode,
  violations: Violation[]
): DataSourceMethod {
  violations.push({
    severity: 'WARN',
    message: `API call '${call.containingMethod}' (${call.method} ${call.rawEndpoint}) has responseUsage '${call.responseUsage}'. ` +
      `Generating a Promise<string> data source method. No DTO or mapper will be created. ` +
      `The caller is responsible for passing the returned string to a WebView component.`,
  });

  return {
    name: toMethodName(call.containingMethod),
    httpMethod: call.method,
    endpoint: call.rawEndpoint,
    params: extractPathAndQueryParams(call),
    returnType: 'string',   // Raw URL or HTML string — no domain entity involved
    isAsync: true,
  };
}

function generateDataSourceFile(
  name: string,
  methods: DataSourceMethod[],
  baseUrl: string,
  httpClient: string,
  featureName: string,
  violations: Violation[]
): string {
  const axiosImport = httpClient === "axios" ? `import axios from 'axios';\n` : ``;

  const methodBodies = methods.map((m) => {
    const paramList = m.params.map((p) => `${p.name}: ${p.type}`).join(", ");
    const axiosCall = buildHttpCall(m, httpClient);

    return `  async ${m.name}(${paramList}): Promise<${m.returnType}> {
    try {
      const response = await ${axiosCall};
      return response.data;
    } catch (error) {
      throw mapAxiosError(error);
    }
  }`;
  });

  return `${axiosImport}import { mapAxiosError } from '../../shared/errors/mapAxiosError';

export class ${name} {
  private readonly baseUrl = '${baseUrl}';

${methodBodies.join("\n\n")}
}
`;
}
```

**Quality checks:**
- `response.data` is always unwrapped before returning — `AxiosResponse<T>` must never be returned from a data source method
- All HTTP calls are wrapped in `try/catch` that maps errors to a domain-safe error type via `mapAxiosError` (see Step 5)
- Base URL is stored as a private readonly field — never hard-coded into individual endpoint strings
- If `httpClient` is `"custom"` → emit the HTTP call as `// TODO: replace with custom HTTP client call` and add a WARN
- **WebView/HTML methods:** `returnType` is `string`. The generated method unwraps `response.data` as a string directly. No shape guard is applied. A `// WebView URL — pass to <WebView source={{ uri: result }} />` comment is emitted at the return site.
---

### Step 4b — Verify the Request Envelope Against the API Contract

The request body structure (envelope) is inferred from Flutter Dart model fields. Flutter apps often wrap request data in a nested envelope (e.g. `{ mb: { rq: { reqdata: { ... } } } }`). If the real REST endpoint expects a flat body or a different nesting level, all mutation calls will fail with a 4xx error. This cannot be detected from the Dart source alone.

**For every generated API data source method that sends a request body (POST, PUT, PATCH, DELETE with body):**

```ts
// data-layer-builder/generateRequestEnvelopeGuard.ts

export function generateRequestBodyWithEnvelopeComment(
  methodName: string,
  dtoFields: DtoField[],
  inferredEnvelope: string | null,   // e.g. "mb.rq.reqdata" parsed from Flutter source
  violations: Violation[]
): string {
  if (inferredEnvelope) {
    violations.push({
      severity: "WARN",
      message: `Method '${methodName}': request body is wrapped in envelope '${inferredEnvelope}' ` +
        `inferred from Flutter Dart source. If the real API expects a different nesting level ` +
        `(e.g. flat body, or 'mb.rq' without 'reqdata'), all calls will fail with a 4xx. ` +
        `Verify the exact envelope structure against the API gateway contract before shipping.`,
    });

    return `
    // REQUEST ENVELOPE — VERIFY AGAINST API CONTRACT BEFORE SHIPPING
    // Nesting level '${inferredEnvelope}' was inferred from Flutter model fields.
    // If the real endpoint expects a different shape, update the envelope here.
    const requestBody = buildEnvelope('${inferredEnvelope}', {
${dtoFields.map((f) => `      ${f.name}: params.${f.mappedEntityField ?? f.name},`).join('\n')}
    });`;
  }

  // No envelope detected — flat body
  violations.push({
    severity: "WARN",
    message: `Method '${methodName}': no request envelope detected from Flutter source. ` +
      `Request body will be sent flat. Verify against the real API contract.`,
  });

  return `
    // REQUEST BODY — VERIFY AGAINST API CONTRACT BEFORE SHIPPING
    // No nested envelope detected from Flutter source. Sending flat body.
    const requestBody = {
${dtoFields.map((f) => `      ${f.name}: params.${f.mappedEntityField ?? f.name},`).join('\n')}
    };`;
}
```

**Rules:**
- Any inferred envelope nesting deeper than one level (e.g. `mb.rq.reqdata`) must produce a WARN — this is a strong signal that the envelope was copied from Flutter model nesting and may not match the actual HTTP endpoint.
- The generated `buildEnvelope` helper must be a simple recursive key-path builder (e.g. `'mb.rq.reqdata'` → `{ mb: { rq: { reqdata: payload } } }`) and must be documented with the exact path it was derived from.
- Every data source method that sends a body must include a `// REQUEST ENVELOPE — VERIFY AGAINST API CONTRACT BEFORE SHIPPING` comment at the request-body construction line to make it easy to locate during manual API contract review.
---

## Step 5 — Generate Error Handling and Retry Logic

Produce a shared `mapAxiosError` utility and an optional retry wrapper. Both live in `data/` scope — they must not be imported from or referenced by the domain layer.

```ts
// data-layer-builder/generateErrorHandling.ts

export function generateAxiosErrorMapper(featureName: string, basePath: string): GeneratedFile {
  const content = `import axios, { AxiosError } from 'axios';

export class DataSourceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

export function mapAxiosError(error: unknown): DataSourceError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return new DataSourceError(
      axiosError.response?.status ?? 0,
      axiosError.message,
      axiosError.response?.data
    );
  }
  if (error instanceof Error) {
    return new DataSourceError(0, error.message, error);
  }
  return new DataSourceError(0, 'Unknown data source error', error);
}
`;

  return {
    outputPath: `${basePath}/features/${featureName}/data/datasources/mapAxiosError.ts`,
    fileContent: content,
  };
}

export function generateRetryWrapper(featureName: string, basePath: string): GeneratedFile {
  const content = `export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  retryOn: (statusCode: number) => boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 500,
  retryOn: (status) => status >= 500 || status === 429,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isDataSourceError = error instanceof DataSourceError;
      const shouldRetry = isDataSourceError && config.retryOn(error.statusCode);

      if (!shouldRetry || attempt === config.maxAttempts) break;

      await new Promise((resolve) => setTimeout(resolve, config.delayMs * attempt));
    }
  }

  throw lastError;
}
`;

  return {
    outputPath: `${basePath}/features/${featureName}/data/datasources/withRetry.ts`,
    fileContent: content,
  };
}
```

**Rule:** `DataSourceError` must never be imported by the domain layer. The domain layer catches errors by the repository interface's declared throws contract — it must not couple to `DataSourceError` directly.

---

## Step 6 — Generate Repository Implementations

Implement every method declared on each domain repository interface. The implementation wires the data source to the mapper to produce a domain entity.

```ts
// data-layer-builder/generateRepositoryImpl.ts

export interface GeneratedRepositoryImpl {
  name: string;              // e.g. "ProductRepositoryImpl"
  implementedInterface: string;
  outputPath: string;
  fileContent: string;
  unimplementedMethods: string[]; // methods with no matching API call — generated as stubs
  violations: Violation[];
}

export function generateRepositoryImpl(
  iface: ExtractedRepositoryInterface,
  dataSource: GeneratedApiDataSource,
  mappers: GeneratedMapper[],
  featureName: string,
  basePath: string
): GeneratedRepositoryImpl {
  const violations: Violation[] = [];
  const implName = iface.name.replace(/Repository$/, "RepositoryImpl");
  const unimplementedMethods: string[] = [];

  const methodImpls = iface.methods.map((method) => {
    const matchingDataSourceMethod = dataSource.methods.find(
      (m) => m.name === method.name || methodNamesMatch(m.name, method.name)
    );
    const matchingMapper = mappers.find((m) =>
      method.returnType.includes(m.entityName)
    );

    if (!matchingDataSourceMethod) {
      unimplementedMethods.push(method.name);
      violations.push({
        severity: "WARN",
        message: `Interface method '${iface.name}.${method.name}' has no matching API call. Generated as a stub — implement manually.`,
      });
      return generateStubMethod(method);
    }

    if (!matchingMapper) {
      violations.push({
        severity: "FATAL",
        message: `Interface method '${iface.name}.${method.name}' has no mapper for return type '${method.returnType}'. Every repository method must map its response through a domain mapper.`,
      });
      return generateStubMethod(method);
    }

    return generateImplementedMethod(method, matchingDataSourceMethod, matchingMapper);
  });

  const fileContent = generateRepositoryImplFile(implName, iface, dataSource, mappers, methodImpls, featureName);

  return { name: implName, implementedInterface: iface.name, outputPath: `${basePath}/features/${featureName}/data/repositories/${implName}.ts`, fileContent, unimplementedMethods, violations };
}

function generateImplementedMethod(
  method: RepositoryMethod,
  dataSourceMethod: DataSourceMethod,
  mapper: GeneratedMapper
): string {
  const paramList = method.params.map((p) => `${p.name}: ${p.type}`).join(", ");
  const argList   = method.params.map((p) => p.name).join(", ");
  const isArray   = method.returnType.includes("[]");
  const mapCall   = isArray
    ? `map${mapper.entityName}ListFromDto(dto)`
    : `map${mapper.entityName}FromDto(dto)`;

  return `  async ${method.name}(${paramList}): ${method.returnType} {
    const dto = await this.dataSource.${dataSourceMethod.name}(${argList});
    return ${mapCall};
  }`;
}
```

**Decision point:**
- If a repository method has no matching mapper → **FATAL**: the method is generated as a stub AND the violation blocks the file from being marked complete
- If a repository method has no matching API call → WARN and generate a stub — this is acceptable when the method is not yet backed by an API endpoint
- If a repository method returns a primitive type (`string`, `number`, `boolean`, `void`) → no mapper is required; emit the data source result directly

---

### Step 6b — Cross-Check DTO Fields Against Request Body Construction

After generating the repository implementation, compare every field declared in the request DTO against the fields actually included in `buildRequestBody`. Fields that appear in the DTO but are silently omitted from the request body will cause silent API failures if the server requires them.

```ts
// data-layer-builder/auditRequestBodyFields.ts

export function auditRequestBodyFields(
  requestDto: InferredDto,
  requestBodySource: string,   // the generated buildRequestBody function source
  methodName: string,
  violations: Violation[]
): void {
  for (const field of requestDto.fields) {
    // Check that the field name appears in the generated request body construction.
    // Both camelCase and snake_case variants are checked.
    const camel = field.mappedEntityField ?? toCamelCase(field.name);
    const snake = field.name;
    const appearsInBody = requestBodySource.includes(camel) || requestBodySource.includes(snake);

    if (!appearsInBody) {
      violations.push({
        severity: "WARN",
        message: `DTO field '${field.name}' (mapped from '${camel}') is declared on the request DTO ` +
          `for '${methodName}' but does not appear in the generated request body. ` +
          `If the API requires this field, all calls will fail silently. ` +
          `Add it to the request body or confirm with the API contract that it is optional.`,
      });
    }
  }
}
```

**Rule:** This audit runs after every repository implementation is generated for mutation methods (POST, PUT, PATCH, DELETE). It is a WARN (not FATAL) because the field may be intentionally omitted (e.g. server-generated fields). However, **fields whose names match session-identity patterns** (`sessionId`, `userId`, `entityId`, `tradingAccountNo`, `clientCode`, `accountNo`) produce a **FATAL** if omitted, because their absence will cause guaranteed API rejection.

---

### Step 6c — Enforce a Single SUCCESS_CODES Convention Across the Feature

Repository implementations that check API gateway status codes must use a consistent `SUCCESS_CODES` set. Inconsistent conventions between features (e.g. watchlist uses `Set(['001', '000'])`, portfolio uses `Set(['200'])`) indicate that one or both features have the wrong codes.

```ts
// data-layer-builder/generateSuccessCodes.ts

export function generateSuccessCodesBlock(
  featureName: string,
  inferredCodes: string[],   // status codes found in Flutter Dart source for this feature
  violations: Violation[]
): string {
  if (inferredCodes.length === 0) {
    violations.push({
      severity: "WARN",
      message: `No success status codes found in Flutter source for feature '${featureName}'. ` +
        `SUCCESS_CODES will be emitted as an empty placeholder. ` +
        `Verify the API gateway's success code convention and fill in before shipping.`,
    });
    return `// TODO: fill in the API gateway success codes for '${featureName}'
const SUCCESS_CODES = new Set<string>([]); // VERIFY AGAINST API CONTRACT`;
  }

  violations.push({
    severity: "WARN",
    message: `SUCCESS_CODES for '${featureName}' set to [${inferredCodes.map((c) => `'${c}'`).join(', ')}] ` +
      `inferred from Flutter source. Verify these codes against the actual API gateway contract. ` +
      `Mismatched codes between features (e.g. '001' vs '200') indicate one feature has the wrong convention.`,
  });

  return `// SUCCESS_CODES — VERIFY AGAINST API CONTRACT BEFORE SHIPPING
// Inferred from Flutter source. If two features use different codes (e.g. '001' vs '200'),
// one is wrong. Cross-check with the API gateway documentation.
const SUCCESS_CODES = new Set<string>([${inferredCodes.map((c) => `'${c}'`).join(', ')}]);`;
}
```

**Rules:**
- `SUCCESS_CODES` is always emitted with a `// VERIFY AGAINST API CONTRACT BEFORE SHIPPING` comment.
- If the pipeline is generating more than one feature in the same session, **compare all emitted `SUCCESS_CODES` sets**. If they differ, add a cross-feature WARN: `"SUCCESS_CODES mismatch between features '{a}' ([...]) and '{b}' ([...]). These features share the same API gateway — reconcile the correct codes before shipping either feature."`
- `SUCCESS_CODES` values must always be `string` — never `number`. API gateways that return numeric codes must have their codes coerced at the comparison site: `SUCCESS_CODES.has(String(rawCode))`.

---

## Step 7 — Validate the Data Layer

Run cross-reference validation across all generated artefacts before returning.

```ts
// data-layer-builder/validateDataLayer.ts

export function validateDataLayer(
  interfaces: ExtractedRepositoryInterface[],
  impls: GeneratedRepositoryImpl[],
  mappers: GeneratedMapper[],
  dtos: InferredDto[]
): Violation[] {
  const violations: Violation[] = [];

  // 1. Every interface must have an implementation
  for (const iface of interfaces) {
    if (!impls.find((i) => i.implementedInterface === iface.name)) {
      violations.push({
        severity: "FATAL",
        message: `Repository interface '${iface.name}' has no generated implementation. Every interface must be implemented in the data layer.`,
      });
    }
  }

  // 2. Every implementation must cover all interface methods
  for (const impl of impls) {
    const iface = interfaces.find((i) => i.name === impl.implementedInterface)!;
    for (const method of iface.methods) {
      const isImplemented = !impl.unimplementedMethods.includes(method.name);
      const isStub = impl.unimplementedMethods.includes(method.name);
      if (isStub) {
        // Already WARN'd in Step 6 — no duplicate violation
      }
    }
  }

  // 3. Every non-primitive return type in an impl must have a mapper
  for (const impl of impls) {
    const iface = interfaces.find((i) => i.name === impl.implementedInterface)!;
    for (const method of iface.methods) {
      const returnBase = stripGenericAndPromise(method.returnType);
      const isPrimitive = ["string", "number", "boolean", "void", "null", "undefined"].includes(returnBase);
      if (!isPrimitive && !mappers.find((m) => m.entityName === returnBase)) {
        violations.push({
          severity: "FATAL",
          message: `Method '${impl.implementedInterface}.${method.name}' returns '${method.returnType}' but no mapper for '${returnBase}' was generated. Add a mapper or the data will be returned as a raw DTO.`,
        });
      }
    }
  }

  // 4. No DTO type may be exported through the data layer's public index
  // (checked in Step 8 barrel generation — flagged here for reference)

  return violations;
}
```

Run through this checklist before returning:

- [ ] Every domain repository interface has a generated implementation
- [ ] Every non-primitive repository method return type has a corresponding mapper
- [ ] No mapper emits raw DTO types — all return types are domain entities
- [ ] All data source methods unwrap `response.data` before returning
- [ ] All HTTP calls are wrapped in `try/catch` that delegates to `mapAxiosError`
- [ ] Base URL is stored in the data source constructor or a config constant — never hard-coded in endpoint strings
- [ ] `DataSourceError` is not imported in any domain-layer file
- [ ] `data/index.ts` exports only repository implementations — not data sources, DTOs, or mappers
- [ ] Every array-typed DTO response has a shape guard at the call site (Step 3b)
- [ ] Every object-typed DTO response has required-field shape guards at the call site (Step 3b)
- [ ] WebView-URL and HTML API calls produce `Promise<string>` data source methods — no DTO, no mapper, no shape guard generated for them
- [ ] WebView-URL data source methods are accompanied by a `// WebView URL — pass to <WebView source={{ uri: result }} />` comment
- [ ] Every mapper is in its own dedicated file — no "mega-mapper" files with mappings for multiple unrelated entities (Step 3 one-mapper-per-entity rule)
- [ ] Request body fields are audited against DTO declarations — identity fields (`userId`, `accountNo`, etc.) must not be silently omitted (Step 6b)
- [ ] `SUCCESS_CODES` blocks are emitted for every response-checking repository method with a `// VERIFY AGAINST API CONTRACT` comment (Step 6c)
- [ ] Cross-feature `SUCCESS_CODES` consistency verified when multiple features are generated in the same pipeline run (Step 6c)
- [ ] Request body envelope nesting deeper than one level produces a WARN (Step 4b)
- [ ] `violations[]` contains no `FATAL` entries before returning

---

## Step 8 — Generate the Data Layer Index Barrel

The data layer's `index.ts` exports only the repository implementations. Data sources, DTOs, error utilities, and mappers are internal — they must not be importable from outside the data layer.

```ts
// data-layer-builder/generateDataIndex.ts

export function generateDataIndex(
  impls: GeneratedRepositoryImpl[],
  featureName: string,
  basePath: string
): GeneratedFile {
  const exports = impls
    .map((i) => `export { ${i.name} } from './repositories/${i.name}';`)
    .join("\n");

  return {
    outputPath: `${basePath}/features/${featureName}/data/index.ts`,
    fileContent: `// Data Layer — public API\n// Only repository implementations are exported. Data sources, DTOs, and mappers are internal.\n\n${exports}\n`,
  };
}
```

---

## File Layout Reference

```
data-layer-builder/
├── index.ts                           ← Orchestrator: runs steps 1–8 in order
├── inferDtoShape.ts                   ← Step 2: entity → DTO interface inference
├── generateMappers.ts                 ← Step 3: DTO → entity mapper functions (one file per entity)
├── generateResponseShapeGuard.ts      ← Step 3b: array/object shape guards for response validation
├── generateApiDataSource.ts           ← Step 4: API call nodes → typed data source class
├── generateRequestEnvelopeGuard.ts    ← Step 4b: request body envelope nesting verification
├── generateErrorHandling.ts           ← Step 5: mapAxiosError + withRetry utilities
├── generateRepositoryImpl.ts          ← Step 6: interface + datasource + mapper → impl class
├── auditRequestBodyFields.ts          ← Step 6b: DTO fields vs request body cross-check
├── generateSuccessCodes.ts            ← Step 6c: SUCCESS_CODES with API contract comments
├── validateDataLayer.ts               ← Step 7: cross-reference + completeness validation
├── generateDataIndex.ts               ← Step 8: data/index.ts barrel (impls only)
├── errors.ts                          ← DataLayerFatalError, Violation types
└── __tests__/
    ├── inferDtoShape.test.ts
    ├── generateMappers.test.ts
    ├── generateRepositoryImpl.test.ts
    ├── generateResponseShapeGuard.test.ts
    ├── auditRequestBodyFields.test.ts
    └── validateDataLayer.test.ts

Generated output (written to feature folder by caller):
src/features/<name>/data/
├── repositories/
│   └── <Name>RepositoryImpl.ts
├── datasources/
│   ├── <Name>ApiDataSource.ts
│   ├── mapAxiosError.ts
│   ├── withRetry.ts
│   └── dtos/
│       └── <Name>Dto.ts
├── mappers/
│   └── <Name>Mapper.ts          ← one file per entity (never a mega-mapper)
└── index.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Interfaces first | Every repository implementation must declare `implements <InterfaceName>` — it is never a standalone class |
| Mapper is mandatory | A repository method that returns a non-primitive type without a mapper is always a FATAL — raw DTOs must never cross the data/domain boundary |
| One mapper per entity | Each entity has its own dedicated mapper file. Mega-mapper files that map multiple unrelated entities in one file are always FATAL |
| HTTP stays in data | Axios, Fetch, and all HTTP clients are used only inside data source classes — never in repositories, mappers, or domain classes |
| Unwrap before returning | `response.data` is always unwrapped in the data source — `AxiosResponse<T>` never leaves the data source method |
| Errors are mapped, not rethrown | Raw `AxiosError` is caught and mapped to `DataSourceError` before propagating; domain layer never sees framework error types |
| DTO fields are snake_case | DTO field names default to snake_case to match REST API conventions; mappers translate to camelCase domain entity fields |
| Internal implementation details | Data sources, DTOs, mappers, and error utilities are internal to the data layer — only repository implementations are exported via `index.ts` |
| Stubs are acceptable, missing mappers are not | A method with no API call backing generates a stub with a WARN; a method with no mapper is a FATAL |
| Shape guards are mandatory | Every data source method that receives a response must include a shape guard before passing data to the mapper; a missing shape guard is a WARN |
| Request body must be verified | Request body envelope nesting and field completeness are always annotated with VERIFY comments — the inferred shape from Dart models may not match the real API contract |
| SUCCESS_CODES are always type string | API gateway status codes are always compared as strings. Never compare as numbers. Always annotate with VERIFY comments for cross-feature consistency |
