---
name: api-execution-trace
description: "MUST be used after the Data Layer Builder and API Integration skills have completed to generate a structured api_info.md documentation file for every feature module. Use when: documenting all API calls used in a feature with their exact resolved URLs; computing final request URLs by combining base URL, path parameters, and query parameters; verifying that every API call in the data layer is accounted for and documented; producing a deterministic, production-ready API trace that developers and QA can reference for debugging. Keywords: api documentation, execution trace, resolved url, final url, base url, endpoint, path parameters, query parameters, api_info.md, axios config, request body, headers, api audit."
priority: HIGH
auto-trigger: true
---

# API Execution Trace Documentation Skill

> Trigger this skill **after** the API Integration skill has produced `apiOutput` and the Data Layer Builder has produced `dataLayerOutput`. This skill owns the generation of `api_info.md` for every feature. It never generates code — it generates verified, executable documentation. Every URL it emits must be constructible from the actual implementation. If a URL cannot be deterministically resolved, this skill halts with a CRITICAL failure.

## Why Execution Trace Documentation Is Required

A feature's API surface area is only as trustworthy as its documentation. Without a resolved URL trace, three failure modes are guaranteed:

| Failure mode | Without this skill | With this skill |
|---|---|---|
| Wrong endpoint hit at runtime | No way to verify without running the app | Final Resolved URL is computed and verified statically |
| Missing query parameters | Auth or pagination parameters silently dropped | Every query param is enumerated and appended in the Final Request URL |
| Base URL misconfiguration | Hard-coded or environment-mismatched base URLs go undetected | Base URL is extracted from the Axios instance and validated at documentation time |

This skill does not guess. If a value is genuinely dynamic, it is expressed as a typed placeholder (e.g. `<userId: string>`). The placeholder is flagged as a WARN — it is never silently omitted.

---

## Step 1 — Receive and Validate Input

Accept outputs from the upstream pipeline and reject anything that prevents deterministic URL resolution.

**Input schema:**

```json
{
  "featureName": "string",
  "apiOutput": {
    "axiosConfig": {
      "baseURL": "string",
      "defaultHeaders": {}
    },
    "endpoints": [
      {
        "name": "string",
        "method": "GET | POST | PUT | DELETE | PATCH",
        "rawEndpoint": "string",
        "repositoryMethod": "string",
        "pathParams": {},
        "queryParams": {},
        "requestBody": {},
        "customHeaders": {}
      }
    ]
  },
  "dataLayerOutput": {
    "repositoryImpls": [
      {
        "name": "string",
        "methods": [
          {
            "name": "string",
            "apiCall": {
              "endpoint": "string",
              "method": "string"
            }
          }
        ]
      }
    ],
    "apiDataSources": [
      {
        "name": "string",
        "baseUrl": "string",
        "methods": [
          {
            "name": "string",
            "endpoint": "string",
            "httpMethod": "string",
            "pathParams": {},
            "queryParams": {},
            "requestBody": {}
          }
        ]
      }
    ]
  },
  "apiUsageContext": {
    "pathParams": {},
    "queryParams": {},
    "requestSamples": {}
  },
  "channelCalls": [
    {
      "channelName": "string",
      "channelType": "EventChannel | MethodChannel",
      "containingMethod": "string"
    }
  ]
}
```

**Decision points:**

- If `featureName` is empty or null → **FAIL**: `"FATAL: 'featureName' is required. Cannot generate api_info.md without a feature scope."`
- If `apiOutput.axiosConfig.baseURL` is empty or null → **FAIL**: `"FATAL: Base URL is missing from Axios config. Final URL cannot be resolved without a base URL."`
- If `apiOutput.endpoints` is empty → **FAIL**: `"FATAL: No API endpoints found in apiOutput for feature '{featureName}'. Either the API Integration skill produced no endpoints or the feature has no API calls. Verify apiOutput.endpoints is populated."`
- If any endpoint has an empty or null `rawEndpoint` → **FAIL** per endpoint: `"FATAL: Endpoint '{name}' in feature '{featureName}' has no rawEndpoint value. URL resolution is impossible."`
- If any endpoint has an empty or null `method` → **FAIL** per endpoint: `"FATAL: Endpoint '{name}' in feature '{featureName}' has no HTTP method. The endpoint record is incomplete."`
- If `dataLayerOutput.apiDataSources` is empty → add WARN: `"WARN: No API data sources found in dataLayerOutput. Cross-verification between data layer and API output will be skipped. API list will be sourced from apiOutput only."`
- If `apiUsageContext` is null or absent → add WARN: `"WARN: No apiUsageContext provided. Path and query parameters will be marked as dynamic placeholders where values cannot be resolved."`

