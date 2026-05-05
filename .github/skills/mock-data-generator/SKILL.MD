---
name: mock-data-generator
description: "MUST be used whenever API mock data needs to be generated, stored, and toggled for development or testing. Use when: generating per-API mock response files from endpoint definitions and DTO shapes; creating a centralized mock config with individual and global on/off flags; wiring a mock resolver that intercepts data-source calls before they reach the real Axios client; previewing mock data for a feature before the real backend is available; switching specific APIs between mock and live without code changes; simulating error responses for testing error states; enabling mock mode in CI without modifying source code. Keywords: mock data, mock config, mock flag, global mock, per-api mock, mock resolver, fake data, dev toggle, mock interceptor, data source stub, mock generator, mock registry, mockEnabled, useMockData, globalMockEnabled, simulatedDelay, mockError, mock json, barrel export, stale mock."
priority: HIGH
auto-trigger: true
---

# Mock Data Generator

> Trigger this skill **after** the API Integration skill has produced the shared `apiClient.ts` and after the Data Layer Builder has produced DTO shapes and repository implementations. This skill writes exclusively to `shared/mocks/`. It never modifies domain, state, or presentation files. Any file outside `shared/mocks/` is out of scope and must be refused.

## The Mock Data Contract

Mock data exists to decouple frontend development from backend availability. Its responsibilities are strictly bounded:

| Responsibility | Permitted | Forbidden |
|---|---|---|
| Mock data storage | One typed entry per API endpoint, keyed by API identifier | Duplicating mock entries for the same API |
| Flag management | One `mockEnabled` boolean per API + one `globalMockEnabled` boolean | Flags outside `mockConfig.ts` |
| Error simulation | Per-API `mockError` with status + message | Calling any real infrastructure from mock code |
| Delay simulation | Per-API `delayMs` in `mockConfig.ts` | Using `Math.random()` or `Date.now()` anywhere in generated files |
| Mock resolution | A single `resolveMock()` function that enforces priority logic | Checking individual flags before the global flag |
| Barrel export | One `index.ts` re-exporting all three mock modules | Exporting from files outside `shared/mocks/` |

**Priority rule (never deviate — global flag is evaluated FIRST, always):**

```
STEP 1 — Check globalMockEnabled:
  if (globalMockEnabled === true)  → ALL APIs return mock data. STOP. Per-API flags are NEVER consulted.
  if (globalMockEnabled === false) → proceed to STEP 2.

STEP 2 — Only reached when globalMockEnabled is false. Check per-API flag:
  if (apiMockFlags[id].mockEnabled === true)  → return mock data for that API
  if (apiMockFlags[id].mockEnabled === false) → call the real API for that API
```

**Implementation contract:**
- The global flag check MUST be the VERY FIRST condition in the resolver function body.
- There must be NO code path — including short-circuit logic, flag caching, or middleware — that reads `apiMockFlags` before `globalMockEnabled` has been evaluated.
- A resolver that checks individual flags before the global flag is always a **FATAL**.
- A resolver that reads `apiMockFlags` as part of a combined conditional (e.g. `globalMockEnabled || apiMockFlags[id].mockEnabled`) that evaluates individual flags even when `globalMockEnabled` is `true` is also a **FATAL**.
- The orchestrator input field `mockConfig.globalMockDefault` (from the top-level pipeline input) is the sole source for `globalMockEnabled`. Per-API overrides in `mockConfig.perApiOverrides` affect ONLY the individual `mockEnabled` fields — they can NEVER influence the global flag.
- When `globalMockEnabled` is set from an environment-aware expression, the expression must evaluate to a single boolean at runtime before the resolver reads it. The resolver MUST NOT perform environment detection itself — it reads `mockConfig.globalMockEnabled` as an already-resolved boolean.

**HARDCODED FLAG PREVENTION (non-negotiable — enforced at generation time):**
- `globalMockEnabled` MUST NEVER be generated as the literal boolean `true` or `false` in `mockConfig.ts`. It MUST ALWAYS be the environment-aware expression: `process.env.NODE_ENV === 'development' || process.env.USE_MOCK === 'true'`.
- The ONLY exception is when the caller explicitly passes `globalMockDefault: false` (a boolean `false`) AND the deployment target is confirmed production — in that case emit `false` as a literal, but add a WARN: `"globalMockEnabled emitted as literal 'false'. This disables all mocks globally. If this is for a non-production build, use the env-aware expression instead."`
- A generated `mockConfig.ts` that contains `globalMockEnabled: true` (literal) is always a **FATAL**. This is the most common cause of mock data appearing in production builds. Catch it before writing the file.
- After generating `mockConfig.ts`, run this self-audit before emitting the file:
  1. Scan the file content for the regex `/globalMockEnabled\s*:\s*true/`. If found → **FATAL**: `"FATAL: mockConfig.ts was about to be written with globalMockEnabled: true (literal). This would force ALL APIs to use mock data regardless of environment. Replace with the env-aware expression: process.env.NODE_ENV === 'development' || process.env.USE_MOCK === 'true'"`
  2. Scan `mockResolver.ts` for any code path that reads `apiMockFlags` before the `if (mockConfig.globalMockEnabled)` check. If found → **FATAL**: `"FATAL: mockResolver.ts reads per-API flags before the global flag check. The global flag MUST be evaluated first, unconditionally. Reorder the resolver logic."`

