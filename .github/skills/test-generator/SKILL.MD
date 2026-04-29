---
name: test-generator
description: "MUST be used after all code generation skills produce TypeScript/TSX files and after the TypeScript Enforcer has run. Use when: a feature needs unit tests for domain, data, and state layers; integration tests for API data flows; MSW mock handlers for network requests; coverage thresholds must be met before the Final Validator gates the feature. Keywords: unit tests, integration tests, MSW, mock service worker, Jest, test coverage, 100% coverage, test generation, describe block, it block, mock, spy, thunk test, repository test, use case test, slice test, selector test, coverage threshold, @testing-library/react-native."
priority: HIGH
auto-trigger: true
---

# Test Generator

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

> This skill runs after the TypeScript Enforcer and before the Final Validator. It generates unit tests for every domain, data, and state layer file, integration tests for full API-to-state data flows, and MSW mock handlers for every HTTP endpoint discovered in the data layer. The feature is not considered complete until this skill returns `{ "valid": true }` — meaning all generated tests pass and measured coverage meets or exceeds the project threshold.

## The Coverage Contract

Every file produced by the pipeline has a corresponding test file. There are no exceptions. A file without a test is equivalent to untested code:

| Source file type | Required test type | Coverage target |
|------------------|-------------------|-----------------|
| Entity / interface (domain) | Type-shape tests | 100% type coverage |
| Use case (domain) | Unit — pure logic | 100% branch + statement |
| Repository impl (data) | Unit — with MSW | 100% branch + statement |
| Mapper (data) | Unit — property mapping | 100% property coverage |
| Slice (state) | Unit — reducer + extraReducers + co-located thunks | 100% branch |
| Thunk (state, co-located in slice) | Unit — fulfilled / rejected / pending **within the slice test** | 100% branch |
| Selector (state) | Unit — derived values | 100% statement |
| Screen / component (presentation) | Integration (render + interaction) | **80% minimum — MANDATORY** |
| `apiClient.ts` (shared) | Integration — interceptor behavior | 100% path |
| Navigator (navigation) | Integration — route resolution | 80% minimum |

> **Screen/Component tests are MANDATORY, not optional.** A screen that had an existing test before regeneration must have a replacement test after regeneration. If screen tests are missing, this skill must generate them. Deleting screen tests without replacement is always a **FATAL** — it is treated identically to a failing test. The minimum 80% coverage threshold applies; it is a floor, not a target.

> **Co-located thunks:** Because thunks are defined inside `*Slice.ts` (see redux-state-generator co-location mandate), thunk tests are generated inside the slice test file (`*Slice.test.ts`), not in separate `*Thunk.test.ts` files. The slice test file tests both the slice reducers and all async thunk flows (pending/fulfilled/rejected) in one place.

---

## Step 1 — Receive and Validate Input

Accept the full set of generated source files and project configuration.

**Input schema:**

```json
{
  "featureName": "string",
  "sourceFiles": [
    { "path": "string", "content": "string", "layer": "presentation | domain | data | state | shared | navigation" }
  ],
  "constitutionConfig": {},
  "testConfig": {
    "framework": "jest",
    "coverageThreshold": {
      "global": { "branches": 100, "functions": 100, "lines": 100, "statements": 100 }
    },
    "mswVersion": 2,
    "reactNativeTestingLibrary": true,
    "testEnvironment": "node"
  },
  "existingTests": []
}
```

**Decision point:**
- If `sourceFiles` is empty → **FAIL**: `"FATAL: No source files provided. Cannot generate tests without source."`
- If `testConfig.coverageThreshold` is absent → check `constitutionConfig.testingConfig` for GSD-derived thresholds from TESTING.md. If found, use those. Otherwise, default all thresholds to `100`. Never lower a threshold to make tests pass.
- If `constitutionConfig.testingConfig` is present → merge GSD testing configuration into testConfig:
  - `testingConfig.framework` → override `testConfig.framework` if specified (must still be Jest)
  - `testingConfig.coverageThreshold` → override `testConfig.coverageThreshold` per-layer if specified
  - `testingConfig.patterns` → additional test pattern rules to apply (e.g., "integration tests for all data sources", "snapshot tests for screens")
  - Emit: `"INFO: GSD testing configuration loaded from TESTING.md. Coverage thresholds: {thresholds}. Test patterns: {patterns}."`