**Rule:** This skill reads from `apiOutput` and `dataLayerOutput` only. It never reads source files directly, never invokes other skills, and never modifies any of the artifacts it receives.

---

## Step 2 — Cross-Verify API Surface Area

Before generating documentation, compare the API endpoints declared in `apiOutput` against the actual API calls present in `dataLayerOutput.apiDataSources`. This ensures the documentation reflects the real implementation — not a superset or subset of it.

```ts
// api-execution-trace/crossVerifyApis.ts

export interface CrossVerificationResult {
  verified: boolean;
  violations: CrossVerificationViolation[];
}

export interface CrossVerificationViolation {
  severity: "FATAL" | "WARN";
  type: "UNDOCUMENTED_API" | "PHANTOM_API" | "METHOD_MISMATCH" | "ENDPOINT_MISMATCH";
  message: string;
  endpoint: string;
}

export function crossVerifyApis(
  apiOutput: ApiOutput,
  dataLayerOutput: DataLayerOutput
): CrossVerificationResult {
  const violations: CrossVerificationViolation[] = [];

  // Build sets for comparison
  const declaredEndpoints = new Set(
    apiOutput.endpoints.map((e) => normalizeEndpoint(e.rawEndpoint))
  );
  const implementedEndpoints = new Set(
    dataLayerOutput.apiDataSources.flatMap((src) =>
      src.methods.map((m) => normalizeEndpoint(m.endpoint))
    )
  );

  // Check 1: Every implemented endpoint must be documented
  for (const implemented of implementedEndpoints) {
    if (!declaredEndpoints.has(implemented)) {
      violations.push({
        severity: "FATAL",
        type: "UNDOCUMENTED_API",
        message: `API endpoint '${implemented}' exists in the data layer but is not declared in apiOutput. This API call is undocumented and would be silently omitted from api_info.md.`,
        endpoint: implemented,
      });
    }
  }

  // Check 2: Every declared endpoint must exist in the implementation
  for (const declared of declaredEndpoints) {
    if (!implementedEndpoints.has(declared) && dataLayerOutput.apiDataSources.length > 0) {
      violations.push({
        severity: "FATAL",
        type: "PHANTOM_API",
        message: `API endpoint '${declared}' is declared in apiOutput but does not appear in any data source implementation. Documenting non-existent APIs produces misleading traces.`,
        endpoint: declared,
      });
    }
  }

  // Check 3: HTTP method consistency between layers
  for (const ep of apiOutput.endpoints) {
    const matchingImpl = dataLayerOutput.apiDataSources
      .flatMap((src) => src.methods)
      .find((m) => normalizeEndpoint(m.endpoint) === normalizeEndpoint(ep.rawEndpoint));

    if (matchingImpl && matchingImpl.httpMethod.toUpperCase() !== ep.method.toUpperCase()) {
      violations.push({
        severity: "FATAL",
        type: "METHOD_MISMATCH",
        message: `HTTP method mismatch for endpoint '${ep.rawEndpoint}': apiOutput declares '${ep.method}' but data layer uses '${matchingImpl.httpMethod}'. The implementation and the documentation must agree.`,
        endpoint: ep.rawEndpoint,
      });
    }
  }

  const hasFatal = violations.some((v) => v.severity === "FATAL");
  return { verified: !hasFatal, violations };
}

function normalizeEndpoint(raw: string): string {
  // Strip leading slash, lowercase, remove query strings
  return raw.replace(/^\//, "").toLowerCase().split("?")[0];
}
```

**Decision point:**
- If any `FATAL` violation is found → **HALT**. Do not generate `api_info.md`. Surface all violations together.
- If `dataLayerOutput.apiDataSources` is empty → skip cross-verification and emit WARN: `"Cross-verification skipped: no data sources found. api_info.md will be generated from apiOutput only."`

---

## Step 3 — Resolve Final URLs (CORE LOGIC)

For every endpoint, compute the exact URL that will be hit at runtime. This is the core responsibility of this skill. All four resolution phases must complete successfully before the endpoint is included in the output.