**WEBVIEW API MOCK RULE (non-negotiable):**
- If an API entry has `responseType: "webview-url"` or `responseType: "html"`, its mock entry in `mockData.ts` MUST be a `string` (a URL string or HTML string), NEVER an object or DTO shape.
- Generating `{ key: value }` as the mock payload for a WebView API is always a **FATAL**: `"FATAL: WebView API '{id}' has an object mock payload. WebView APIs return a URL or HTML string — the mock must be a string (e.g. 'https://mock.example.com/preview'). Fix the mock entry type."`
- The `mockEnabled` flag for a WebView API defaults to `false`. WebView URLs are server-rendered — mock strings are rarely useful in practice. Emit INFO: `"WebView API '{id}': mockEnabled defaulted to false. WebView URLs are typically live server responses. Set mockEnabled: true and provide a real preview URL string only if UI preview is needed."
- No DTO expansion, no heuristic payload inference, and no `generateMockPayload()` call may be made for a WebView API. The mock entry is set directly to the string value from `exampleValue` if provided, or `"https://mock.example.com/webview-preview"` as a fallback string.`

---

## Step 1 — Receive and Validate Input

Accept the API catalog produced by the API Integration skill and the DTO shapes from the Data Layer Builder.

**Input schema:**

```json
{
  "featureName": "string",
  "basePath": "string | null",
  "globalMockDefault": true,
  "apis": [
    {
      "id": "string",
      "method": "GET | POST | PUT | DELETE | PATCH",
      "endpoint": "string",
      "description": "string | null",
      "requestBody": { "key": "value" },
      "queryParams": { "key": "value" },
      "pathParams": ["string"],
      "responseDto": {
        "name": "string",
        "fields": [
          {
            "name": "string",
            "type": "string",
            "isRequired": true,
            "isNullable": false,
            "exampleValue": "string | number | boolean | null"
          }
        ]
      },
      "probedResponseShape": {
        "source": "live-api",
        "probeUrl": "string",
        "statusCode": 200,
        "dataPath": "data | data.data | result | null",
        "fields": [
          {
            "name": "string",    // EXACT key from real API response — no casing changes
            "type": "string",
            "exampleValue": "the actual value returned by the API",
            "isNullable": false,
            "isArray": false
          }
        ],
        "rawSample": {}
      }
    }
  ],
  "perApiOverrides": {
    "<apiId>": {
      "mockEnabled": false,
      "delayMs": 0,
      "mockError": { "status": 401, "message": "Unauthorized" }
    }
  },
  "existingMockFiles": [
    { "path": "string", "content": "string" }
  ]
}
```

**Decision point:**
- If `apis` is empty or absent → **FAIL**: `"FATAL: No APIs provided. Cannot generate mock data without an API catalog. Run the API Integration skill first and pass its output here."`
- If any `api.id` is null or empty → **FAIL**: `"FATAL: API at endpoint '{endpoint}' has no 'id'. Every API must have a unique string identifier (e.g. 'getPortfolioHoldings') to be used as the mock registry key."`
- If two or more entries in `apis[]` share the same `id` → **FAIL**: `"FATAL: Duplicate API id '{id}' found. API identifiers must be unique across the entire catalog."`
- If any `api.responseDto` is absent AND `api.probedResponseShape` is also null → add a WARN per entry: `"API '{id}' has no responseDto and no probedResponseShape. Mock data will be generated as an empty object placeholder. Either provide a DTO shape or ensure the API Integration skill probed this endpoint successfully."` and continue with `{}` as the mock payload.
- If `api.probedResponseShape` is non-null → skip the `responseDto` absence check for that entry entirely. The probed shape supersedes the DTO. Emit INFO: `"API '{id}' has a live-probed response shape ({fieldCount} fields from {probeUrl}). Skipping responseDto validation — probed shape takes priority."`
- If `basePath` is null → default to `"src"` and emit INFO: `"'basePath' not provided. Defaulting output root to 'src/shared/mocks/'."`
- If `globalMockDefault` is absent → default to `process.env.NODE_ENV === 'development' || process.env.USE_MOCK === 'true'` (env-aware expression) and emit INFO: `"'globalMockDefault' not specified. Defaulting to environment-aware expression: process.env.NODE_ENV === 'development' || process.env.USE_MOCK === 'true'."`
- If `existingMockFiles` contains a `mockConfig.ts` → read the existing `globalMockEnabled` value and per-API flags from it. Preserve any existing flag values for APIs already present; add new entries for new APIs. Emit INFO: `"Existing mockConfig.ts detected. Preserving {count} existing flag entries. Adding {newCount} new entries."`
- If `existingMockFiles` contains a `mockData.ts` → compare the existing mock payload field names against the incoming `responseDto` fields. For any DTO field that was added or removed since the last generation, emit WARN: `"Stale mock detected for '{id}': field '{fieldName}' is new/removed in the DTO. Regenerating — review the updated mock payload before committing."`
- If `perApiOverrides` contains an id not present in `apis[]` → emit WARN: `"perApiOverrides entry '{id}' has no matching API in the catalog. The override will be ignored."` and skip it.

**Rule:** This skill never reads Flutter source files, never modifies the `apiClient`, and never generates tests. Its sole output is the four files defined in Step 5.

---

## Step 1d — Apply README Context as Supplementary Input

If `readmeContext` is provided by the orchestrator, use it to audit mock catalog completeness. GSD-derived API catalog entries are always authoritative.

**Priority rule (non-negotiable):**
- GSD data present for a mock generation decision → use GSD data, ignore README
- GSD data absent → use README insights as supplementary guidance only
- GSD and README conflict → use GSD; emit `"README CONFLICT: GSD states '{gsdValue}' for '{topic}' but README states '{readmeValue}'. Using GSD value — it is derived from the actual codebase."`