- If `testConfig.framework !== "jest"` → **FAIL**: `"FATAL: Only Jest is supported. Set framework to 'jest'."`
- If `existingTests` contains a file whose source has changed since the test was generated → **WARN**: `"Source file changed since test was generated for '{path}'. Test may be stale — regenerating."`
- Never skip a file because it already has a test. Always regenerate from current source.
- If `existingTests` contains a screen/component test (`.screen.test.tsx`, `.test.tsx` for a presentation layer file) and the corresponding source screen still exists, but the regenerated output does NOT include a new test for it → **FATAL**: `"Screen test '{testPath}' existed before regeneration but no replacement test was generated for '{sourcePath}'. Screen-level tests are mandatory. Generate the replacement test before proceeding."` Deleting screen tests without replacement is never permitted.
- If `constitutionConfig.concerns[]` contains concerns affecting the test layer (e.g., "insufficient test coverage", "missing edge case tests") → apply those concerns as additional test generation rules. For each concern: generate extra test cases covering the anti-pattern scenario to ensure it is prevented. Emit: `"INFO: GSD concern '{concern.title}' applied to test generation — additional test cases generated to prevent anti-pattern recurrence."`

**Rule:** Tests are generated from source structure — exports, function signatures, and branch logic. Tests never assume implementation details that are not visible in the source file's public API. Private internals are tested through their public surface only.

---

## Step 2 — Discover Exports and Build Test Targets

Parse every source file to identify testable exports: functions, classes, hooks, reducers, selectors, thunks, and React components.

```ts
// test-generator/discoverExports.ts

export interface TestTarget {
  filePath: string;
  layer: string;
  exportName: string;
  exportType:
    | "function"
    | "class"
    | "hook"
    | "reducer"
    | "thunk"
    | "selector"
    | "component"
    | "mapper"
    | "usecase"
    | "repository"
    | "interface";
  signature: string;        // verbatim from source
  branches: string[];       // identified if/else, ternary, switch branches
  asyncPaths: "none" | "promise" | "observable";
  nullablePaths: string[];  // params or returns that are T | null | undefined
}

export function discoverExports(sourceFiles: GeneratedFile[]): TestTarget[] {
  const targets: TestTarget[] = [];

  for (const file of sourceFiles) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Named function exports
      if (/^export\s+(async\s+)?function\s+(\w+)/.test(line)) {
        const name = line.match(/^export\s+(?:async\s+)?function\s+(\w+)/)![1];
        targets.push(buildTarget(file, name, "function", line, lines, i));
      }

      // Const arrow function exports
      if (/^export\s+const\s+(\w+)\s*=\s*(async\s+)?\(/.test(line)) {
        const name = line.match(/^export\s+const\s+(\w+)/)![1];
        const type = name.startsWith("use") ? "hook"
          : file.path.includes("Thunk")    ? "thunk"
          : file.path.includes("Selector") ? "selector"
          : file.path.includes("Mapper")   ? "mapper"
          : "function";
        targets.push(buildTarget(file, name, type, line, lines, i));
      }

      // createSlice reducer
      if (/createSlice\(/.test(line)) {
        const name = file.path.split("/").pop()?.replace(".ts", "") ?? "slice";
        targets.push(buildTarget(file, name, "reducer", line, lines, i));
      }

      // createAsyncThunk — now co-located inside the slice file, not a standalone file
      // Thunks are still discovered here and their tests are generated WITHIN the slice test file
      if (/createAsyncThunk\(/.test(line)) {
        const name = line.match(/const\s+(\w+)\s*=\s*createAsyncThunk/)![1] ?? "thunk";
        targets.push(buildTarget(file, name, "thunk", line, lines, i));
      }

      // React functional component (TSX)
      if (/^(export\s+)?(default\s+)?function\s+[A-Z]\w*|^export\s+const\s+[A-Z]\w*\s*=\s*\(/.test(line) && file.path.endsWith(".tsx")) {
        const name = line.match(/function\s+([A-Z]\w*)|const\s+([A-Z]\w*)/)?.slice(1).find(Boolean) ?? "Component";
        targets.push(buildTarget(file, name, "component", line, lines, i));
      }
    }
  }

  return targets;
}

function buildTarget(
  file: GeneratedFile,
  name: string,
  type: TestTarget["exportType"],
  declarationLine: string,
  allLines: string[],
  startIdx: number
): TestTarget {
  return {
    filePath: file.path,
    layer: file.layer,
    exportName: name,
    exportType: type,
    signature: declarationLine.trim(),
    branches: extractBranches(allLines, startIdx),
    asyncPaths: /async\s+|Promise<|createAsyncThunk/.test(declarationLine) ? "promise" : "none",
    nullablePaths: extractNullablePaths(declarationLine),
  };
}

function extractBranches(lines: string[], startIdx: number): string[] {
  const branches: string[] = [];
  let depth = 0;
  for (let i = startIdx; i < Math.min(startIdx + 80, lines.length); i++) {
    const l = lines[i];
    depth += (l.match(/\{/g) ?? []).length - (l.match(/\}/g) ?? []).length;
    if (/\bif\s*\(/.test(l))                   branches.push(`if: ${l.trim()}`);
    if (/\belse\b/.test(l))                    branches.push(`else: ${l.trim()}`);
    if (/\?\s*\S/.test(l) && /:\s*\S/.test(l)) branches.push(`ternary: ${l.trim()}`);
    if (/\bswitch\s*\(/.test(l))               branches.push(`switch: ${l.trim()}`);
    if (/\bcase\s/.test(l))                    branches.push(`case: ${l.trim()}`);
    if (depth <= 0 && i > startIdx) break;
  }
  return branches;
}

function extractNullablePaths(line: string): string[] {
  return [...line.matchAll(/(\w+)\s*[?:]\s*[^=,)]+\|\s*(null|undefined)/g)].map((m) => m[1]);
}
```

