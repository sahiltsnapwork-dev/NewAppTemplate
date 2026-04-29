---
name: api-integration
description: "MUST be used whenever a centralized Axios HTTP client, request/response interceptors, auth token handling, or shared API service configuration needs to be created or modified. Use when: setting up the shared Axios instance for a project; adding request interceptors for auth token injection; adding response interceptors for token refresh and error normalization; configuring retry logic for failed requests; creating feature-specific API service classes that extend the shared instance; auditing existing code for illegal direct fetch() or raw Axios usage outside the data layer. Keywords: axios, api integration, interceptors, auth token, token refresh, retry logic, centralized api, http client, bearer token, axios instance, api service."
priority: HIGH
auto-trigger: true
---

# API Integration

> Trigger this skill **before** the Data Layer Builder generates data source classes, and **after** the README / Constitution Reader has confirmed the declared HTTP client is Axios. This skill owns the shared Axios instance and all interceptor configuration. Every data source in every feature must import from this shared instance — direct `axios.create()` calls or `fetch()` calls outside this skill's output are always **FATAL**.

## The Centralized API Rule

A project with multiple Axios instances or scattered `fetch()` calls cannot reliably enforce auth, retry, or error normalization. This skill exists to ensure there is exactly one HTTP client configuration:

| Permitted | Forbidden |
|-----------|-----------|
| `import { apiClient } from '@/shared/api/apiClient'` | `import axios from 'axios'` in feature code |
| Calling the shared `apiClient` instance in data sources | `fetch(url)` anywhere in the codebase |
| Adding interceptors in `apiClient.ts` only | `axios.create()` in feature or data layer files |
| Feature-specific service classes that receive `apiClient` | Hard-coded `Authorization` headers in feature code |

Any violation of these rules discovered in existing code must be reported as a FATAL — not silently noted.

---

## Step 1 — Receive and Validate Input

Accept the project configuration and any existing API setup to audit before generating.

**Input schema:**

```json
{
  "baseUrl": "string | null",
  "resolvedBaseUrl": "string | null",
  "promptUserForBaseUrl": true,
  "flutterApiCalls": [
    {
      "library": "string",
      "method": "GET | POST | PUT | DELETE | PATCH",
      "rawEndpoint": "string",
      "containingMethod": "string",
      "headers": { "key": "value" },
      "requestBody": { "key": "value" },
      "queryParams": { "key": "value" },
      "pathParams": ["string"],
      "callLine": 0,
      "responseType": "json | webview-url | html | unknown"
    }
  ],
  "channelCalls": [
    {
      "channelName": "string",
      "channelType": "EventChannel | MethodChannel",
      "containingMethod": "string",
      "callLine": 0
    }
  ],
  "authStrategy": "bearer-token | api-key | none",
  "tokenStorageKey": "string | null",
  "tokenRefreshEndpoint": "string | null",
  "defaultTimeoutMs": 5000,
  "retryConfig": {
    "maxAttempts": 3,
    "delayMs": 500,
    "retryOnStatusCodes": [500, 502, 503, 504, 429]
  },
  "existingFiles": [
    { "path": "string", "content": "string" }
  ],
  "features": ["string"],
  "additionalBaseUrls": [
    { "clientName": "string", "baseUrl": "string", "authStrategy": "bearer-token | api-key | none" }
  ],
  "constitutionConfig": {
    "apiEndpoints": [
      { "method": "GET | POST | PUT | DELETE | PATCH | UNKNOWN", "path": "string", "description": "string | null", "responseType": "json | webview-url | html | unknown", "apiVersion": "v1 | v2 | null", "source": "gsd | constitution" }
    ],
    "concerns": [],
    "conventions": [],
    "primarySource": "gsd | constitution | mixed",
    "techStack": { "flutterNetworking": "string | null" }
  }
}
```

**Decision point — Base URL resolution (always follow all three steps in order):**

> **CRITICAL:** You must resolve `effectiveBaseUrl` before generating ANY code. Do NOT fabricate, guess, or invent a URL. Do NOT proceed past this decision point without a confirmed value.

**Step A — Always ask the user first. Do not skip this step.**
- **STOP ALL CODE GENERATION IMMEDIATELY.**
- Use the `vscode_askQuestions` tool to ask the user the following question and wait for their response before doing anything else:
  - Header: `"Base URL Required"`
  - Question: `"Please provide the Base URL for this API integration (e.g. https://api.example.com/v1). If you don't have it, type 'extract' to auto-extract it from the Flutter source files, or type 'skip' to insert a TODO placeholder."`
- **Do not generate any files. Do not emit any code. Do not assume any value. Wait for the user's answer.**
- After the user responds:
  - If they provide a URL → set `effectiveBaseUrl = providedUrl` and skip Steps B and C. Continue to the remaining decision checks below.
  - If they respond `'extract'` → proceed to Step B.
  - If they respond `'skip'` → proceed to Step C.
  - If the response is ambiguous → ask for clarification before continuing.

**Step B — Auto-extract from Flutter source (only reached if user responded 'extract'):**
- Attempt extraction of the base URL from the Flutter source files in the pipeline context (`resolvedBaseUrl`).
- If extraction yields a non-empty URL → set `effectiveBaseUrl = resolvedBaseUrl`. Emit: `"INFO: Using Base URL auto-extracted from Flutter source: '{resolvedBaseUrl}'. Verify this URL is correct before running the app."` Continue to the remaining decision checks below.
- If extraction yields nothing → proceed to Step C.