```ts
// api-execution-trace/resolveUrl.ts

export interface ResolvedEndpoint {
  name: string;
  method: string;
  rawEndpoint: string;
  resolvedPath: string;           // Path with path params substituted
  finalResolvedUrl: string;       // baseURL + resolvedPath
  finalRequestUrl: string;        // finalResolvedUrl + query string
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  requestBody: unknown;
  headers: Record<string, string>;
  description: string;
  hasDynamicValues: boolean;      // true if any placeholder was used
  resolutionWarnings: string[];
}

export function resolveEndpointUrl(
  endpoint: ApiEndpoint,
  axiosConfig: AxiosConfig,
  usageContext: ApiUsageContext | null
): ResolvedEndpoint {
  const warnings: string[] = [];
  let hasDynamic = false;

  // ── Phase 1: Resolve path parameters ──────────────────────────────────────
  const pathParamPattern = /\{(\w+)\}|:(\w+)/g;
  const rawPathParams = extractPathParams(endpoint.rawEndpoint, pathParamPattern);

  const resolvedPathParams: Record<string, string> = {};
  for (const param of rawPathParams) {
    const value =
      endpoint.pathParams?.[param] ??
      usageContext?.pathParams?.[param] ??
      null;

    if (value !== null && value !== undefined) {
      resolvedPathParams[param] = String(value);
    } else {
      resolvedPathParams[param] = `<${param}>`;
      hasDynamic = true;
      warnings.push(
        `Path parameter '{${param}}' in endpoint '${endpoint.rawEndpoint}' has no resolved value. ` +
        `Marked as '<${param}>' (dynamic). Replace with actual value in runtime context.`
      );
    }
  }

  // Replace {param} and :param patterns in the endpoint path
  let resolvedPath = endpoint.rawEndpoint;
  for (const [param, value] of Object.entries(resolvedPathParams)) {
    resolvedPath = resolvedPath
      .replace(new RegExp(`\\{${param}\\}`, "g"), value)
      .replace(new RegExp(`:${param}(?=[/?]|$)`, "g"), value);
  }

  // ── Phase 2: Validate the resolved path ───────────────────────────────────
  if (pathParamPattern.test(resolvedPath)) {
    throw new Error(
      `FATAL: Endpoint '${endpoint.rawEndpoint}' still contains unresolved path parameters ` +
      `after substitution: '${resolvedPath}'. All '{param}' and ':param' patterns must be resolved.`
    );
  }

  // ── Phase 3: Build base URL ────────────────────────────────────────────────
  const baseUrl = normalizeBaseUrl(axiosConfig.baseURL);
  if (!isValidUrl(baseUrl)) {
    throw new Error(
      `FATAL: Base URL '${axiosConfig.baseURL}' is not a valid URL. ` +
      `Cannot construct the Final Resolved URL for endpoint '${endpoint.rawEndpoint}'.`
    );
  }

  const finalResolvedUrl = combineUrlParts(baseUrl, resolvedPath);

  // ── Phase 4: Append query parameters ──────────────────────────────────────
  const allQueryParams: Record<string, string> = {
    ...(endpoint.queryParams ?? {}),
    ...(usageContext?.queryParams ?? {}),
  };

  let finalRequestUrl = finalResolvedUrl;
  if (Object.keys(allQueryParams).length > 0) {
    const queryString = Object.entries(allQueryParams)
      .map(([k, v]) => {
        const resolvedValue =
          v !== null && v !== undefined && v !== ""
            ? String(v)
            : (() => {
                hasDynamic = true;
                warnings.push(
                  `Query parameter '${k}' has no resolved value. Marked as '<${k}>' (dynamic).`
                );
                return `<${k}>`;
              })();
        return `${encodeURIComponent(k)}=${encodeURIComponent(resolvedValue)}`;
      })
      .join("&");
    finalRequestUrl = `${finalResolvedUrl}?${queryString}`;
  }

  // ── Phase 5: Merge headers ─────────────────────────────────────────────────
  const mergedHeaders: Record<string, string> = {
    ...axiosConfig.defaultHeaders,
    ...(endpoint.customHeaders ?? {}),
  };

  return {
    name: endpoint.name,
    method: endpoint.method,
    rawEndpoint: endpoint.rawEndpoint,
    resolvedPath,
    finalResolvedUrl,
    finalRequestUrl,
    pathParams: resolvedPathParams,
    queryParams: allQueryParams,
    requestBody: endpoint.requestBody ?? null,
    headers: mergedHeaders,
    description: endpoint.description ?? "",
    hasDynamicValues: hasDynamic,
    resolutionWarnings: warnings,
  };
}

function normalizeBaseUrl(raw: string): string {
  // Strip trailing slash for consistent joining
  return raw.replace(/\/+$/, "");
}

function combineUrlParts(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function extractPathParams(endpoint: string, pattern: RegExp): string[] {
  const params: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(pattern.source, pattern.flags);
  while ((match = regex.exec(endpoint)) !== null) {
    params.push(match[1] ?? match[2]);
  }
  return params;
}
```