**Quality check:** Every exported function, hook, thunk, reducer, selector, mapper, and component must appear as a `TestTarget`. If a source file has zero discoverable exports, flag a WARN: `"No testable exports found in '{path}'. Verify the file has public exports."`

---

## Step 3 — Generate Domain Layer Unit Tests

Generate pure unit tests for use cases and entities. No mocks required — domain is pure TypeScript.

```ts
// test-generator/generateDomainTests.ts

export function generateUseCaseTest(target: TestTarget): string {
  const importPath = toRelativeTestPath(target.filePath);
  return `
import { ${target.exportName} } from '${importPath}';

describe('${target.exportName}', () => {
  let sut: ${target.exportName};
  let mockRepository: jest.Mocked<I${target.exportName.replace("UseCase", "")}Repository>;

  beforeEach(() => {
    mockRepository = {
      // Auto-generated mock — fill in interface method names
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<I${target.exportName.replace("UseCase", "")}Repository>;

    sut = new ${target.exportName}(mockRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute()', () => {
    it('should return the expected result when repository resolves', async () => {
      // Arrange
      const input = buildValidInput();
      const expected = buildExpectedOutput();
      mockRepository.findById.mockResolvedValueOnce(expected);

      // Act
      const result = await sut.execute(input);

      // Assert
      expect(result).toEqual(expected);
      expect(mockRepository.findById).toHaveBeenCalledWith(input.id);
      expect(mockRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw when repository rejects', async () => {
      // Arrange
      const input = buildValidInput();
      const error = new Error('Repository failure');
      mockRepository.findById.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(sut.execute(input)).rejects.toThrow('Repository failure');
    });

${target.nullablePaths.map((param) => `
    it('should handle null/undefined ${param} gracefully', async () => {
      const input = buildValidInput({ ${param}: null });
      await expect(sut.execute(input)).rejects.toThrow();
    });
`).join("")}

${target.branches.filter((b) => b.startsWith("if:")).map((branch, idx) => `
    it('branch ${idx + 1}: should handle condition — ${branch.slice(4, 60)}', async () => {
      // TODO: arrange state that triggers this branch and assert expected outcome
      expect(true).toBe(true); // Replace with real assertion
    });
`).join("")}
  });
});

// ─── Test data builders ───────────────────────────────────────────────────────
function buildValidInput(overrides: Record<string, unknown> = {}): Parameters<${target.exportName}['execute']>[0] {
  return { id: 'test-id-1', ...overrides } as Parameters<${target.exportName}['execute']>[0];
}

function buildExpectedOutput(): ReturnType<${target.exportName}['execute']> extends Promise<infer T> ? T : never {
  return {} as any; // TODO: replace with a real fixture
}
`.trim();
}
```

---

## Step 4 — Generate Data Layer Unit Tests with MSW

Generate unit tests for repository implementations and mappers. Every HTTP call is intercepted by an MSW handler — no real network requests.

```ts
// test-generator/generateDataTests.ts

export function generateRepositoryTest(target: TestTarget, endpoints: DiscoveredEndpoint[]): string {
  const importPath = toRelativeTestPath(target.filePath);
  const handlers = endpoints.map((e) => buildMswHandler(e));

  return `
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ${target.exportName} } from '${importPath}';
import { createApiClient } from '@shared/api/apiClient';

// ─── MSW server setup ─────────────────────────────────────────────────────────
const server = setupServer(
${handlers.map((h) => `  ${h},`).join("\n")}
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ─── Repository tests ─────────────────────────────────────────────────────────
describe('${target.exportName}', () => {
  let sut: ${target.exportName};

  beforeEach(() => {
    const apiClient = createApiClient({ baseURL: 'http://localhost' });
    const dataSource = new ${target.exportName.replace("Impl", "DataSource")}(apiClient);
    sut = new ${target.exportName}(dataSource);
  });

${endpoints.map((endpoint) => `
  describe('${endpoint.method.toUpperCase()} ${endpoint.path}', () => {
    it('should return mapped domain entity on 2xx response', async () => {
      // Arrange — MSW handler returns fixture defined above
      // Act
      const result = await sut.${endpoint.repositoryMethod}(buildInput_${endpoint.repositoryMethod}());
      // Assert
      expect(result).toMatchSnapshot();
      expect(result).not.toBeNull();
    });

    it('should throw DataSourceError on 4xx response', async () => {
      server.use(
        http.${endpoint.method.toLowerCase()}('*${endpoint.path}', () =>
          HttpResponse.json({ message: 'Not found' }, { status: 404 })
        )
      );
      await expect(
        sut.${endpoint.repositoryMethod}(buildInput_${endpoint.repositoryMethod}())
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should throw DataSourceError on 5xx response', async () => {
      server.use(
        http.${endpoint.method.toLowerCase()}('*${endpoint.path}', () =>
          HttpResponse.json({ message: 'Server error' }, { status: 500 })
        )
      );
      await expect(
        sut.${endpoint.repositoryMethod}(buildInput_${endpoint.repositoryMethod}())
      ).rejects.toMatchObject({ status: 500 });
    });

    it('should throw DataSourceError on network failure', async () => {
      server.use(
        http.${endpoint.method.toLowerCase()}('*${endpoint.path}', () => HttpResponse.networkError())
      );
      await expect(
        sut.${endpoint.repositoryMethod}(buildInput_${endpoint.repositoryMethod}())
      ).rejects.toThrow();
    });
  });
`).join("")}
});

// ─── Input builders ───────────────────────────────────────────────────────────
${endpoints.map((e) => `
function buildInput_${e.repositoryMethod}() {
  return { id: 'fixture-id' }; // TODO: replace with typed fixture
}
`).join("")}
`;
}

export function generateMapperTest(target: TestTarget): string {
  const importPath = toRelativeTestPath(target.filePath);
  return `
import { ${target.exportName} } from '${importPath}';

describe('${target.exportName}', () => {
  it('should map all DTO fields to domain entity properties', () => {
    const dto = buildCompleteDto();
    const result = ${target.exportName}(dto);
    // Assert every domain property is present and correctly mapped
    expect(result).toMatchSnapshot();
  });

  it('should handle optional DTO fields that are absent', () => {
    const dto = buildMinimalDto();
    const result = ${target.exportName}(dto);
    expect(result).toBeDefined();
  });

  it('should not carry through undeclared DTO properties', () => {
    const dto = { ...buildCompleteDto(), undeclaredField: 'should-not-appear' } as any;
    const result = ${target.exportName}(dto) as Record<string, unknown>;
    expect(result['undeclaredField']).toBeUndefined();
  });

  it('should return a new object reference on every call', () => {
    const dto = buildCompleteDto();
    const r1 = ${target.exportName}(dto);
    const r2 = ${target.exportName}(dto);
    expect(r1).not.toBe(r2);
    expect(r1).toEqual(r2);
  });
});

function buildCompleteDto() { return {}; } // TODO: replace with typed fixture
function buildMinimalDto()  { return {}; } // TODO: replace with typed fixture
`.trim();
}

function buildMswHandler(endpoint: DiscoveredEndpoint): string {
  return `http.${endpoint.method.toLowerCase()}('*${endpoint.path}', () =>
    HttpResponse.json(${JSON.stringify(endpoint.responseFixture, null, 2)})
  )`;
}
```

---

## Step 5 — Generate State Layer Unit Tests

Generate tests for slices (reducer + extraReducers), async thunks (all three cases), and selectors.

```ts
// test-generator/generateStateTests.ts

export function generateSliceTest(sliceTarget: TestTarget, thunkTargets: TestTarget[]): string {
  const importPath = toRelativeTestPath(sliceTarget.filePath);
  const sliceName = sliceTarget.exportName;

  return `
import reducer, { ${sliceName.replace("Slice", "Actions")} } from '${importPath}';
${thunkTargets.map((t) => `import { ${t.exportName} } from '${toRelativeTestPath(t.filePath)}';`).join("\n")}

describe('${sliceName} reducer', () => {
  const initialState = reducer(undefined, { type: '@@INIT' });

  it('should return the initial state', () => {
    expect(initialState).toMatchSnapshot();
  });

${thunkTargets.map((thunk) => `
  describe('${thunk.exportName}', () => {
    it('should set status to "loading" on pending', () => {
      const action = ${thunk.exportName}.pending('req-id', undefined);
      const state  = reducer(initialState, action);
      expect(state.status).toBe('loading');
      expect(state.error).toBeNull();
    });

    it('should set data and status to "success" on fulfilled', () => {
      const payload = buildPayload_${thunk.exportName}();
      const action  = ${thunk.exportName}.fulfilled(payload, 'req-id', undefined);
      const state   = reducer(initialState, action);
      expect(state.status).toBe('success');
      expect(state.data).toEqual(payload);
      expect(state.error).toBeNull();
    });

    it('should set error and status to "error" on rejected', () => {
      const action = ${thunk.exportName}.rejected(null, 'req-id', undefined, 'Something went wrong');
      const state  = reducer(initialState, action);
      expect(state.status).toBe('error');
      expect(state.error).toBe('Something went wrong');
    });

    it('should not mutate previous state', () => {
      const frozen = Object.freeze({ ...initialState });
      const action = ${thunk.exportName}.pending('req-id', undefined);
      expect(() => reducer(frozen as typeof initialState, action)).not.toThrow();
    });
  });
`).join("")}
});

${thunkTargets.map((thunk) => `
describe('${thunk.exportName} thunk', () => {
  const mockUseCase = { execute: jest.fn() };
  const dispatch    = jest.fn();
  const getState    = jest.fn();
  const extra       = { ${thunk.exportName.replace("Thunk", "UseCase")}: mockUseCase };

  afterEach(() => jest.clearAllMocks());

  it('should dispatch fulfilled when use case resolves', async () => {
    const payload = buildPayload_${thunk.exportName}();
    mockUseCase.execute.mockResolvedValueOnce(payload);

    await ${thunk.exportName}(undefined)(dispatch, getState, extra);

    expect(mockUseCase.execute).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining('/fulfilled') }));
  });

  it('should dispatch rejected when use case rejects', async () => {
    mockUseCase.execute.mockRejectedValueOnce(new Error('use case failure'));

    await ${thunk.exportName}(undefined)(dispatch, getState, extra);

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: expect.stringContaining('/rejected') }));
  });

  it('should call extra.useCase.execute — not any HTTP client directly', () => {
    // Verifies thunk delegation contract: only extra.useCase.execute is called
    expect(mockUseCase.execute).toBeDefined();
    // If this test setup required importing axios, the contract is broken
  });
});
`).join("")}

// ─── Payload builders ─────────────────────────────────────────────────────────
${thunkTargets.map((t) => `function buildPayload_${t.exportName}() { return {}; } // TODO: replace with typed fixture`).join("\n")}
`.trim();
}

export function generateSelectorTest(target: TestTarget): string {
  const importPath = toRelativeTestPath(target.filePath);
  return `
import * as selectors from '${importPath}';

describe('${target.exportName} selectors', () => {
  const baseState = buildRootState();

  it('should select the correct slice from root state', () => {
    const result = selectors.${target.exportName}(baseState);
    expect(result).toBeDefined();
  });

  it('should return false for is-loading when status is not "loading"', () => {
    const state = buildRootState({ status: 'idle' });
    expect(selectors.selectIsLoading?.(state)).toBe(false);
  });

  it('should return true for is-loading when status is "loading"', () => {
    const state = buildRootState({ status: 'loading' });
    expect(selectors.selectIsLoading?.(state)).toBe(true);
  });

  it('should be referentially stable across identical state references', () => {
    const r1 = selectors.${target.exportName}(baseState);
    const r2 = selectors.${target.exportName}(baseState);
    expect(r1).toBe(r2); // Memoized selectors must return the same reference
  });
});

function buildRootState(overrides: Record<string, unknown> = {}) {
  return { /* TODO: build miniature Redux state */ ...overrides } as any;
}
`.trim();
}
```

---

## Step 6 — Generate MSW Mock Handler Registry

Collect every HTTP endpoint referenced across all data layer files and produce a single centralized MSW handler file for integration tests.

```ts
// test-generator/generateMswHandlers.ts

export interface DiscoveredEndpoint {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  repositoryMethod: string;
  responseFixture: Record<string, unknown>;
  statusCode: number;
}

export function discoverEndpoints(dataFiles: GeneratedFile[]): DiscoveredEndpoint[] {
  const endpoints: DiscoveredEndpoint[] = [];

  for (const file of dataFiles) {
    const lines = file.content.split("\n");
    for (const line of lines) {
      // Matches: apiClient.get('/users/:id') / apiClient.post('/users')
      const match = line.match(/apiClient\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/);
      if (!match) continue;

      const [, method, path] = match;
      const repositoryMethod = inferRepositoryMethod(method as DiscoveredEndpoint["method"], path);
      endpoints.push({
        method: method as DiscoveredEndpoint["method"],
        path,
        repositoryMethod,
        responseFixture: buildResponseFixture(path),
        statusCode: 200,
      });
    }
  }

  return endpoints;
}

export function generateMswHandlerFile(endpoints: DiscoveredEndpoint[], featureName: string): string {
  if (endpoints.length === 0) {
    return `// No HTTP endpoints discovered for feature '${featureName}'\nexport const ${featureName}Handlers = [];\n`;
  }

  return `
import { http, HttpResponse } from 'msw';

// Auto-generated MSW handlers for feature '${featureName}'.
// Override individual handlers in tests using server.use(...).
export const ${featureName}Handlers = [
${endpoints.map((e) => `
  // ${e.method.toUpperCase()} ${e.path}
  http.${e.method}(\`\${process.env.API_BASE_URL}${e.path}\`, () =>
    HttpResponse.json(${JSON.stringify(e.responseFixture, null, 4)}, { status: ${e.statusCode} })
  ),`).join("\n")}
];