**README context application for this skill:**
- Use `readmeContext.insights.supplementaryEndpoints` to check for API entries in README that are missing from the `apis[]` catalog. For each, emit WARN: `"README mentions endpoint '{path}' which has no mock catalog entry. Add it to INTEGRATIONS.md and re-run to generate a mock."`
- Never auto-generate mock entries from README alone. All mock catalog entries must originate from `apis[]` (GSD-confirmed sources).
- If `readmeContext.insights.source === "none"` → emit INFO: `"[README Context] No README insights. Mock generation proceeds from API catalog only."` and skip supplementary endpoint audit.

**What README context MUST NOT do in this skill:**
- Create mock entries for endpoints found only in README
- Override the four-file output constraint (Step 5)
- Modify or re-open `apiClient`

---

## Step 2 — Build the API Mock Catalog

For each API in `apis[]`, construct a typed mock catalog entry. This is the internal representation used by Steps 3 and 4.

```ts
// mock-data-generator/buildMockCatalog.ts

export interface MockCatalogEntry {
  id: string;                       // unique API identifier, used as registry key
  method: string;                   // HTTP method
  endpoint: string;                 // full resolved endpoint path
  description: string | null;
  mockPayload: Record<string, unknown>;   // the generated mock response body
  mockEnabled: boolean;             // per-API flag default
  delayMs: number;                  // simulated network latency (0 = instant)
  mockError: { status: number; message: string } | null;   // null = no error simulation
}

export interface MockCatalog {
  featureName: string;
  entries: MockCatalogEntry[];
  globalMockDefault: boolean | string;   // string when env-aware expression is used
}

export function buildMockCatalog(input: MockDataGeneratorInput): MockCatalog {
  const entries: MockCatalogEntry[] = input.apis.map((api) => {
    const override = input.perApiOverrides?.[api.id];

    // ── Mock payload resolution — three-tier priority ──────────────────────
    // Tier 1 (highest): probedResponseShape from live API probe (GET 2xx only)
    //   → Uses exact field names and real values from the actual API response.
    //   → Zero heuristics. Zero guessing. Most accurate mock possible.
    // Tier 2: responseDto.fields with exampleValue set
    //   → Uses developer-provided example values. Accurate for known fields.
    // Tier 3 (fallback): heuristic inference from field name + type
    //   → Used when no probed shape and no exampleValue. Good for common fields.
    const mockPayload = api.probedResponseShape
      ? generateMockPayloadFromProbedShape(api.probedResponseShape)
      : generateMockPayload(api.responseDto);

    // Emit INFO when probed shape is used so developers know the source
    if (api.probedResponseShape) {
      console.info(
        `[MockGenerator] '${api.id}': mock payload built from LIVE API probe ` +
        `(${api.probedResponseShape.probeUrl}, HTTP ${api.probedResponseShape.statusCode}). ` +
        `${api.probedResponseShape.fields.length} fields extracted with exact casing and real values. ` +
        `Heuristic inference bypassed.`
      );
    }

    // ── WebView API guard ───────────────────────────────────────────────────
    // WebView APIs (responseType === 'webview-url' | 'html') must use a string
    // mock value, NEVER a DTO object. Default mockEnabled to false for WebView APIs.
    const isWebView = api.responseType === "webview-url" || api.responseType === "html";
    if (isWebView && mockPayload !== null && typeof mockPayload === "object") {
      throw new Error(
        `FATAL: WebView API '${api.id}' was about to receive an object mock payload. ` +
        `WebView APIs return a URL or HTML string. Set the mock entry to a string value.`
      );
    }

    return {
      id:           normalizeId(api.id),
      method:       api.method,
      endpoint:     api.endpoint,
      description:  api.description ?? null,
      responseType: api.responseType ?? "json",
      mockPayload:  isWebView
        ? (typeof api.responseDto?.fields?.[0]?.exampleValue === "string"
            ? api.responseDto.fields[0].exampleValue
            : "https://mock.example.com/webview-preview")
        : mockPayload,
      mockEnabled:  isWebView
        ? (override?.mockEnabled ?? false)   // default false for WebView — see WEBVIEW API MOCK RULE
        : (override?.mockEnabled ?? true),
      delayMs:      override?.delayMs      ?? 0,
      mockError:    override?.mockError    ?? null,
    };
  });

  return {
    featureName:       input.featureName,
    entries,
    globalMockDefault: input.globalMockDefault ?? "process.env.NODE_ENV === 'development' || process.env.USE_MOCK === 'true'",
  };
}

function normalizeId(raw: string): string {
  // Convert kebab-case or space-separated ids to camelCase for use as TS keys
  return raw.replace(/[-\s]+(.)/g, (_, c: string) => c.toUpperCase());
}
```

**Catalog validation rules:**
- Every `id` must be a valid JavaScript identifier (no spaces, no hyphens). If the raw id contains hyphens or spaces, convert to `camelCase` automatically and emit WARN: `"API id '{original}' converted to camelCase identifier '{converted}' for use as a TypeScript key."`
- If an API's `responseDto.fields` list is empty, set `mockPayload` to `{}` and emit WARN: `"No DTO fields for '{id}'. Mock payload will be an empty object."`
- `delayMs` must be a non-negative integer. If a negative value is provided in `perApiOverrides`, clamp to `0` and emit WARN: `"delayMs for '{id}' was negative. Clamped to 0."`
- If `mockError` is present, `status` must be a valid HTTP error code (400–599). If outside this range, emit WARN and set `mockError = null`: `"mockError.status for '{id}' is {value} — not a valid HTTP error code. mockError ignored."`

---

## Step 2b — Ensure Complete Mock Catalog Coverage

Before building mock payloads, verify that the API catalog is complete by cross-referencing all available sources in priority order:

**Coverage audit rules (executed before payload generation, not after):**