**Step C — TODO placeholder (only reached if extraction also failed or user responded 'skip'):**
- Set `effectiveBaseUrl = process.env.API_BASE_URL ?? '/* TODO: set API_BASE_URL in .env */'`
- Emit a WARN: `"Base URL could not be determined. A TODO placeholder has been inserted in apiClient.ts — you must set API_BASE_URL in your .env file before the app will function."`

- If `effectiveBaseUrl` contains a hard-coded environment-specific hostname (e.g. `localhost`, `staging.`, `dev.`) → add a WARN: `"'baseUrl' appears to be environment-specific. Use an environment variable (e.g. process.env.API_BASE_URL) instead of a hard-coded URL."`

**Endpoint sourcing rule — enforced before any file is generated:**

Every endpoint path used in generated code must come from exactly one of these sources, checked in this priority order:

1. **GSD INTEGRATIONS.md** (`constitutionConfig.apiEndpoints[]` where `source === "gsd"`) — if a matching path exists here, use it verbatim. This is the highest-authority source, derived from actual codebase analysis.
2. **README** (`constitutionConfig.apiEndpoints[]` where `source === "constitution"`) — if a matching path exists here, use it verbatim. This is the secondary authoritative source.
3. **Flutter source** (`flutterApiCalls[].rawEndpoint`) — use only when `rawEndpoint` is a non-null, non-empty string extracted literally from a Dart file by the Flutter Parser.

**GSD-first matching:** When matching `flutterApiCalls` entries to `constitutionConfig.apiEndpoints[]`, prefer GSD-sourced endpoints over constitution-sourced endpoints. If both exist for the same method+path combination, use the GSD version and emit: `"INFO: Endpoint '{method} {path}' matched from GSD INTEGRATIONS.md (primary source). README also declares this endpoint — GSD value takes precedence."`

**NEVER derive an endpoint path from: feature names, folder names, class names, method names, entity names, or any other contextual signal.** A path like `/portfolio/holdings` constructed because the folder is named `portfolio/` and the method is named `getHoldings()` is fabrication — treat it identically to a missing endpoint and FAIL.

- If `constitutionConfig.apiEndpoints[]` is non-empty → match each `flutterApiCalls` entry to a README endpoint by HTTP method + path. For any Flutter call with no README match, fall back to its `rawEndpoint` and emit WARN: `"Flutter call '{containingMethod}' could not be matched to a README-declared endpoint. Using Flutter-extracted rawEndpoint '{rawEndpoint}' as fallback. Verify this path is correct."`
- If `constitutionConfig.apiEndpoints[]` is empty AND `rawEndpoint` is null for a call → **FAIL**: `"FATAL: No endpoint could be sourced from the README or Flutter source for '{containingMethod}' at line {callLine}. Do NOT fabricate a path. Declare the endpoint in the README under an 'API Endpoints' section, or provide the Flutter source file containing the endpoint string."`

**Rule 3 — Actively probe GET endpoints before generating code; skip non-GET to avoid side effects:**
README and spec documents frequently omit intermediate path segments (e.g. the README declares `/{exchange}/block/recordCount/{n}` but the actual server requires `/{exchange}/option/block/recordCount/{n}`). The missing `/option/` segment causes a silent 404 — Axios catches the error, the repository returns an empty array, and the tab shows no data with no visible error.

Probing strategy by HTTP method — apply **before** writing any service method file:

| Endpoint method | Probe action |
|---|---|
| `GET` | Send a `HEAD` request first (no response body, minimal server load). If server returns `405` on `HEAD`, fall back to `GET`. |
| `POST / PUT / PATCH / DELETE` | **Do not probe.** A live request requires a real payload and auth token — probing safely is not possible. Emit `// TODO [URL-VERIFY]: manually confirm this path on the live server before shipping` on the endpoint constant line and add a WARN. |
| Any method — base URL is a TODO placeholder | Skip all probing. Emit `// TODO [URL-VERIFY]` on every endpoint constant. |