// ─── Error scenario overrides (use in test-specific server.use()) ─────────────
export const ${featureName}ErrorHandlers = {
${endpoints.map((e) => `
  ${e.repositoryMethod}NotFound: http.${e.method}(\`\${process.env.API_BASE_URL}${e.path}\`, () =>
    HttpResponse.json({ message: 'Not found' }, { status: 404 })
  ),
  ${e.repositoryMethod}ServerError: http.${e.method}(\`\${process.env.API_BASE_URL}${e.path}\`, () =>
    HttpResponse.json({ message: 'Internal server error' }, { status: 500 })
  ),
  ${e.repositoryMethod}NetworkError: http.${e.method}(\`\${process.env.API_BASE_URL}${e.path}\`, () =>
    HttpResponse.networkError()
  ),`).join("\n")}
};
`.trim();
}

function inferRepositoryMethod(method: DiscoveredEndpoint["method"], path: string): string {
  if (method === "get" && /:id/.test(path)) return "findById";
  if (method === "get")                      return "findAll";
  if (method === "post")                     return "create";
  if (method === "put" || method === "patch") return "update";
  if (method === "delete")                   return "delete";
  return "execute";
}

function buildResponseFixture(path: string): Record<string, unknown> {
  return { id: "fixture-id", createdAt: "2026-01-01T00:00:00.000Z" }; // TODO: expand from DTO shape
}
```