1. **GSD INTEGRATIONS.md** (highest priority): If `constitutionConfig.apiEndpoints[]` is provided, verify every endpoint in INTEGRATIONS.md has a matching entry in `apis[]`. For each INTEGRATIONS.md endpoint with no `apis[]` match → **FAIL**: `"FATAL: INTEGRATIONS.md declares endpoint '{method} {path}' but it has no corresponding entry in the API catalog (apis[]). Add it to the catalog and re-run. Missing endpoints produce incomplete mock coverage that silently breaks data-layer tests."`
2. **Flutter source API calls**: If `parsedFlutterApiCalls[]` is provided, verify every Flutter API call has a matching entry in `apis[]`. For each unmatched Flutter call → emit WARN: `"Flutter API call '{containingMethod}' ({method} {rawEndpoint}) has no mock catalog entry. Add it to the API catalog for full mock coverage."`
3. **README supplementary endpoints**: Use `readmeContext.insights.supplementaryEndpoints` as a completeness hint. For each README endpoint not in `apis[]` → emit WARN: `"README mentions endpoint '{path}' which has no mock catalog entry. Verify against INTEGRATIONS.md to determine if it should be added."`
4. **Nested / multi-level APIs**: If the Flutter parser detected that any API call is used inside a nested feature flow (e.g. a child screen that fetches sub-data after the parent screen loads), each nested call must have its own catalog entry. A nested call without a mock entry means the child screen will hit the real API even when `globalMockEnabled=true`. For each detected nested call → emit WARN: `"Nested API call '{containingMethod}' in nested flow '{flowName}' has no mock catalog entry. Multi-level feature flows require mock entries for EVERY level — add it to the catalog."`

**Missing DTO fields audit (per API):**
For each API entry in `apis[]` where `responseDto.fields` is non-empty:
- Check for any DTO field whose `exampleValue` is `null` AND whose type is `string` (not `string | null`) → emit WARN: `"DTO field '{fieldName}' on '{apiId}' has no exampleValue and is a required string. Mock will emit 'mock_string'. Provide an exampleValue for more realistic test data."`
- Check for nested DTO references (field type is a DTO name, e.g. `"AddressDto"`) where the referenced DTO has no fields defined → emit WARN: `"Field '{fieldName}' on '{apiId}' references DTO type '{dtoType}' which has no field definitions. Mock will emit an empty object. Add field definitions for '{dtoType}' to generate realistic nested mock data."`
- Check for array-typed fields where `isRequired: true` and `isNullable: false` → the mock MUST emit at least one element, never an empty array. If the mock generator would otherwise emit `[]` for this field → **FAIL**: `"FATAL: Required array field '{fieldName}' on '{apiId}' would generate an empty array []. This violates the mock contract — required arrays must have at least one element. Provide DTO field definitions or exampleValue."`

---

## Step 3 — Generate Mock Payloads

For each `MockCatalogEntry`, infer a realistic mock value for every DTO field based on its TypeScript type, field name, and `exampleValue` hint.

```ts
// mock-data-generator/generateMockPayload.ts

export function generateMockPayload(
  dto: ResponseDto | undefined
): Record<string, unknown> {
  if (!dto || dto.fields.length === 0) return {};

  const payload: Record<string, unknown> = {};

  for (const field of dto.fields) {
    payload[field.name] = resolveMockValue(field);
  }

  return payload;
}

function resolveMockValue(field: DtoField): unknown {
  // 1. Always prefer an explicit exampleValue if provided
  if (field.exampleValue !== undefined && field.exampleValue !== null) {
    return field.exampleValue;
  }

  // 2. Nullable non-required fields return null
  if (field.isNullable && !field.isRequired) {
    return null;
  }

  // 3. Infer from TypeScript type + field name heuristics
  return inferByTypeAndName(field.type, field.name);
}

// Called BEFORE generateMockPayload when probedResponseShape is available.
// Returns a payload built entirely from real API values — no heuristics used.
export function generateMockPayloadFromProbedShape(
  probedShape: ProbedResponseShape
): Record<string, unknown> {
  if (!probedShape || probedShape.fields.length === 0) return {};

  const payload: Record<string, unknown> = {};

  for (const field of probedShape.fields) {
    // Use the exact exampleValue from the live API probe
    payload[field.name] = field.exampleValue ?? (field.isNullable ? null : undefined);
  }

  return payload;
}

function inferByTypeAndName(type: string, name: string): unknown {
  const lower = name.toLowerCase();

  // --- String heuristics ---
  if (lower.includes("id"))            return "mock-id-001";
  if (lower.includes("name"))          return "Mock Name";
  if (lower.includes("title"))         return "Mock Title";
  if (lower.includes("email"))         return "mock@example.com";
  if (lower.includes("phone"))         return "+1-555-000-0000";
  if (lower.includes("url") || lower.includes("link") || lower.includes("image"))
                                        return "https://mock.example.com/resource";
  if (lower.includes("date") || lower.includes("time") || lower.includes("at"))
                                        return "2024-01-01T00:00:00.000Z";
  if (lower.includes("status"))        return "active";
  if (lower.includes("description") || lower.includes("message") || lower.includes("text"))
                                        return "Mock description text.";
  if (lower.includes("color"))         return "#4A90E2";
  if (lower.includes("symbol") || lower.includes("lssymbol") || lower.includes("scripsymbol"))
                                        return "MOCK";
  if (lower.includes("currency"))      return "INR";
  if (lower.includes("code"))          return "MOCK001";
  if (lower.includes("exchange"))      return "NSE";
  if (lower.includes("segment"))       return "EQ";
  if (lower.includes("series"))        return "EQ";
  if (lower.includes("isin"))          return "INE000A01000";
  if (lower.includes("sector"))        return "Technology";
  if (lower.includes("industry"))      return "Software";
  if (lower.includes("type"))          return "EQUITY";
  if (lower.includes("category"))      return "LARGE_CAP";
  if (lower.includes("flag") || lower.includes("indicator") || lower.includes("eligible"))
                                        return "Y";
  if (lower.includes("count") || lower.includes("total") || lower.includes("amount") || lower.includes("qty") || lower.includes("quantity"))
                                        return 0;
  if (lower.includes("price") || lower.includes("value") || lower.includes("rate") ||
      lower.includes("ltp") || lower.includes("nav") || lower.includes("return") ||
      lower.includes("gain") || lower.includes("pnl") || lower.includes("profit") ||
      lower.includes("loss") || lower.includes("atp") || lower.includes("avg") ||
      lower.includes("close") || lower.includes("open") || lower.includes("high") ||
      lower.includes("low") || lower.includes("bid") || lower.includes("ask") ||
      lower.includes("yield") || lower.includes("coupon") || lower.includes("div") ||
      lower.includes("weight") || lower.includes("percent") || lower.includes("pct") ||
      lower.includes("change") || lower.includes("chg"))
                                        return 0.0;
  if (lower.includes("rank"))          return 1;
  if (lower.includes("lot") || lower.includes("unit"))
                                        return 1;
  if (lower.includes("enabled") || lower.includes("active") || lower.includes("visible"))
                                        return true;
  if (lower.includes("remark") || lower.includes("comment") || lower.includes("note"))
                                        return "Mock remark.";
  if (lower.includes("account") || lower.includes("client") || lower.includes("user"))
                                        return "MOCK_ACC_001";
  if (lower.includes("folio"))         return "123456";
  if (lower.includes("scheme"))        return "Mock Scheme Name";
  if (lower.includes("fund"))          return "Mock Fund Name";
  if (lower.includes("amc"))           return "Mock AMC";
  if (lower.includes("plan"))          return "DIRECT";
  if (lower.includes("option"))        return "GROWTH";
  if (lower.includes("mode"))          return "ONLINE";

  // --- Type-based fallback ---
  switch (type) {
    case "string":    return "mock_string";
    case "number":    return 0;
    case "boolean":   return false;
    case "string[]":  return ["mock_string"];
    case "number[]":  return [0];
    case "boolean[]": return [false];
    default:
      if (type.endsWith("[]")) return [{}];  // ensure non-empty array for required array fields
      if (type.startsWith("{") || type.includes("Record")) return {};
      return null;   // unknown complex type → null
  }
}
```