**Resolution rules:**

| Scenario | Behavior |
|---|---|
| Path param with known value | Substituted directly: `/user/{id}` → `/user/123` |
| Path param with unknown value | Placeholder inserted: `/user/{id}` → `/user/<id>` + WARN |
| No query params | `finalRequestUrl === finalResolvedUrl` |
| Query params present | Appended with `?key=value&...` encoding |
| Empty query param value | Placeholder inserted: `?page=<page>` + WARN |
| Base URL with trailing slash | Normalized before concatenation |
| Invalid base URL format | **FATAL** — halts this endpoint's resolution |

**Decision point:**
- If `resolveEndpointUrl` throws a FATAL error for any endpoint → record the failure, continue resolving remaining endpoints, then halt after all endpoints are processed. Emit all FAILures together. Do not generate `api_info.md` if any endpoint fails resolution.
- If resolution produces only WARNs (dynamic placeholders) → include the endpoint in the output with all warnings recorded.

---

## Step 4 — Normalize and Deduplicate API List

Before generating the markdown, clean the resolved endpoint list to ensure consistent structure.

```ts
// api-execution-trace/normalizeApiList.ts

export function normalizeApiList(resolved: ResolvedEndpoint[]): ResolvedEndpoint[] {
  const seen = new Set<string>();
  const normalized: ResolvedEndpoint[] = [];

  for (const ep of resolved) {
    // Deduplication key: method + normalized endpoint
    const key = `${ep.method.toUpperCase()}:${ep.rawEndpoint.toLowerCase().trim()}`;

    if (seen.has(key)) {
      // Duplicate detected — skip with WARN
      console.warn(
        `WARN: Duplicate API entry detected and skipped: '${ep.method} ${ep.rawEndpoint}'. ` +
        `Only the first occurrence is documented.`
      );
      continue;
    }

    seen.add(key);
    normalized.push({
      ...ep,
      method: ep.method.toUpperCase(),
      name: ep.name.trim(),
      description: ep.description?.trim() ?? `${ep.method.toUpperCase()} ${ep.rawEndpoint}`,
    });
  }

  // Sort: GET → POST → PUT → PATCH → DELETE for consistent output order
  const methodOrder = ["GET", "POST", "PUT", "PATCH", "DELETE"];
  return normalized.sort(
    (a, b) =>
      (methodOrder.indexOf(a.method) ?? 99) - (methodOrder.indexOf(b.method) ?? 99)
  );
}
```

---

## Step 5 — Generate `api_info.md`

Produce the final markdown document. The format is strict and non-negotiable — every section must appear for every API, even when values are null or empty.