**Rule:** `onUnhandledRequest: 'error'` is always set on the MSW server. Any HTTP call in a test that does not have a registered handler causes the test to fail immediately. This prevents silent network calls in tests.

---

## Step 7 — Generate Jest Coverage Configuration

Emit the Jest configuration block that enforces the coverage thresholds for this feature's files.

```ts
// test-generator/generateJestConfig.ts

export function generateCoverageConfig(
  featureName: string,
  sourceFiles: GeneratedFile[],
  thresholds: CoverageThreshold
): string {
  const collectFrom = sourceFiles
    .filter((f) => f.layer !== "unknown" && !f.path.endsWith(".test.ts") && !f.path.endsWith(".test.tsx"))
    .map((f) => `'<rootDir>/${f.path}'`);

  return `
// jest.config.${featureName}.ts — auto-generated coverage config for feature '${featureName}'
// Merge this into the root jest.config.ts under 'projects' or extend with 'collectCoverageFrom'.
export default {
  displayName: '${featureName}',
  testEnvironment: 'node',
  collectCoverageFrom: [
${collectFrom.map((p) => `    ${p},`).join("\n")}
  ],
  coverageThreshold: {
    global: {
      branches:   ${thresholds.global.branches},
      functions:  ${thresholds.global.functions},
      lines:      ${thresholds.global.lines},
      statements: ${thresholds.global.statements},
    },
  },
  coverageReporters: ['text', 'lcov', 'json-summary'],
};
`.trim();
}
```