**Mock generation rules:**
- **Never use `Math.random()`, `Date.now()`, or any non-deterministic value.** Mock data must be identical on every generation run for the same input so snapshots and tests remain stable.
- If a field type is a nested DTO name (e.g. `"AddressDto"`), recursively expand it if the DTO definition is present in `apis[].responseDto`; otherwise emit `{}` for that field and add a WARN: `"Field '{fieldName}' references type '{type}' which has no DTO definition in the input. Emitting empty object placeholder."`.
- Array fields must always emit at least one element (not an empty array) unless the DTO explicitly marks the field with `"isRequired": false` and `"isNullable": true`.

---

## Step 4 — Apply Priority Logic in the Mock Resolver

Generate the resolver function that is called by each data source method **before** calling `apiClient`. The resolver enforces the global-flag-first priority rule and applies delay and error simulation.

```ts
// mock-data-generator/generateMockResolver.ts

export function generateMockResolverFile(basePath: string): GeneratedFile {
  return {
    outputPath: `${basePath}/shared/mocks/mockResolver.ts`,
    fileContent: `import { mockConfig } from './mockConfig';
import { mockData } from './mockData';

export interface MockResolution<T> {
  data: T | null;
  usedMock: boolean;
  delayMs: number;
  error: { status: number; message: string } | null;
}

/**
 * Resolves whether to return mock data or delegate to the real API caller.
 *
 * Priority (hard-coded — do not reorder):
 *   1. globalMockEnabled === true  → always return mock (individual flags ignored)
 *   2. globalMockEnabled === false → check apiMockFlags[apiId].mockEnabled
 *        true  → return mock for this API
 *        false → return null (caller must invoke the real API)
 *
 * When mock is active:
 *   - If apiMockFlags[apiId].mockError is set → resolution contains an error payload (no data)
 *   - If apiMockFlags[apiId].delayMs > 0      → caller must apply the delay before returning
 *
 * @returns MockResolution<T> with usedMock=false when the real API should be called.
 */
export async function resolveMock<T>(apiId: string): Promise<MockResolution<T>> {
  const noMock: MockResolution<T> = { data: null, usedMock: false, delayMs: 0, error: null };

  // ── Priority 1: global flag — ALWAYS evaluated first, unconditionally ────
  // DO NOT move this block. DO NOT check per-API flags before this block.
  // When globalMockEnabled is true, ALL APIs return mock data.
  // Per-API flags are irrelevant and must NOT be consulted.
  if (mockConfig.globalMockEnabled) {
    const flag = mockConfig.apiMockFlags[apiId as keyof typeof mockConfig.apiMockFlags];
    if (!flag) {
      console.warn(
        `[MockResolver] globalMockEnabled is true but no registry entry for '${apiId}'. Falling through to real API.`
      );
      return noMock;
    }
    // Global mock is ON: return mock regardless of flag.mockEnabled value
    return buildResolution<T>(apiId, flag);
  }

  // ── Priority 2: per-API flag — ONLY reached when globalMockEnabled is false ──
  const flag = mockConfig.apiMockFlags[apiId as keyof typeof mockConfig.apiMockFlags];
  if (!flag || !flag.mockEnabled) {
    return noMock;   // real API
  }

  return buildResolution<T>(apiId, flag);
}