**Probe execution rules (GET endpoints only):**
- Substitute path params with safe, non-destructive probe values before building the URL: `exchange` → `"NSE"`, `symbol` → `"RELIANCE"`, `id` / `recordCount` / `n` / `page` / `limit` → `"1"`. Any unrecognised param → `"1"`.
- Use `fetch_webpage` (the agent's HTTP tool) to fire the probe. Never use `apiClient` or any generated code for the probe — the probe runs during generation, before any code is written.
- Probe each GET endpoint exactly once. Do not retry on non-404 failures.

**Decision rules after a GET probe:**

| Probe result | Action |
|---|---|
| `2xx` | Mark `[URL-VERIFIED]`. Generate the service method with no TODO comment. |
| `401` or `403` | Mark `[URL-VERIFIED-PATH]`. Path exists — auth missing in probe is expected. Generate normally. Emit INFO: `"Path '{path}' returned {status} — path confirmed, auth handled by interceptor."` |
| `404` | **STOP. Do not generate the service method.** Ask the user: `"Server returned 404 for '{probeUrl}'. The path '{path}' appears wrong. Provide the correct full path, or type 'skip' to generate a stub with a FATAL comment."` Re-probe any user-provided correction before accepting it. Only accept a corrected path if it returns `2xx`, `401`, or `403`. If user types `'skip'` → generate a stub with `// FATAL [URL-404]: path returned 404 during generation. Fix before shipping.` |
| `405 Method Not Allowed` on HEAD | Retry the probe as `GET`. If `GET` also returns `405` → treat as `[URL-VERIFIED-PATH]` (server does not allow anonymous GETs; path likely correct). |
| `5xx` | WARN: `"Server error during URL probe for '{path}'. Proceeding — re-verify when server recovers."` Generate normally. |
| Network / timeout error | WARN: `"Could not reach '{probeUrl}'. Proceeding with // TODO [URL-VERIFY] comment."` Generate with TODO. |

- If `authStrategy` is `"bearer-token"` and `tokenStorageKey` is null → **FAIL**: `"FATAL: authStrategy is 'bearer-token' but no 'tokenStorageKey' provided. Token injection interceptor cannot be configured."`
- If `authStrategy` is `"bearer-token"` and `tokenRefreshEndpoint` is null → add a WARN: `"No 'tokenRefreshEndpoint' provided. Token refresh interceptor will not be generated. 401 responses will be treated as terminal auth failures."`
- If `flutterApiCalls` is empty → add WARN: `"No Flutter API calls provided for fidelity validation. Generated endpoints cannot be verified against the Flutter source."` and continue.
- If `additionalBaseUrls` is null or absent and `features` contains endpoint paths that resolve to a distinctly different host or path prefix than `baseUrl` (e.g. a canonical API path `/canonical/portfolio/` vs a legacy path `/api/v2/`) → **FAIL**: `"FATAL: Mixed API base URL targets detected across features. Feature endpoints cannot all be served by a single Axios instance with 'baseUrl': '{baseUrl}'. Declare each distinct base URL as a named entry in 'additionalBaseUrls[]' and re-invoke the skill. Each named client (e.g. 'apiClient', 'canonicalApiClient') will be generated as a separate Axios instance with its own headers and auth interceptors."` Surface all conflicting endpoint paths in the error message.
- If any single feature module in `features[]` declares endpoints that map to two or more entries in `additionalBaseUrls[]` → **FAIL**: `"FATAL: Feature '{featureName}' targets multiple API base URLs: [{urls}]. A single feature's data source must target exactly one named API client. Extract the secondary-base-URL calls into a sibling data source class that receives a different named client via constructor injection."`
- If `additionalBaseUrls` is non-empty → generate one named Axios instance file per entry (e.g. `shared/api/{clientName}.ts`) using the same interceptor template as the primary `apiClient`; emit a WARN for each additional client: `"Additional named client '{clientName}' generated for '{baseUrl}'. Ensure feature data sources import the correct named client — importing the wrong instance will bypass auth headers silently."`
- If `channelCalls` is non-empty → do NOT generate Axios code for them. Pass them through as `channelCallsPassthrough[]` in the skill output so the API Execution Trace skill can document them under a `## Streaming Channels` section in `api_info.md`. Emit an INFO for each channel: `"INFO: Channel '{channelName}' ({channelType}) is a platform streaming channel — excluded from Axios client generation."`
- If both `v1` and `v2` `apiVersion` variants exist for the same endpoint path in `constitutionConfig.apiEndpoints` → generate both service methods with suffixes `V1` / `V2` (e.g. `getFnoDetailsV1`, `getFnoDetailsV2`) and emit a WARN: `"Dual versioned endpoints detected for '{path}'. Confirm which version is active (e.g. via Firebase Remote Config) before removing the other. Both methods are generated to avoid a forced cutover."`
- Scan `existingFiles` for forbidden patterns (Step 2) before generating anything

**Rule:** This skill generates shared infrastructure files only. It never generates feature-specific business logic and never imports from the domain or state layers.

---

## Step 2 — Audit Existing Code for Forbidden Patterns

Before writing a single line of output, scan all existing source files for API usage that violates the centralized API rule.

```ts
// api-integration/auditExistingCode.ts

export interface AuditViolation {
  filePath: string;
  line: number;
  pattern: string;
  severity: "FATAL" | "WARN";
  remediation: string;
}

const FORBIDDEN_PATTERNS: Array<{
  regex: RegExp;
  description: string;
  severity: "FATAL" | "WARN";
  remediation: string;
}> = [
  {
    regex: /\bfetch\s*\(/,
    description: "Direct fetch() call",
    severity: "FATAL",
    remediation: "Replace with the shared apiClient instance. fetch() bypasses all interceptors.",
  },
  {
    regex: /axios\.create\s*\(/,
    description: "axios.create() outside shared apiClient",
    severity: "FATAL",
    remediation: "Remove this axios.create() call. Import the shared apiClient from '@/shared/api/apiClient' instead.",
  },
  {
    regex: /import\s+axios\s+from\s+['"]axios['"]/,
    description: "Direct axios default import in feature code",
    severity: "FATAL",
    remediation: "Replace `import axios from 'axios'` with `import { apiClient } from '@/shared/api/apiClient'`.",
  },
  {
    regex: /Authorization.*Bearer.*["'`][A-Za-z0-9._-]{10,}/,
    description: "Hard-coded Authorization header with token value",
    severity: "FATAL",
    remediation: "Remove the hard-coded token. Auth headers are injected by the request interceptor.",
  },
  {
    regex: /XMLHttpRequest/,
    description: "Direct XMLHttpRequest usage",
    severity: "FATAL",
    remediation: "Replace XMLHttpRequest with the shared apiClient instance.",
  },
  {
    regex: /new\s+Request\s*\(/,
    description: "Fetch API Request constructor",
    severity: "FATAL",
    remediation: "Replace with the shared apiClient instance.",
  },
  {
    regex: /axios\.(get|post|put|delete|patch)\s*\(/,
    description: "Direct axios.METHOD() call (not via shared instance)",
    severity: "WARN",
    remediation: "Use apiClient.get/post/put/delete/patch() via the shared instance instead of axios directly.",
  },
];

export function auditExistingCode(
  existingFiles: Array<{ path: string; content: string }>
): AuditViolation[] {
  const violations: AuditViolation[] = [];

  for (const file of existingFiles) {
    // Skip the shared apiClient file itself
    if (file.path.includes("shared/api/apiClient")) continue;

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const { regex, description, severity, remediation } of FORBIDDEN_PATTERNS) {
        if (regex.test(lines[i])) {
          violations.push({
            filePath: file.path,
            line: i + 1,
            pattern: description,
            severity,
            remediation,
          });
        }
      }
    }
  }

  return violations;
}
```

**Decision point:**
- If any FATAL audit violations exist → collect all of them into `violations[]` and **FAIL** after the full audit is complete (scan all files before failing, so all violations are surfaced at once)
- WARN audit violations are included in `violations[]` but do not halt generation
- If no existing files provided → skip audit and add a WARN: `"No existing files provided for audit. Cannot verify centralized API usage in the codebase."`

---

## Step 3 — Create the Shared Axios Instance

Generate the single shared `apiClient` instance. This is the only place in the codebase where `axios.create()` is permitted.

```ts
// api-integration/generateApiClient.ts