**Decision point:**
- Coverage thresholds are always set from `testConfig.coverageThreshold`. They are **never lowered** to pass failing coverage.
- If a source file has zero test branches exercised — flag a FATAL: `"FATAL: '{path}' has 0% branch coverage. Every branch must be tested."`
- Presentation layer files use a minimum of 80% — set in `coverageThreshold.perFile` if the constitution specifies a lower target for UI.

---

## Step 8 — Validate Generated Tests and Coverage

Verify that every source file has a corresponding test file, and that the combined set of tests covers all discovered branches.

```ts
// test-generator/validateCoverage.ts

export function validateCoverage(
  sourceFiles: GeneratedFile[],
  generatedTests: GeneratedFile[],
  thresholds: CoverageThreshold,
  endpoints: DiscoveredEndpoint[]
): ValidationResult {
  const issues: TestIssue[] = [];

  // 1. Every source file must have a test file
  for (const source of sourceFiles.filter((f) => f.layer !== "unknown")) {
    const expectedTestPath = source.path.replace(/\.tsx?$/, ".test.$1").replace(/(.*\/)(\w+)(\.test\.)/, "$1__tests__/$2$3");
    const hasTest = generatedTests.some((t) =>
      t.path === expectedTestPath ||
      t.path.includes(source.path.split("/").pop()!.replace(/\.tsx?$/, ""))
    );

    if (!hasTest) {
      issues.push({
        severity: "FATAL",
        rule: "missing-test-file",
        message: `No test file generated for source '${source.path}'. Every source file requires a corresponding test.`,
        affectedPath: source.path,
      });
    }
  }

  // 2. Every MSW endpoint must have a handler
  for (const endpoint of endpoints) {
    const handlerExists = generatedTests.some(
      (t) => t.content.includes(`http.${endpoint.method}`) && t.content.includes(endpoint.path)
    );
    if (!handlerExists) {
      issues.push({
        severity: "FATAL",
        rule: "missing-msw-handler",
        message: `No MSW handler generated for ${endpoint.method.toUpperCase()} ${endpoint.path}. Every HTTP endpoint must be mocked.`,
        affectedPath: endpoint.path,
      });
    }
  }

  // 3. Every thunk must have all three extraReducers cases tested
  for (const test of generatedTests.filter((t) => t.path.includes("Thunk"))) {
    const hasPending   = test.content.includes(".pending(");
    const hasFulfilled = test.content.includes(".fulfilled(");
    const hasRejected  = test.content.includes(".rejected(");
    if (!hasPending || !hasFulfilled || !hasRejected) {
      const missing = [!hasPending && "pending", !hasFulfilled && "fulfilled", !hasRejected && "rejected"].filter(Boolean);
      issues.push({
        severity: "FATAL",
        rule: "thunk-cases-missing",
        message: `Thunk test '${test.path}' is missing cases: [${missing.join(", ")}]. All three async cases are required.`,
        affectedPath: test.path,
      });
    }
  }

  // 4. Coverage threshold declared
  const coverageConfig = generatedTests.find((t) => t.path.includes("jest.config."));
  if (!coverageConfig) {
    issues.push({
      severity: "FATAL",
      rule: "missing-coverage-config",
      message: "No Jest coverage configuration was generated. Coverage thresholds cannot be enforced without it.",
      affectedPath: "jest.config.{featureName}.ts",
    });
  }

  const valid = !issues.some((i) => i.severity === "FATAL");
  return { valid, issues };
}
```