function buildResolution<T>(
  apiId: string,
  flag: { mockEnabled: boolean; delayMs: number; mockError: { status: number; message: string } | null }
): MockResolution<T> {
  // Apply simulated delay
  const delayMs = flag.delayMs ?? 0;

  // Return error simulation if configured
  if (flag.mockError) {
    return { data: null, usedMock: true, delayMs, error: flag.mockError };
  }

  const entry = (mockData as Record<string, unknown>)[apiId];
  return {
    data:     (entry ?? null) as T | null,
    usedMock: true,
    delayMs,
    error:    null,
  };
}
`,
  };
}
```

**Usage pattern in data source methods (emit as a comment block in the generated output — do NOT modify existing data source files; include this as a developer reference):**

```ts
// In your data source method, replace a direct apiClient call with:
//
//   const resolution = await resolveMock<YourDtoType>('yourApiId');
//   if (resolution.usedMock) {
//     if (resolution.error) throw { status: resolution.error.status, message: resolution.error.message };
//     if (resolution.delayMs > 0) await new Promise(r => setTimeout(r, resolution.delayMs));
//     return resolution.data!;
//   }
//   const response = await apiClient.get<YourDtoType>('/your/endpoint');
//   return response.data;
//
// This ensures:
//   - globalMockEnabled=true                            → mock (or error) returned before apiClient is called
//   - globalMockEnabled=false + mockEnabled=true        → same
//   - globalMockEnabled=false + mockEnabled=false       → real API called
//   - mockError set                                     → error thrown without hitting the network
//   - delayMs > 0                                       → artificial latency applied to mock response
```

**Rule:** The resolver is always called before `apiClient`. A data source that calls `apiClient` before calling `resolveMock()` violates the priority rule and is a **FATAL** in the Final Validator.

---

## Step 5 — Generate Output Files

Generate exactly four files. No other files are permitted.

### File 1 — `mockData.ts`

One exported constant object with one entry per API, keyed by the API's `id`. Additionally emits a companion `mockData.json` so non-TypeScript tooling (Postman, MSW, Swagger) can consume the same data.

```ts
// Template — generated from MockCatalog

import type { MockDataRegistry } from './mockConfig';

/**
 * AUTO-GENERATED — do not edit manually.
 * Re-run the Mock Data Generator to update entries.
 * Source: mock-data-generator skill output
 */
export const mockData: MockDataRegistry = {

  // ── {api.id} [{api.method} {api.endpoint}] ──────────────────────────────
  // {api.description ?? 'No description provided.'}
  {api.id}: {
    // ... fields from api.mockPayload
  },

  // ... repeat for every API in the catalog
};
```

Also emit `mockData.json` (plain JSON, no TypeScript syntax) with the identical payload structure — keys and values identical to `mockData.ts`. This file is not TypeScript-typed and is intended for non-TS consumers only.

**Rules:**
- Every API in `apis[]` must have exactly one entry. If N APIs are provided, `mockData.ts` must contain exactly N keyed entries — no more, no fewer.
- Each entry is preceded by a comment showing the HTTP method, endpoint path, and description.
- The object is typed with `MockDataRegistry` (defined in `mockConfig.ts`) to guarantee compile-time key exhaustiveness.
- No `any` types. Every value must be typed through the DTO shapes or fall back to `Record<string, unknown>`.
- `mockData.json` is always generated alongside `mockData.ts`. They must contain identical data.

### File 2 — `mockConfig.ts`

The single source of truth for all mock flags, delays, and error simulations.

```ts
// Template — generated from MockCatalog

/**
 * MOCK CONFIGURATION — AUTO-GENERATED
 * Re-run the Mock Data Generator to add or remove API entries.
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                MOCK QUICK-TOGGLE REFERENCE                      ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  ALL APIs → mock     :  globalMockEnabled = true                ║
 * ║  ALL APIs → real     :  globalMockEnabled = false               ║
 * ║  ONE API  → mock     :  globalMockEnabled = false               ║
 * ║                         apiMockFlags['id'].mockEnabled = true   ║
 * ║  ONE API  → real     :  globalMockEnabled = false               ║
 * ║                         apiMockFlags['id'].mockEnabled = false  ║
 * ║  ONE API  → error    :  apiMockFlags['id'].mockError = {        ║
 * ║                           status: 401, message: 'Unauthorized'  ║
 * ║                         }                                       ║
 * ║  ONE API  → delay    :  apiMockFlags['id'].delayMs = 800        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * PRIORITY RULE (hard-coded — never change the order):
 *   globalMockEnabled is checked FIRST. When true, per-API flags are skipped entirely.
 */

export type MockDataRegistry = {
  // One key per API — TypeScript enforces exhaustive coverage at compile time
  {api.id}: Record<string, unknown>,   // repeat for every API
};

export type ApiMockFlagEntry = {
  mockEnabled: boolean;
  delayMs: number;
  mockError: { status: number; message: string } | null;
};

export type ApiMockFlags = {
  [K in keyof MockDataRegistry]: ApiMockFlagEntry;
};

export const mockConfig: {
  /** MAIN FLAG — true: all APIs use mock (overrides every per-API flag). */
  globalMockEnabled: boolean;
  /** PER-API FLAGS — effective only when globalMockEnabled is false. */
  apiMockFlags: ApiMockFlags;
} = {
  globalMockEnabled: {globalMockDefault},   // env-aware or explicit boolean

  apiMockFlags: {
    // ── {api.id} [{api.method} {api.endpoint}] ──────────────────────────
    // {api.description ?? 'No description.'}
    {api.id}: {
      mockEnabled: true,          // true = mock data | false = real API
      delayMs:     0,             // ms to delay the mock response (0 = instant)
      mockError:   null,          // null = no error | { status, message } = simulate error
    },
    // ... repeat for every API
  },
};
```