export function generateApiClientFile(
  baseUrl: string,
  defaultTimeoutMs: number,
  basePath: string
): GeneratedFile {
  return {
    outputPath: `${basePath}/shared/api/apiClient.ts`,
    fileContent: `import axios from 'axios';

// This is the ONLY permitted Axios instance in the project.
// All features must import from this file — never call axios.create() directly.
export const apiClient = axios.create({
  baseURL: ${baseUrl.startsWith("process.env") || baseUrl.startsWith("Config.") ? baseUrl : `process.env.API_BASE_URL ?? '${baseUrl}'`},
  timeout: ${defaultTimeoutMs},
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default apiClient;
`,
  };
}
```

**Quality checks:**
- `baseURL` must use an environment variable (`process.env.API_BASE_URL`) as the primary source, with the provided `baseUrl` as a fallback only
- `timeout` is always set — an Axios instance without a timeout will hang indefinitely on network failures
- `Content-Type` and `Accept` headers are set at the instance level — individual data source methods must not re-declare them unless overriding

---

## Step 4 — Generate the Request Interceptor

The request interceptor injects the auth token into every outgoing request. It must never hard-code the token value.

```ts
// api-integration/generateRequestInterceptor.ts

export function generateRequestInterceptor(
  authStrategy: "bearer-token" | "api-key" | "none",
  tokenStorageKey: string | null,
  basePath: string
): GeneratedFile {
  if (authStrategy === "none") {
    return {
      outputPath: `${basePath}/shared/api/interceptors/requestInterceptor.ts`,
      fileContent: `import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '../apiClient';

// No auth strategy configured — request interceptor is a passthrough.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error: unknown) => Promise.reject(error)
);
`,
    };
  }

  const tokenReadExpression = authStrategy === "bearer-token"
    ? `// TODO: replace with your token retrieval logic (e.g. SecureStore, MMKV, Keychain)\n  const token = await getToken('${tokenStorageKey ?? "accessToken"}');`
    : `const apiKey = process.env.API_KEY;`;

  const authHeaderExpression = authStrategy === "bearer-token"
    ? `if (token) {\n    config.headers.Authorization = \`Bearer \${token}\`;\n  }`
    : `if (apiKey) {\n    config.headers['X-API-Key'] = apiKey;\n  }`;

  return {
    outputPath: `${basePath}/shared/api/interceptors/requestInterceptor.ts`,
    fileContent: `import type { InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '../apiClient';
import { getToken } from '../tokenStorage';

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    ${tokenReadExpression}
    ${authHeaderExpression}
    return config;
  },
  (error: unknown) => Promise.reject(error)
);
`,
  };
}
```

**Quality checks:**
- Token retrieval is delegated to a `getToken()` helper — never read from a storage API directly inside the interceptor
- The interceptor must always return the `config` object — a missing `return config` will silently drop all requests
- API keys must be sourced from `process.env` — never a literal string in source code
- If `tokenStorageKey` is provided but `getToken` helper does not exist yet → emit a `// TODO:` comment and add a WARN: `"'getToken' helper not found. Generate a token storage utility before wiring the request interceptor."`

---

## Step 5 — Generate the Response Interceptor

The response interceptor handles token refresh on 401, normalizes error responses, and implements retry logic.

```ts
// api-integration/generateResponseInterceptor.ts

export function generateResponseInterceptor(
  tokenRefreshEndpoint: string | null,
  retryConfig: RetryConfig,
  basePath: string
): GeneratedFile {
  const refreshBlock = tokenRefreshEndpoint
    ? generateTokenRefreshBlock(tokenRefreshEndpoint)
    : `// No token refresh endpoint configured.\n    // 401 responses are treated as terminal — clear token and redirect to login.\n    await clearToken();\n    // TODO: dispatch logout action or navigate to login screen`;

  return {
    outputPath: `${basePath}/shared/api/interceptors/responseInterceptor.ts`,
    fileContent: `import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { apiClient } from '../apiClient';
import { getToken, setToken, clearToken } from '../tokenStorage';

// Track in-progress token refresh to prevent parallel refresh calls
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function notifySubscribers(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean });

    // --- 401 Unauthorized: attempt token refresh ---
    if (error.response?.status === 401 && !originalRequest?._retry) {
      if (isRefreshing) {
        // Queue request until refresh completes
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            if (originalRequest?.headers) {
              originalRequest.headers.Authorization = \`Bearer \${newToken}\`;
            }
            resolve(apiClient(originalRequest!));
          });
        });
      }

      originalRequest!._retry = true;
      isRefreshing = true;

      try {
        ${refreshBlock}
        isRefreshing = false;
        return apiClient(originalRequest!);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        await clearToken();
        return Promise.reject(refreshError);
      }
    }

    // --- Retry logic for server errors ---
    return Promise.reject(error);
  }
);
`,
  };
}