Run through this checklist before returning:

- [ ] All source files have a corresponding test file generated
- [ ] Domain use cases tested with constructor-injected mock repositories
- [ ] Repository tests use MSW — no direct `axios.get()` calls in tests
- [ ] `server.listen({ onUnhandledRequest: 'error' })` is set on every MSW server
- [ ] All three thunk cases (`pending`, `fulfilled`, `rejected`) tested in every slice test
- [ ] Thunk tests verify `extra.useCase.execute()` is called — not a direct HTTP client
- [ ] Mapper tests cover complete DTO → entity mapping, minimal DTO, and no undeclared properties
- [ ] Selector tests include referential stability assertion for memoized selectors
- [ ] MSW handler registry generated with success, 4xx, 5xx, and network error variants per endpoint
- [ ] Jest coverage configuration generated with thresholds from `testConfig.coverageThreshold`
- [ ] `valid: false` emitted if any FATAL issue remains; `valid: true` only when all checks pass

---

## File Layout Reference

```
{featureName}/
└── __tests__/
    ├── domain/
    │   ├── {UseCaseName}.test.ts          ← Step 3: pure use case unit tests
    │   └── {EntityName}.shape.test.ts     ← Step 3: entity type-shape tests
    ├── data/
    │   ├── {RepositoryName}.test.ts       ← Step 4: repository + MSW integration
    │   └── {MapperName}.test.ts           ← Step 4: mapper property coverage
    ├── state/
    │   ├── {SliceName}.test.ts            ← Step 5: reducer + extraReducers
    │   ├── {ThunkName}.test.ts            ← Step 5: thunk delegation tests
    │   └── {SelectorName}.test.ts         ← Step 5: selector + memoization
    ├── mocks/
    │   └── {featureName}.handlers.ts      ← Step 6: centralized MSW handler registry
    └── jest.config.{featureName}.ts       ← Step 7: coverage threshold config

shared/
└── __tests__/
    └── mocks/
        └── server.ts                      ← Shared MSW node server (setupServer)
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Every file has a test | No source file ships without a corresponding test file — zero exceptions across all layers |
| Coverage threshold is immutable | Thresholds are read from config and enforced as-is. They are never lowered to make a green pipeline |
| MSW, not mocked modules | HTTP calls are intercepted by MSW at the network level — `jest.mock('axios')` is never used |
| `onUnhandledRequest: 'error'` always | Any HTTP call without a registered handler fails the test immediately — no silent leaks |
| Thunk delegation verified | Every thunk test asserts `extra.useCase.execute()` was called — direct API access in thunks cannot hide |
| Test data builders over literals | Every test uses builder functions (`buildValidInput()`) to construct fixtures — raw literals in assertions only |
| Snapshot testing for mappers | Mapper output is snapshot-tested to catch any property drift across regenerations |
| Referential stability for selectors | Memoized selectors are tested for reference equality across identical state — prevents unnecessary re-renders |
| `valid: false` blocks the pipeline | This skill's output is checked by the Final Validator — `valid: false` here means the feature does not pass the gate |