**Rules:**
- `globalMockEnabled` is set from `input.globalMockDefault`. If not provided, it is set to the environment-aware expression `process.env.NODE_ENV === 'development' || process.env.USE_MOCK === 'true'` so that mock mode auto-enables in dev/CI without manual edits.
- All per-API `mockEnabled` values default to `true` at generation time (conservative default: use mock until explicitly disabled).
- `delayMs` defaults to `0` for all APIs. Override per API in `perApiOverrides`.
- `mockError` defaults to `null` for all APIs.
- The `MockDataRegistry` type must list every API `id` as a key. A TypeScript compile error must occur if an API is added to `mockData.ts` without being added to `MockDataRegistry`.
- If `existingMockFiles` contains a prior `mockConfig.ts`, merge: preserve existing `mockEnabled`, `delayMs`, and `mockError` values for unchanged API ids; insert new entries with defaults; remove entries for APIs no longer in `apis[]` and emit WARN: `"API '{id}' was in the existing mockConfig but is no longer in the API catalog. Its flag entry has been removed."`

### File 3 — `mockResolver.ts`

Generated from the template in Step 4. No additional generation logic.

### File 4 — `index.ts` (barrel export)

Re-exports everything from the three mock modules under a single import path.

```ts
// shared/mocks/index.ts — AUTO-GENERATED

/**
 * Barrel export for the mock data layer.
 * Import from '@/shared/mocks' instead of individual files.
 *
 * Usage:
 *   import { resolveMock, mockConfig, mockData } from '@/shared/mocks';
 */
export { mockData }                         from './mockData';
export type { MockDataRegistry }            from './mockConfig';
export { mockConfig }                       from './mockConfig';
export type { ApiMockFlagEntry, ApiMockFlags } from './mockConfig';
export { resolveMock }                      from './mockResolver';
export type { MockResolution }              from './mockResolver';
```

---

## Step 6 — Validate the Generated Output

Before emitting the final result, run internal consistency checks.

```ts
// mock-data-generator/validateOutput.ts

export interface MockValidationResult {
  valid: boolean;
  violations: Violation[];
}

export function validateMockOutput(
  catalog: MockCatalog,
  mockDataFile: string,
  mockConfigFile: string,
  mockResolverFile: string,
  indexFile: string
): MockValidationResult {
  const violations: Violation[] = [];

  // 1. Entry count — mockData must have exactly one entry per API
  const catalogIds = new Set(catalog.entries.map((e) => e.id));
  const dataKeyRegex = /^\s{2}(\w+):/gm;
  const dataKeys = new Set([...mockDataFile.matchAll(dataKeyRegex)].map((m) => m[1]));

  for (const id of catalogIds) {
    if (!dataKeys.has(id)) {
      violations.push({
        severity: "FATAL",
        message: `API '${id}' is in the catalog but has no entry in mockData.ts.`,
      });
    }
  }
  for (const key of dataKeys) {
    if (!catalogIds.has(key)) {
      violations.push({
        severity: "FATAL",
        message: `mockData.ts contains key '${key}' with no matching API in the catalog.`,
      });
    }
  }

  // 2. MockDataRegistry completeness — every catalog id must appear as a type key
  for (const id of catalogIds) {
    if (!mockConfigFile.includes(`${id}:`)) {
      violations.push({
        severity: "FATAL",
        message: `API '${id}' is missing from MockDataRegistry in mockConfig.ts. TypeScript exhaustiveness check will fail.`,
      });
    }
  }

  // 3. Priority logic — resolver must check globalMockEnabled before apiMockFlags
  const globalCheckIndex = mockResolverFile.indexOf("mockConfig.globalMockEnabled");
  const perApiCheckIndex = mockResolverFile.indexOf("apiMockFlags");

  if (globalCheckIndex === -1) {
    violations.push({ severity: "FATAL", message: "mockResolver.ts does not check globalMockEnabled. Priority rule is violated." });
  }
  if (perApiCheckIndex !== -1 && globalCheckIndex > perApiCheckIndex) {
    violations.push({ severity: "FATAL", message: "mockResolver.ts checks apiMockFlags before globalMockEnabled. Priority rule is violated — global flag must be evaluated first." });
  }

  // 3b. Priority logic — resolver must NOT read apiMockFlags INSIDE the globalMockEnabled=true branch
  //     reading apiMockFlags to check flag.mockEnabled inside the global-true branch is a violation
  const globalTrueBlock = mockResolverFile.match(/if\s*\(\s*mockConfig\.globalMockEnabled\s*\)([\s\S]*?)(?=\n\s*\/\/\s*──\s*Priority 2|\n\s*const flag\s*=)/)?.[1] ?? "";
  if (globalTrueBlock.includes("flag.mockEnabled")) {
    violations.push({ severity: "FATAL", message: "mockResolver.ts checks flag.mockEnabled inside the globalMockEnabled=true branch. When globalMockEnabled is true, per-API flags must be completely ignored. Remove the flag.mockEnabled check from the global-true branch." });
  }

  // 4. No Math.random() or Date.now() — determinism rule
  if (/Math\.random\(\)|Date\.now\(\)/.test(mockDataFile)) {
    violations.push({ severity: "FATAL", message: "mockData.ts contains non-deterministic values (Math.random() or Date.now()). All mock values must be static literals." });
  }

  // 5. No 'any' type in generated files
  for (const [fileName, content] of [["mockData.ts", mockDataFile], ["mockConfig.ts", mockConfigFile]]) {
    if (/:\s*any\b/.test(content)) {
      violations.push({ severity: "WARN", message: `'any' type detected in ${fileName}. Replace with a specific type or 'Record<string, unknown>'.` });
    }
  }

  // 6. Barrel export completeness — index.ts must export all four public symbols
  const requiredExports = ["mockData", "mockConfig", "resolveMock", "MockResolution"];
  for (const sym of requiredExports) {
    if (!indexFile.includes(sym)) {
      violations.push({ severity: "WARN", message: `index.ts does not export '${sym}'. Consumers cannot import it from '@/shared/mocks'.` });
    }
  }

  // 7. mockData.json parity — JSON file must exist as a sibling
  // (validated by file-presence check in Step 5 generation; logged as WARN if absent)

  return {
    valid: violations.filter((v) => v.severity === "FATAL").length === 0,
    violations,
  };
}
```