function generateTokenRefreshBlock(refreshEndpoint: string): string {
  return `const refreshToken = await getToken('refreshToken');
        if (!refreshToken) throw new Error('No refresh token available');

        const { data } = await axios.post('${refreshEndpoint}', { refreshToken });
        await setToken('accessToken', data.accessToken);
        if (data.refreshToken) await setToken('refreshToken', data.refreshToken);

        const newToken = data.accessToken;
        notifySubscribers(newToken);
        if (originalRequest?.headers) {
          originalRequest.headers.Authorization = \`Bearer \${newToken}\`;
        }`;
}
```

**Quality checks:**
- The `isRefreshing` flag and `refreshSubscribers` queue prevent a token refresh stampede — multiple 401 responses in-flight will queue behind the single refresh call, not each trigger their own refresh
- The refresh call uses the raw `axios.post` (not `apiClient`) to avoid an infinite loop where the refresh request itself triggers the 401 interceptor
- `_retry` flag prevents infinite retry loops on persistent 401 responses
- If `tokenRefreshEndpoint` is null → emit `clearToken()` + TODO comment; never attempt a refresh

---

## Step 6 — Generate the Retry Interceptor

Implement configurable retry logic as a separate response interceptor that handles transient server errors.

```ts
// api-integration/generateRetryInterceptor.ts

export function generateRetryInterceptor(
  retryConfig: RetryConfig,
  basePath: string
): GeneratedFile {
  return {
    outputPath: `${basePath}/shared/api/interceptors/retryInterceptor.ts`,
    fileContent: `import type { AxiosError } from 'axios';
import { apiClient } from '../apiClient';

const RETRY_STATUS_CODES = new Set(${JSON.stringify(retryConfig.retryOnStatusCodes)});
const MAX_ATTEMPTS = ${retryConfig.maxAttempts};
const BASE_DELAY_MS = ${retryConfig.delayMs};

apiClient.interceptors.response.use(
  undefined, // passthrough successful responses
  async (error: AxiosError & { _retryCount?: number }) => {
    const config = error.config as typeof error.config & { _retryCount?: number };

    if (!config) return Promise.reject(error);

    const status = error.response?.status ?? 0;
    const shouldRetry = RETRY_STATUS_CODES.has(status);

    config._retryCount = config._retryCount ?? 0;

    if (!shouldRetry || config._retryCount >= MAX_ATTEMPTS) {
      return Promise.reject(error);
    }

    config._retryCount += 1;
    // Exponential backoff: delay doubles on each attempt
    const delay = BASE_DELAY_MS * Math.pow(2, config._retryCount - 1);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return apiClient(config);
  }
);
`,
  };
}
```

**Quality checks:**
- Retry uses exponential backoff (`BASE_DELAY_MS * 2^attempt`) — fixed-interval retries hammer a degraded server and worsen the situation
- `429 Too Many Requests` is in the default retry set but should ideally respect the `Retry-After` header — emit a WARN: `"Retry interceptor does not read the 'Retry-After' header for 429 responses. For production use, parse this header to avoid violating rate limits."`
- Retry interceptor is registered separately from the 401 response interceptor to keep responsibilities isolated

---

## Step 7 — Generate the Token Storage Utility

Provide a platform-appropriate, injectable token storage helper. The interceptors import from this file — they never access storage directly.

```ts
// api-integration/generateTokenStorage.ts

export function generateTokenStorageFile(
  tokenStorageKey: string,
  basePath: string
): GeneratedFile {
  return {
    outputPath: `${basePath}/shared/api/tokenStorage.ts`,
    fileContent: `// Token storage — the ONLY place permitted to read/write auth tokens.
// Replace the implementation with SecureStore, MMKV, or Keychain for production.
// This interface is intentionally simple — swap the implementation without changing interceptors.

// TODO: replace AsyncStorage with a secure storage solution before production deployment.
// Recommended: expo-secure-store, react-native-mmkv, or react-native-keychain.
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getToken(key: string = '${tokenStorageKey}'): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setToken(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function clearToken(key: string = '${tokenStorageKey}'): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function clearAllTokens(): Promise<void> {
  await AsyncStorage.multiRemove(['${tokenStorageKey}', 'refreshToken']);
}
`,
  };
}
```

**Rule:** The `tokenStorage.ts` file uses `AsyncStorage` as a default placeholder only. A WARN is always emitted: `"AsyncStorage is not secure for storing auth tokens. Replace with expo-secure-store, react-native-mmkv (encrypted), or react-native-keychain before production deployment."`. This WARN is non-blocking but mandatory.

---

## Step 8 — Generate the API Client Bootstrap

Create a single bootstrap file that registers all interceptors in the correct order. Callers import this file once at app startup.

```ts
// api-integration/generateApiClientBootstrap.ts