```ts
// api-execution-trace/generateMarkdown.ts

export function generateApiInfoMarkdown(
  featureName: string,
  axiosConfig: AxiosConfig,
  resolvedEndpoints: ResolvedEndpoint[],
  channelCalls: Array<{ channelName: string; channelType: string; containingMethod: string }> = []
): string {
  const lines: string[] = [];

  // ── Document header ──────────────────────────────────────────────────────
  lines.push(`# 📄 API Execution Trace — ${featureName}`);
  lines.push(``);
  lines.push(`> Generated by the API Execution Trace skill. Every URL in this document`);
  lines.push(`> is the exact URL that will be sent at runtime. Dynamic values are marked`);
  lines.push(`> with \`<placeholder>\` and accompanied by a ⚠️ warning.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── Base configuration ────────────────────────────────────────────────────
  lines.push(`## Base Configuration`);
  lines.push(``);
  lines.push(`- **Base URL:** \`${axiosConfig.baseURL}\``);
  lines.push(``);
  lines.push(`### Default Headers`);
  lines.push(``);
  lines.push("```json");
  lines.push(JSON.stringify(axiosConfig.defaultHeaders ?? {}, null, 2));
  lines.push("```");
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // ── API entries ───────────────────────────────────────────────────────────
  lines.push(`## APIs`);
  lines.push(``);

  for (let i = 0; i < resolvedEndpoints.length; i++) {
    const ep = resolvedEndpoints[i];
    lines.push(`---`);
    lines.push(``);
    lines.push(`### ${i + 1}. ${ep.name}`);
    lines.push(``);
    lines.push(`- **Endpoint:** \`${ep.rawEndpoint}\``);
    lines.push(`- **Method:** \`${ep.method}\``);
    if (ep.hasDynamicValues) {
      lines.push(`- ⚠️ **Contains dynamic values** — see warnings below`);
    }
    lines.push(``);

    // Path parameters
    lines.push(`---`);
    lines.push(``);
    lines.push(`#### 🔹 Path Parameters`);
    lines.push(``);
    lines.push("```json");
    lines.push(
      Object.keys(ep.pathParams).length > 0
        ? JSON.stringify(ep.pathParams, null, 2)
        : "null"
    );
    lines.push("```");
    lines.push(``);

    // Query parameters
    lines.push(`---`);
    lines.push(``);
    lines.push(`#### 🔹 Query Parameters`);
    lines.push(``);
    lines.push("```json");
    lines.push(
      Object.keys(ep.queryParams).length > 0
        ? JSON.stringify(ep.queryParams, null, 2)
        : "null"
    );
    lines.push("```");
    lines.push(``);

    // Final Resolved URL
    lines.push(`---`);
    lines.push(``);
    lines.push(`#### 🔥 Final Resolved URL`);
    lines.push(``);
    lines.push("```");
    lines.push(ep.finalResolvedUrl);
    lines.push("```");
    lines.push(``);

    // Final Request URL (with query params)
    lines.push(`---`);
    lines.push(``);
    lines.push(`#### 🔥 Final Request URL`);
    lines.push(``);
    lines.push("```");
    lines.push(ep.finalRequestUrl);
    lines.push("```");
    lines.push(``);

    // Headers
    lines.push(`---`);
    lines.push(``);
    lines.push(`#### Headers`);
    lines.push(``);
    lines.push("```json");
    lines.push(JSON.stringify(ep.headers, null, 2));
    lines.push("```");
    lines.push(``);

    // Request Body
    lines.push(`---`);
    lines.push(``);
    lines.push(`#### Request Body`);
    lines.push(``);
    lines.push("```json");
    lines.push(ep.requestBody !== null ? JSON.stringify(ep.requestBody, null, 2) : "null");
    lines.push("```");
    lines.push(``);

    // Description
    lines.push(`---`);
    lines.push(``);
    lines.push(`#### Description`);
    lines.push(``);
    lines.push(ep.description || `_No description provided for ${ep.name}._`);
    lines.push(``);

    // Resolution warnings
    if (ep.resolutionWarnings.length > 0) {
      lines.push(`---`);
      lines.push(``);
      lines.push(`#### ⚠️ Resolution Warnings`);
      lines.push(``);
      for (const warn of ep.resolutionWarnings) {
        lines.push(`- ${warn}`);
      }
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);

  // ── Streaming Channels ────────────────────────────────────────────────────────
  if (channelCalls.length > 0) {
    lines.push(`## Streaming Channels`);
    lines.push(``);
    lines.push(`> These are platform channels (EventChannel / MethodChannel) used for real-time data.`);
    lines.push(`> They are NOT routed through Axios. Document them here for QA and runtime debugging.`);
    lines.push(``);
    lines.push(`| Channel Name | Type | Triggering Method |`);
    lines.push(`|---|---|---|`);
    for (const ch of channelCalls) {
      lines.push(`| \`${ch.channelName}\` | ${ch.channelType} | \`${ch.containingMethod}()\` |`);
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  // ── WebView Endpoints ─────────────────────────────────────────────────────────
  const webviewEndpoints = resolvedEndpoints.filter((ep) => (ep as any).responseUsage === "webview-url" || (ep as any).responseUsage === "html");
  if (webviewEndpoints.length > 0) {
    lines.push(`## WebView Endpoints`);
    lines.push(``);
    lines.push(`> These endpoints return a URL or HTML loaded into a WebView — not parsed as JSON.`);
    lines.push(`> No DTO or mapper is generated for these. The data source method returns \`Promise<string>\`.`);
    lines.push(``);
    lines.push(`| Method | Endpoint | Final URL | Usage |`);
    lines.push(`|---|---|---|---|`);
    for (const ep of webviewEndpoints) {
      const usage = (ep as any).responseUsage === "html" ? "HTML (source.html)" : "URL (source.uri)";
      lines.push(`| \`${ep.method}\` | \`${ep.rawEndpoint}\` | \`${ep.finalResolvedUrl}\` | ${usage} |`);
    }
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  lines.push(`_End of API Execution Trace for **${featureName}**._`);

  return lines.join("\n");
}
```

---

## Step 6 — Validate Output

Before emitting the final artifact, run completeness validation on the generated document.

```ts
// api-execution-trace/validateOutput.ts

export interface ApiTraceViolation {
  severity: "FATAL" | "WARN";
  apiName: string;
  rule: string;
  message: string;
}

export function validateApiTraceOutput(
  resolvedEndpoints: ResolvedEndpoint[],
  rawMarkdown: string
): ApiTraceViolation[] {
  const violations: ApiTraceViolation[] = [];

  for (const ep of resolvedEndpoints) {
    // Rule 1: Method must be present
    if (!ep.method) {
      violations.push({
        severity: "FATAL",
        apiName: ep.name,
        rule: "METHOD_REQUIRED",
        message: `API '${ep.name}' is missing an HTTP method. The endpoint record is incomplete.`,
      });
    }

    // Rule 2: Endpoint must be present
    if (!ep.rawEndpoint) {
      violations.push({
        severity: "FATAL",
        apiName: ep.name,
        rule: "ENDPOINT_REQUIRED",
        message: `API '${ep.name}' is missing a raw endpoint value. URL resolution cannot proceed.`,
      });
    }

    // Rule 3: Final Resolved URL must be a valid URL (ignoring placeholder segments)
    const urlForValidation = ep.finalResolvedUrl.replace(/<[^>]+>/g, "PLACEHOLDER");
    try {
      new URL(urlForValidation);
    } catch {
      violations.push({
        severity: "FATAL",
        apiName: ep.name,
        rule: "INVALID_RESOLVED_URL",
        message: `Final Resolved URL for '${ep.name}' is not a valid URL: '${ep.finalResolvedUrl}'. Check the base URL and endpoint path.`,
      });
    }

    // Rule 4: Dynamic placeholders generate WARNs
    if (ep.hasDynamicValues) {
      violations.push({
        severity: "WARN",
        apiName: ep.name,
        rule: "DYNAMIC_PLACEHOLDER_USED",
        message: `API '${ep.name}' contains dynamic placeholder values. Replace '<param>' with actual values before using this trace to verify requests.`,
      });
    }

    // Rule 5: Empty request body on POST/PUT/PATCH is a WARN
    if (
      ["POST", "PUT", "PATCH"].includes(ep.method) &&
      (ep.requestBody === null || ep.requestBody === undefined)
    ) {
      violations.push({
        severity: "WARN",
        apiName: ep.name,
        rule: "EMPTY_BODY_ON_WRITE_METHOD",
        message: `API '${ep.name}' uses ${ep.method} but has no request body. Verify this is intentional.`,
      });
    }

    // Rule 6: The Final Resolved URL must appear in the markdown document
    if (!rawMarkdown.includes(ep.finalResolvedUrl)) {
      violations.push({
        severity: "FATAL",
        apiName: ep.name,
        rule: "URL_NOT_IN_DOCUMENT",
        message: `Final Resolved URL '${ep.finalResolvedUrl}' for API '${ep.name}' was resolved but is absent from the generated markdown. Document is inconsistent.`,
      });
    }
  }

  return violations;
}
```

**Decision point:**
- If any FATAL violation is found → discard the markdown and halt. Emit all violations.
- WARN violations → included in `output.violations` but do not prevent emitting the document.

---

## Step 7 — Produce Output Artifact

Assemble and return the final structured output for the orchestrator.

```ts
// api-execution-trace/index.ts

export interface ApiTraceOutput {
  fileName: string;                   // Always "api_info.md"
  content: string;                    // Full markdown string
  apiList: ResolvedEndpoint[];        // Structured list for programmatic consumers
  violations: ApiTraceViolation[];    // WARN-level violations (FATAL already halted)
  featureName: string;
  totalApis: number;
  hasDynamicValues: boolean;          // true if any API has unresolved placeholders
}

export async function runApiExecutionTraceSkill(input: ApiTraceInput): Promise<ApiTraceOutput> {
  // Step 1: Validate input
  validateInput(input);

  // Step 2: Cross-verify API surface area
  const crossVerification = crossVerifyApis(input.apiOutput, input.dataLayerOutput);
  if (!crossVerification.verified) {
    throw new Error(
      `FATAL: API cross-verification failed for feature '${input.featureName}':\n` +
      crossVerification.violations.map((v) => `  [${v.type}] ${v.message}`).join("\n")
    );
  }

  // Step 3: Resolve all endpoint URLs
  const resolutionErrors: string[] = [];
  const resolvedEndpoints: ResolvedEndpoint[] = [];

  for (const endpoint of input.apiOutput.endpoints) {
    try {
      const resolved = resolveEndpointUrl(
        endpoint,
        input.apiOutput.axiosConfig,
        input.apiUsageContext ?? null
      );
      resolvedEndpoints.push(resolved);
    } catch (err: unknown) {
      resolutionErrors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (resolutionErrors.length > 0) {
    throw new Error(
      `FATAL: URL resolution failed for ${resolutionErrors.length} endpoint(s) in feature '${input.featureName}':\n` +
      resolutionErrors.join("\n")
    );
  }

  // Step 4: Normalize and deduplicate
  const normalizedEndpoints = normalizeApiList(resolvedEndpoints);

  // Step 5: Generate markdown
  const markdown = generateApiInfoMarkdown(
    input.featureName,
    input.apiOutput.axiosConfig,
    normalizedEndpoints
  );

  // Step 6: Validate output
  const violations = validateApiTraceOutput(normalizedEndpoints, markdown);
  const fatalViolations = violations.filter((v) => v.severity === "FATAL");
  if (fatalViolations.length > 0) {
    throw new Error(
      `FATAL: Post-generation validation failed:\n` +
      fatalViolations.map((v) => `  [${v.rule}] ${v.message}`).join("\n")
    );
  }

  return {
    fileName: "api_info.md",
    content: markdown,
    apiList: normalizedEndpoints,
    violations: violations.filter((v) => v.severity === "WARN"),
    featureName: input.featureName,
    totalApis: normalizedEndpoints.length,
    hasDynamicValues: normalizedEndpoints.some((ep) => ep.hasDynamicValues),
  };
}
```

---

## Step 8 — Full Output Example

### Example 1: User Profile API (Static Parameters)

**Input context:**
- `baseURL`: `https://api.myapp.com/v2`
- Endpoint: `GET /users/{userId}/profile`
- `pathParams`: `{ "userId": "u-9921" }`
- `queryParams`: `{ "include": "avatar,settings" }`

**Generated section in `api_info.md`:**

```markdown
### 1. Get User Profile

- **Endpoint:** `/users/{userId}/profile`
- **Method:** `GET`

---

#### 🔹 Path Parameters

```json
{
  "userId": "u-9921"
}
```

---

#### 🔹 Query Parameters

```json
{
  "include": "avatar,settings"
}
```

---

#### 🔥 Final Resolved URL

```
https://api.myapp.com/v2/users/u-9921/profile
```

---

#### 🔥 Final Request URL

```
https://api.myapp.com/v2/users/u-9921/profile?include=avatar%2Csettings
```

---

#### Headers

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

---

#### Request Body

```json
null
```

---

#### Description

Returns the full profile object for the user identified by `userId`, including optional
embedded resources specified via the `include` query parameter.
```

---

### Example 2: Create Order API (Request Body + Dynamic Parameter)

**Input context:**
- `baseURL`: `https://orders.myapp.com`
- Endpoint: `POST /stores/{storeId}/orders`
- `pathParams`: `{ "storeId": null }` — no resolved value
- `queryParams`: `{}`
- `requestBody`: `{ "items": [...], "paymentMethodId": "pm_xyz" }`

**Generated section in `api_info.md`:**

```markdown
### 2. Create Order

- **Endpoint:** `/stores/{storeId}/orders`
- **Method:** `POST`
- ⚠️ **Contains dynamic values** — see warnings below

---

#### 🔹 Path Parameters

```json
{
  "storeId": "<storeId>"
}
```

---

#### 🔹 Query Parameters

```json
null
```

---

#### 🔥 Final Resolved URL

```
https://orders.myapp.com/stores/<storeId>/orders
```

---

#### 🔥 Final Request URL

```
https://orders.myapp.com/stores/<storeId>/orders
```

---

#### Headers

```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

---

#### Request Body

```json
{
  "items": [
    { "productId": "prod-001", "quantity": 2 },
    { "productId": "prod-048", "quantity": 1 }
  ],
  "paymentMethodId": "pm_xyz"
}
```

---

#### Description

Creates a new order for the specified store. The `storeId` path parameter
is resolved at runtime from the authenticated user's active store context.

---

#### ⚠️ Resolution Warnings

- Path parameter '{storeId}' in endpoint '/stores/{storeId}/orders' has no resolved value. Marked as '<storeId>' (dynamic). Replace with actual value in runtime context.
```

---

## Validation Rules Summary

| Rule | Severity | Condition |
|---|---|---|
| `featureName` absent | FATAL | Input validation |
| `baseURL` absent | FATAL | Input validation |
| No endpoints in `apiOutput` | FATAL | Input validation |
| Endpoint missing `rawEndpoint` | FATAL | Per-endpoint input validation |
| Endpoint missing `method` | FATAL | Per-endpoint input validation |
| Undocumented API in data layer | FATAL | Cross-verification |
| Phantom API (declared but not in implementation) | FATAL | Cross-verification |
| HTTP method mismatch between layers | FATAL | Cross-verification |
| Unresolved path parameters after substitution | FATAL | URL resolution |
| Invalid base URL format | FATAL | URL resolution |
| Final Resolved URL absent from markdown | FATAL | Post-generation validation |
| Dynamic placeholder used | WARN | URL resolution |
| Empty request body on POST/PUT/PATCH | WARN | Post-generation validation |
| No data sources for cross-verification | WARN | Cross-verification (skipped) |
| No `apiUsageContext` provided | WARN | Input validation |

---

## Edge Cases

| Edge Case | Handling |
|---|---|
| Endpoint uses `:param` Express-style params | Resolved identically to `{param}` syntax |
| Multiple path params in one endpoint | Each resolved independently |
| Query param with boolean value (`true`/`false`) | Serialized as `"true"` / `"false"` string |
| Array query param (`ids=[1,2,3]`) | Serialized as `ids=1&ids=2&ids=3` (multi-value) |
| Base URL has trailing slash | Stripped before concatenation to prevent double slashes |
| Endpoint does not start with `/` | Leading slash prepended automatically |
| Duplicate endpoints (same method + path) | First occurrence kept, subsequent entries WARNed and skipped |
| Request body is empty object `{}` | Serialized as `{}`, not `null` |
| No query params on GET | `finalRequestUrl === finalResolvedUrl`, no `?` appended |
| Auth header value unknown | Documented as `"Bearer <token>"` literal |

---

## Integration

**Depends on:**
- `api-integration` skill — provides `apiOutput.axiosConfig` and `apiOutput.endpoints`
- `data-layer-builder` skill — provides `dataLayerOutput.apiDataSources` for cross-verification

**Produces:**
- `api_info.md` — consumed by developers (debugging), QA (verification), and documentation systems

**Used by:**
- `flutter-rn-orchestrator` — invokes this skill as Step 17 (final pipeline step after validation)
- CI/documentation pipelines — for API surface change detection

---

## Constraints

| Constraint | Enforcement |
|---|---|
| Deterministic | Same input always produces same output. No randomness or timestamp-based file names |
| Reflects actual implementation | Cross-verification against `dataLayerOutput` ensures parity with the code |
| No hallucinated values | Every value must come from `apiOutput`, `dataLayerOutput`, or `apiUsageContext` — never fabricated |
| No missing endpoints | FATAL if any implemented endpoint is absent from the documentation |
| No phantom endpoints | FATAL if any documented endpoint is absent from the implementation |
| Production-ready markdown | Document is emitted exactly once, in the mandatory format, with all sections populated |

---

## File Layout Reference

```
api-execution-trace/
├── index.ts                  <- Entry point: runApiExecutionTraceSkill()
├── crossVerifyApis.ts        <- Step 2: cross-verification between apiOutput and dataLayerOutput
├── resolveUrl.ts             <- Step 3: CORE — path param substitution + URL construction
├── normalizeApiList.ts       <- Step 4: deduplication and ordering
├── generateMarkdown.ts       <- Step 5: api_info.md generation
├── validateOutput.ts         <- Step 6: post-generation validation
└── types.ts                  <- ApiTraceInput, ApiTraceOutput, ResolvedEndpoint, etc.
```