**Decision point:**
- If any FATAL violations exist → collect all and **FAIL** before emitting any files. Surface the full violation list.
- WARN violations are included in the output but do not block file emission.
- If `valid: true` → emit all four files and the success report.

---

## Step 7 — Emit Output

Return the generated files and a structured result object.

**Output schema:**

```json
{
  "status": "success | failure",
  "apiCount": 10,
  "generatedFiles": [
    { "path": "src/shared/mocks/mockData.ts",      "content": "string" },
    { "path": "src/shared/mocks/mockData.json",    "content": "string" },
    { "path": "src/shared/mocks/mockConfig.ts",    "content": "string" },
    { "path": "src/shared/mocks/mockResolver.ts",  "content": "string" },
    { "path": "src/shared/mocks/index.ts",         "content": "string" }
  ],
  "mockCatalog": [
    {
      "id": "string",
      "method": "string",
      "endpoint": "string",
      "mockEnabled": true,
      "delayMs": 0,
      "mockError": null,
      "mockPayloadPreview": {}
    }
  ],
  "globalMockEnabled": true,
  "violations": [
    { "severity": "FATAL | WARN | INFO", "message": "string" }
  ]
}
```

**Emit rules:**
- `apiCount` must equal `apis[].length`. If it does not, something was silently dropped — halt and FAIL.
- `mockCatalog[]` is forwarded to the Final Validator and to the cross-skill consistency check in the orchestrator. Include it in every successful output.
- Always print a human-readable summary after file emission:

```
✅ Mock Data Generator — {apiCount} API(s) processed

  Global mock flag : {globalMockEnabled}
  Env-aware flag   : process.env.USE_MOCK=true also activates mock mode

  API Mock Registry:
  ┌────────────────────────────────┬────────┬───────────────────────────┬──────────┬────────┬───────────────┬─────────────────────┐
  │ API ID                         │ Method │ Endpoint                  │ Mock On  │ Delay  │ Error Sim     │ Data Source         │
  ├────────────────────────────────┼────────┼───────────────────────────┼──────────┼────────┼───────────────┼─────────────────────┤
  │ {id}                           │ {meth} │ {endpoint}                │ ✅ true  │ 0 ms   │ none          │ {dataSource}        │
  └────────────────────────────────┴────────┴───────────────────────────┴──────────┴────────┴───────────────┴─────────────────────┘

  Data Source legend:
    🟢 live-api probe   → real values from live API (most accurate)
    🟡 exampleValue     → developer-provided example values
    🔵 heuristic        → inferred from field name + type (fallback)

  Generated files:
    • src/shared/mocks/mockData.ts      (TypeScript mock payloads)
    • src/shared/mocks/mockData.json    (JSON sidecar for non-TS consumers)
    • src/shared/mocks/mockConfig.ts    (global + per-API flags, delays, errors)
    • src/shared/mocks/mockResolver.ts  (priority resolver)
    • src/shared/mocks/index.ts         (barrel export)

  ── Quick toggles ────────────────────────────────────────────────────────────
  ALL APIs → mock   :  globalMockEnabled = true   in mockConfig.ts
  ALL APIs → real   :  globalMockEnabled = false  in mockConfig.ts
             (or)   :  USE_MOCK=false              in .env
  ONE API  → real   :  globalMockEnabled = false
                       apiMockFlags['{anyId}'].mockEnabled = false
  ONE API  → error  :  apiMockFlags['{anyId}'].mockError = { status: 401, message: '...' }
  ONE API  → slow   :  apiMockFlags['{anyId}'].delayMs   = 1500
```

---

## Integration with the Flutter → RN Pipeline

This skill runs as **Step 11** in the pipeline — after API Integration (Step 10) and before the Data Layer Builder (Step 12). It is not optional when invoked via the orchestrator; its `mockOutput` artifact is required by the Data Layer Builder, the Test Generator, and the Final Validator.

| Pipeline Position | Skill |
|---|---|
| Step 10 | API Integration Mapper |
| **Step 11** | **Mock Data Generator (this skill)** |
| Step 12 | Data Layer Builder |
| Step 13 | Dependency Injector |
| Step 14 | React Native Component Generator |
| Step 15 | Code Quality and Accessibility Enhancer |
| Step 16 | Test Generator |
| Step 17 | React Native Environment Validator |
| Step 18 | API Execution Trace Documentation |
| Step 19 | Environment Configuration Generator |

The `mockCatalog[]` in this skill's output is forwarded to:
- **Data Layer Builder** — to embed `resolveMock()` usage patterns in generated data source methods
- **Test Generator** — as the authoritative source for MSW handler data, eliminating duplicate mock definitions
- **Final Validator** — to verify that every API discovered during conversion has a corresponding mock entry

**Stale mock detection (re-run scenario):**
When the orchestrator detects that `apiOutput.endpoints` has changed since the last run (added or removed endpoints), it automatically re-invokes this skill with `existingMockFiles` containing the prior `mockConfig.ts`. The skill merges new entries, removes stale ones, and preserves existing flag customizations.