export function generateBootstrapFile(
  authStrategy: string,
  hasRetry: boolean,
  basePath: string
): GeneratedFile {
  return {
    outputPath: `${basePath}/shared/api/setupApiClient.ts`,
    fileContent: `// Import this file ONCE at app startup (e.g. in App.tsx or index.ts).
// Interceptors are registered in order: request → response (401/refresh) → response (retry).
// Order matters — do not reorder without understanding interceptor chain behavior.

import './interceptors/requestInterceptor';
${authStrategy !== "none" ? `import './interceptors/responseInterceptor';` : ""}
${hasRetry ? `import './interceptors/retryInterceptor';` : ""}

// Re-export the configured instance for convenience
export { apiClient } from './apiClient';
`,
  };
}
```

**Quality check:** This file contains only side-effect imports — it registers interceptors by importing them. It must export `apiClient` so callers can import client and setup from a single path.

---

## Step 9 — Validate API Integration Output

Run a final cross-reference check across all generated files before returning.

```ts
// api-integration/validateApiIntegration.ts

export function validateApiIntegration(
  generatedFiles: GeneratedFile[],
  authStrategy: string,
  tokenRefreshEndpoint: string | null,
  auditViolations: AuditViolation[]
): Violation[] {
  const violations: Violation[] = [...auditViolations.map(toViolation)];

  const filePaths = new Set(generatedFiles.map((f) => f.outputPath));

  // 1. Shared instance must exist
  if (!filePaths.has(`shared/api/apiClient.ts`) && !generatedFiles.some((f) => f.outputPath.endsWith("apiClient.ts"))) {
    violations.push({ severity: "FATAL", message: "Shared apiClient.ts was not generated. All other interceptor files depend on it." });
  }

  // 2. Auth interceptor must exist when auth strategy is not none
  if (authStrategy !== "none" && !generatedFiles.some((f) => f.outputPath.includes("requestInterceptor"))) {
    violations.push({ severity: "FATAL", message: "Auth strategy is configured but no request interceptor was generated." });
  }

  // 3. Token storage must exist when auth strategy is bearer-token
  if (authStrategy === "bearer-token" && !generatedFiles.some((f) => f.outputPath.includes("tokenStorage"))) {
    violations.push({ severity: "FATAL", message: "Bearer token auth requires tokenStorage.ts but it was not generated." });
  }

  // 4. Scan generated files for the same forbidden patterns
  for (const file of generatedFiles) {
    if (file.outputPath.includes("apiClient.ts")) continue; // the one place axios.create is allowed
    if (/\bfetch\s*\(/.test(file.fileContent)) {
      violations.push({ severity: "FATAL", message: `Generated file '${file.outputPath}' contains a direct fetch() call.` });
    }
    if (/axios\.create\s*\(/.test(file.fileContent) && !file.outputPath.includes("apiClient.ts")) {
      violations.push({ severity: "FATAL", message: `Generated file '${file.outputPath}' calls axios.create(). Only apiClient.ts may call axios.create().` });
    }
  }

  // 5. Bootstrap file must import all generated interceptors
  const bootstrapFile = generatedFiles.find((f) => f.outputPath.includes("setupApiClient"));
  if (bootstrapFile) {
    if (authStrategy !== "none" && !bootstrapFile.fileContent.includes("requestInterceptor")) {
      violations.push({ severity: "FATAL", message: "setupApiClient.ts is missing the requestInterceptor import." });
    }
  } else {
    violations.push({ severity: "FATAL", message: "setupApiClient.ts bootstrap file was not generated." });
  }

  return violations;
}
```

Run through this checklist before returning:

- [ ] All existing source files were audited — no `fetch()`, `axios.create()`, or direct `axios` imports found outside `apiClient.ts`
- [ ] `apiClient.ts` uses `process.env.API_BASE_URL` (not a hard-coded URL) as the primary base URL source
- [ ] `apiClient.ts` has a `timeout` value set
- [ ] Request interceptor reads the token from `tokenStorage.ts`, not from any storage API directly
- [ ] Response interceptor uses the `isRefreshing` + subscriber queue pattern to prevent refresh stampedes
- [ ] Retry interceptor uses exponential backoff, not a fixed delay
- [ ] `tokenStorage.ts` has a WARN about replacing `AsyncStorage` with a secure alternative
- [ ] `setupApiClient.ts` imports all generated interceptors in the correct order
- [ ] `violations[]` contains no `FATAL` entries before returning
- [ ] `apiOutput.confirmedBaseUrl` is set to `effectiveBaseUrl` — the exact value resolved in Step 1 (user-provided, auto-extracted, or TODO placeholder). This field is **mandatory** — the orchestrator reads it after Step 10 to populate `pipelineContext.resolvedBaseUrl` and the `.env` file. If it is null or absent the pipeline emits a FATAL.

---

## Step 10 — Validate Flutter API Fidelity

Run this step when `flutterApiCalls` is non-empty. Compare every generated data source method against its Flutter counterpart to guarantee exact replication of the API contract.

```ts
// api-integration/validateFlutterFidelity.ts

export interface FidelityViolation {
  severity: "FATAL" | "WARN";
  endpointId: string;         // "{method} {path}" e.g. "GET /users/{id}/profile"
  field: "method" | "path" | "headers" | "body" | "queryParams" | "pathParams";
  flutterValue: string;
  generatedValue: string;
  message: string;
}

export interface EndpointFidelityResult {
  endpointId: string;
  passed: boolean;
  violations: FidelityViolation[];
}

export function validateFlutterFidelity(
  flutterApiCalls: FlutterApiCall[],
  generatedFiles: GeneratedFile[]
): EndpointFidelityResult[] {
  const results: EndpointFidelityResult[] = [];

  for (const flutter of flutterApiCalls) {
    const violations: FidelityViolation[] = [];
    const endpointId = `${flutter.method} ${flutter.rawEndpoint}`;

    // ── Find the generated data source method that corresponds to this Flutter call ──
    const generatedMethod = findGeneratedMethod(flutter.containingMethod, generatedFiles);

    if (!generatedMethod) {
      violations.push({
        severity: "FATAL",
        endpointId,
        field: "path",
        flutterValue: flutter.rawEndpoint,
        generatedValue: "<not generated>",
        message: `Flutter API call '${flutter.containingMethod}' (${endpointId}) has no corresponding generated data source method. This endpoint was not converted.`,
      });
      results.push({ endpointId, passed: false, violations });
      continue;
    }

    // ── HTTP method check ──────────────────────────────────────────────────────────
    const generatedMethod_http = extractHttpMethodFromGenerated(generatedMethod);
    if (generatedMethod_http && generatedMethod_http.toUpperCase() !== flutter.method.toUpperCase()) {
      violations.push({
        severity: "FATAL",
        endpointId,
        field: "method",
        flutterValue: flutter.method,
        generatedValue: generatedMethod_http,
        message: `HTTP method mismatch for '${flutter.containingMethod}': Flutter uses ${flutter.method}, generated uses ${generatedMethod_http}. This will call the wrong endpoint.`,
      });
    }

    // ── Endpoint path check ────────────────────────────────────────────────────────
    const generatedPath = extractPathFromGenerated(generatedMethod);
    if (generatedPath && !pathsMatch(flutter.rawEndpoint, generatedPath)) {
      violations.push({
        severity: "FATAL",
        endpointId,
        field: "path",
        flutterValue: flutter.rawEndpoint,
        generatedValue: generatedPath,
        message: `Endpoint path mismatch for '${flutter.containingMethod}': Flutter calls '${flutter.rawEndpoint}', generated calls '${generatedPath}'. Paths must be identical.`,
      });
    }

    // ── Required headers check ─────────────────────────────────────────────────────
    if (flutter.headers && Object.keys(flutter.headers).length > 0) {
      for (const [headerName, headerValue] of Object.entries(flutter.headers)) {
        // Skip standard headers that are set by the interceptor (Authorization, Content-Type)
        if (["authorization", "content-type", "accept"].includes(headerName.toLowerCase())) continue;

        if (!generatedMethod.content.toLowerCase().includes(headerName.toLowerCase())) {
          violations.push({
            severity: "FATAL",
            endpointId,
            field: "headers",
            flutterValue: `${headerName}: ${headerValue}`,
            generatedValue: "<missing>",
            message: `Custom header '${headerName}' present in Flutter call but absent from generated method '${flutter.containingMethod}'. Add it to the data source method's config.headers.`,
          });
        }
      }
    }

    // ── Request body structure check ───────────────────────────────────────────────
    if (flutter.requestBody && Object.keys(flutter.requestBody).length > 0) {
      const expectedKeys = Object.keys(flutter.requestBody);
      for (const key of expectedKeys) {
        if (!generatedMethod.content.includes(key)) {
          violations.push({
            severity: "FATAL",
            endpointId,
            field: "body",
            flutterValue: JSON.stringify(flutter.requestBody),
            generatedValue: "<body key missing>",
            message: `Request body key '${key}' required by Flutter '${flutter.containingMethod}' is absent from the generated data source method. Ensure the full request body is replicated.`,
          });
        }
      }
    }

    // ── Query parameter check ──────────────────────────────────────────────────────
    if (flutter.queryParams && Object.keys(flutter.queryParams).length > 0) {
      for (const param of Object.keys(flutter.queryParams)) {
        if (!generatedMethod.content.includes(param)) {
          violations.push({
            severity: "WARN",
            endpointId,
            field: "queryParams",
            flutterValue: param,
            generatedValue: "<missing>",
            message: `Query parameter '${param}' present in Flutter call but not found in generated method '${flutter.containingMethod}'. Verify params object includes it.`,
          });
        }
      }
    }

    // ── Path parameter check ───────────────────────────────────────────────────────
    if (flutter.pathParams && flutter.pathParams.length > 0) {
      for (const param of flutter.pathParams) {
        const interpolated = `\${${param}}`;
        if (!generatedMethod.content.includes(interpolated) && !generatedMethod.content.includes(`/${param}/`) && !generatedMethod.content.includes(`{${param}}`)) {
          violations.push({
            severity: "FATAL",
            endpointId,
            field: "pathParams",
            flutterValue: param,
            generatedValue: "<path param not interpolated>",
            message: `Path parameter '${param}' from Flutter '${flutter.containingMethod}' is not interpolated in the generated endpoint path. Use template literals: \`/endpoint/\${${param}}\`.`,
          });
        }
      }
    }

    results.push({ endpointId, passed: !violations.some((v) => v.severity === "FATAL"), violations });
  }

  return results;
}

function pathsMatch(flutterPath: string, generatedPath: string): boolean {
  // Normalize: strip leading/trailing slashes, replace path param formats
  const normalize = (p: string) =>
    p.replace(/^\/|\/$/g, "")
     .replace(/\{(\w+)\}/g, ":$1")    // Flutter {param} → :param
     .replace(/\$\{(\w+)\}/g, ":$1"); // TS ${param} → :param
  return normalize(flutterPath) === normalize(generatedPath);
}
```

**Decision point:**
- Any `FidelityViolation` with `severity: "FATAL"` causes the `apiOutput.valid` flag to be set to `false` — the pipeline treats this as a CRITICAL error.
- All fidelity violations (FATAL and WARN) are included in `apiOutput.fidelityReport[]` for traceability.
- Emit a summary after the full fidelity check: `"API Fidelity Report: {total} endpoints checked. {passed} passed, {failed} failed, {warnings} warnings."` 
- If any endpoint was NOT found in the Flutter source but exists in the generated output → WARN: `"Generated endpoint '{path}' has no corresponding Flutter API call. It may be an incorrectly carried-over endpoint or a new addition. Verify intentionality."`

---

## Step 11 — Generate the API Discrepancy Log

For every `FidelityViolation` found in Step 10, produce a structured discrepancy log entry that developers can use to fix mismatches.

```ts
// api-integration/generateDiscrepancyLog.ts

export interface DiscrepancyLogEntry {
  index: number;
  endpointId: string;
  severity: "FATAL" | "WARN";
  field: string;
  flutterValue: string;
  generatedValue: string;
  fix: string;           // Specific instruction for the developer
}

export function generateDiscrepancyLog(
  fidelityResults: EndpointFidelityResult[]
): DiscrepancyLogEntry[] {
  const entries: DiscrepancyLogEntry[] = [];
  let index = 1;

  for (const result of fidelityResults) {
    for (const violation of result.violations) {
      entries.push({
        index: index++,
        endpointId: violation.endpointId,
        severity: violation.severity,
        field: violation.field,
        flutterValue: violation.flutterValue,
        generatedValue: violation.generatedValue,
        fix: generateFix(violation),
      });
    }
  }

  return entries;
}

function generateFix(v: FidelityViolation): string {
  switch (v.field) {
    case "method":
      return `Change the generated Axios call from .${v.generatedValue.toLowerCase()}() to .${v.flutterValue.toLowerCase()}() in the data source method.`;
    case "path":
      return `Replace the generated path '${v.generatedValue}' with '${v.flutterValue}' in the data source method. Verify path param interpolation uses template literals.`;
    case "headers":
      return `Add the header '${v.flutterValue}' to the Axios request config in the data source method: config: { headers: { '${v.flutterValue.split(':')[0].trim()}': value } }`;
    case "body":
      return `Add the missing body key '${v.flutterValue}' to the request payload object in the data source method.`;
    case "queryParams":
      return `Add the query parameter '${v.flutterValue}' to the params object: apiClient.get(path, { params: { ${v.flutterValue}: value } })`;
    case "pathParams":
      return `Interpolate the path parameter using a template literal: \`/endpoint/\${${v.flutterValue}}\` in the data source method.`;
    default:
      return `Review and fix the discrepancy in '${v.endpointId}' for field '${v.field}'.`;
  }
}
```

**Rule:** The discrepancy log is always included in `apiOutput.discrepancyLog[]` even when it is empty (empty array = all endpoints pass fidelity check). A non-empty discrepancy log with FATAL entries prevents the pipeline from advancing past Step 10.

---

## File Layout Reference

```
api-integration/
├── index.ts                              ← Orchestrator: runs steps 1–11 in order
├── auditExistingCode.ts                  ← Step 2: forbidden pattern scanner
├── generateApiClient.ts                  ← Step 3: shared axios.create() instance
├── generateRequestInterceptor.ts         ← Step 4: auth token injection
├── generateResponseInterceptor.ts        ← Step 5: 401 handling + token refresh
├── generateRetryInterceptor.ts           ← Step 6: exponential backoff retry
├── generateTokenStorage.ts              ← Step 7: token read/write/clear helpers
├── generateApiClientBootstrap.ts         ← Step 8: setupApiClient.ts entry point
├── validateApiIntegration.ts             ← Step 9: cross-reference + forbidden pattern check
├── validateFlutterFidelity.ts            ← Step 10: Flutter API fidelity validation
├── generateDiscrepancyLog.ts             ← Step 11: discrepancy log generation
├── errors.ts                             ← ApiIntegrationFatalError, Violation types
└── __tests__/
    ├── auditExistingCode.test.ts
    ├── generateResponseInterceptor.test.ts
    ├── generateRetryInterceptor.test.ts
    ├── validateApiIntegration.test.ts
    ├── validateFlutterFidelity.test.ts
    └── generateDiscrepancyLog.test.ts

Generated output (written to shared folder by caller):
src/shared/api/
├── apiClient.ts                ← ONLY permitted axios.create() call
├── setupApiClient.ts           ← Bootstrap — import once at app startup
├── tokenStorage.ts             ← Token read/write/clear abstraction
└── interceptors/
    ├── requestInterceptor.ts   ← Auth token injection
    ├── responseInterceptor.ts  ← 401 detection + token refresh + queue
    └── retryInterceptor.ts     ← Exponential backoff retry
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| One instance, one place | `axios.create()` is called exactly once in `apiClient.ts` — all other files import the instance |
| `fetch()` is always FATAL | The `fetch()` API bypasses all interceptors and is unconditionally forbidden |
| Token injection via interceptor | Auth headers are never set in feature code — the request interceptor handles all token injection |
| Refresh stampede prevention | The `isRefreshing` flag and subscriber queue ensure exactly one refresh call is in flight at any time |
| Exponential backoff | Retry delays double on each attempt — fixed-interval retries under load worsen server degradation |
| Secure storage is mandatory for production | `AsyncStorage` is a placeholder — the generated `tokenStorage.ts` always carries a WARN to replace it before shipping |
| Interceptor order is deterministic | Request → 401 response → retry response; `setupApiClient.ts` registers them in this order and must not be re-ordered |
| Audit before generate | Existing forbidden patterns are surfaced in a single pass before any files are written — all violations together, not one at a time |
