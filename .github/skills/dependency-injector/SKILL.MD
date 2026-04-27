---
name: dependency-injector
description: "MUST be used whenever the dependency graph of a feature needs to be wired — connecting repository implementations to use cases, and use cases to Redux thunks via ThunkExtra. Use when: composing the data, domain, and state layers of a new feature after all three have been generated; verifying that an existing feature's wiring uses constructor injection and depends on interfaces rather than concrete classes; detecting tight coupling (direct instantiation, service locators, or singleton abuse) in feature code; generating the feature's DI bootstrap file. Keywords: dependency injection, inversion of control, constructor injection, repository wiring, usecase injection, thunk extra, loose coupling, feature wiring, di container, clean architecture."
priority: HIGH
auto-trigger: true
---

# Dependency Injector

> Trigger this skill **after** the Data Layer Builder, Domain Extraction, and Redux State Generator skills have all completed for a feature. This skill wires the layers together. It is the only place where concrete implementations (`RepositoryImpl`, `ApiDataSource`) are instantiated. All other layers must depend on interfaces or use case types — never on concrete classes directly.

## The Loose Coupling Rule

Tight coupling occurs when a class instantiates its own dependencies or imports a concrete class where an interface should be used. It is the leading cause of untestable, brittle feature code:

| Pattern | Classification | Verdict |
|---------|---------------|---------|
| `constructor(private repo: ProductRepository)` ← interface | Constructor injection via interface | ✅ Permitted |
| `constructor(private repo: ProductRepositoryImpl)` ← concrete | Constructor injection via concrete class | ❌ FATAL — tight coupling |
| `const repo = new ProductRepositoryImpl()` inside a use case | Direct instantiation inside consumer | ❌ FATAL — tight coupling |
| `ServiceLocator.get<ProductRepository>()` | Service locator | ❌ FATAL — hidden dependency |
| `import { repositoryInstance } from '../singletons'` | Singleton import | ❌ FATAL — tight coupling |
| Wiring in `diBootstrap.ts` only | Composition root pattern | ✅ Only permitted instantiation site |

The composition root (`diBootstrap.ts`) is the **only** place in the feature where `new ConcreteClass()` is permitted. Every layer outside it depends on abstractions.

---

## Step 1 — Receive and Validate Input

Accept the generated artefacts from the three upstream skills and verify the dependency graph is complete before wiring.

**Input schema:**

```json
{
  "featureName": "string",
  "basePath": "string | null",
  "repositoryInterfaces": [
    { "name": "string", "outputPath": "string" }
  ],
  "repositoryImpls": [
    { "name": "string", "implementedInterface": "string", "outputPath": "string" }
  ],
  "apiDataSources": [
    { "name": "string", "outputPath": "string" }
  ],
  "useCases": [
    {
      "name": "string",
      "repositoryDependencies": ["string"],
      "outputPath": "string"
    }
  ],
  "thunkExtra": {
    "outputPath": "string",
    "useCaseFields": [{ "fieldName": "string", "typeName": "string" }]
  },
  "existingFiles": [
    { "path": "string", "content": "string" }
  ]
}
```

**Decision point:**
- If `repositoryImpls` is empty → **FAIL**: `"FATAL: No repository implementations provided. Run the Data Layer Builder skill first."`
- If `useCases` is empty → **FAIL**: `"FATAL: No use cases provided. Run the Domain Extraction skill first."`
- If `thunkExtra` is null → **FAIL**: `"FATAL: ThunkExtra interface not provided. Run the Redux State Generator skill first."`
- If any `repositoryImpl.implementedInterface` has no matching entry in `repositoryInterfaces` → **FAIL**: `"FATAL: Repository implementation '{name}' declares interface '{interface}' but no such interface was found. Check Domain Extraction output."`
- If any `useCase.repositoryDependencies` entry has no matching `repositoryInterface` → **FAIL**: `"FATAL: UseCase '{name}' depends on '{dep}' but no repository interface with that name exists."`
- Scan `existingFiles` for tight-coupling violations (Step 2) before generating anything

**Rule:** This skill generates only the composition root (`diBootstrap.ts`) and the ThunkExtra factory (`createThunkExtra.ts`). It never modifies existing layer files and never moves wiring logic into use cases, repositories, or thunks.

**Rule — single canonical entrypoint:** `diBootstrap.ts` is the **one and only** composition root. This skill must never generate a second wiring file (`di/container.ts`, `diContainer.ts`, `serviceLocator.ts`, or any singleton that vends use-case instances). Generating two entrypoints causes one to become dead code immediately, since Redux thunks access use cases exclusively through `ThunkExtra` from the store's `extra` argument — which is wired via `diBootstrap.ts`. If a `di/container.ts` file already exists in the feature folder when this skill runs, **do not generate a new one** — instead add a FATAL: `"'di/container.ts' already exists and is not the canonical entrypoint. Redux thunks receive use cases via ThunkExtra (from 'diBootstrap.ts'), not from a container singleton. Remove 'di/container.ts' and wire the store using 'create{Feature}ThunkExtra()' from 'diBootstrap.ts'."`

---

## Step 2 — Audit Existing Code for Tight Coupling

Scan all existing feature files for coupling patterns that violate the loose-coupling rule. Perform a full scan before reporting — surface all violations at once, not one at a time.

```ts
// dependency-injector/auditCoupling.ts

export interface CouplingViolation {
  filePath: string;
  line: number;
  pattern: string;
  severity: "FATAL" | "WARN";
  remediation: string;
}

const TIGHT_COUPLING_PATTERNS: Array<{
  regex: RegExp;
  description: string;
  severity: "FATAL" | "WARN";
  remediation: string;
}> = [
  {
    regex: /new\s+\w+RepositoryImpl\s*\(/,
    description: "Direct instantiation of RepositoryImpl inside a non-bootstrap file",
    severity: "FATAL",
    remediation: "Remove the direct instantiation. Receive the repository via constructor injection and wire it in diBootstrap.ts.",
  },
  {
    regex: /new\s+\w+ApiDataSource\s*\(/,
    description: "Direct instantiation of ApiDataSource inside a non-bootstrap file",
    severity: "FATAL",
    remediation: "Remove the direct instantiation. Wire ApiDataSource in diBootstrap.ts only.",
  },
  {
    regex: /new\s+\w+UseCase\s*\(/,
    description: "Direct instantiation of a UseCase inside a non-bootstrap file",
    severity: "FATAL",
    remediation: "Remove the direct instantiation. Use cases are constructed in diBootstrap.ts and injected via ThunkExtra.",
  },
  {
    regex: /ServiceLocator\.(get|resolve|instance)\s*[<(]/,
    description: "Service locator usage",
    severity: "FATAL",
    remediation: "Replace the service locator call with constructor injection. Service locators hide dependencies and prevent testability.",
  },
  {
    regex: /import\s+.*RepositoryImpl\b/,
    description: "Direct import of a concrete RepositoryImpl outside diBootstrap.ts",
    severity: "FATAL",
    remediation: "Import the repository interface instead. Concrete implementations are only permitted in diBootstrap.ts.",
  },
  {
    regex: /import\s+.*ApiDataSource\b/,
    description: "Direct import of an ApiDataSource outside diBootstrap.ts",
    severity: "FATAL",
    remediation: "ApiDataSource must only be imported in diBootstrap.ts.",
  },
  {
    regex: /private\s+\w+\s*=\s*new\s+\w+/,
    description: "Inline field initializer using new (property injection anti-pattern)",
    severity: "FATAL",
    remediation: "Move the instantiation to diBootstrap.ts and inject the dependency via the constructor.",
  },
  {
    regex: /getInstance\s*\(\s*\)|\.shared\b|\.instance\b/,
    description: "Singleton accessor pattern",
    severity: "WARN",
    remediation: "Singletons make unit testing difficult. Inject the dependency via constructor instead of accessing a static instance.",
  },
  {
    regex: /constructor\s*\(\s*\)\s*\{[^}]*new\s+\w+/,
    description: "No-arg constructor with internal instantiation",
    severity: "FATAL",
    remediation: "Add the dependency as a constructor parameter and wire it externally in diBootstrap.ts.",
  },
];

export function auditCoupling(
  existingFiles: Array<{ path: string; content: string }>,
  bootstrapPaths: string[]
): CouplingViolation[] {
  const violations: CouplingViolation[] = [];

  for (const file of existingFiles) {
    // Skip the bootstrap file itself — it is permitted to instantiate
    if (bootstrapPaths.some((bp) => file.path.endsWith(bp))) continue;

    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const { regex, description, severity, remediation } of TIGHT_COUPLING_PATTERNS) {
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
- If any FATAL coupling violations exist → collect all of them, add to `violations[]`, and **FAIL** after the full scan
- WARN violations are included in `violations[]` but do not halt generation
- If no existing files provided → skip audit and add WARN: `"No existing files provided for coupling audit. Cannot verify loose coupling in the codebase."`

---

## Step 3 — Build the Dependency Graph

Construct an ordered dependency graph so that instantiation order in the composition root is deterministic: data sources first, then repositories, then use cases.

```ts
// dependency-injector/buildDependencyGraph.ts

export interface DependencyNode {
  name: string;
  kind: "datasource" | "repository" | "usecase";
  concreteName: string;       // e.g. "ProductRepositoryImpl"
  interfaceName: string | null; // e.g. "ProductRepository" (null for datasources)
  dependencies: string[];     // names of nodes this one depends on
  instantiationOrder: number; // 1 = first, higher = later
}

export function buildDependencyGraph(
  apiDataSources: { name: string }[],
  repositoryImpls: { name: string; implementedInterface: string }[],
  useCases: { name: string; repositoryDependencies: string[] }[]
): DependencyNode[] {
  const nodes: DependencyNode[] = [];
  let order = 1;

  // Layer 1: API data sources — no dependencies on other feature nodes
  for (const ds of apiDataSources) {
    nodes.push({
      name: ds.name,
      kind: "datasource",
      concreteName: ds.name,
      interfaceName: null,
      dependencies: [],
      instantiationOrder: order++,
    });
  }

  // Layer 2: Repository implementations — depend on data sources
  for (const repo of repositoryImpls) {
    const dataSourceDep = apiDataSources.find((ds) =>
      ds.name.replace("ApiDataSource", "") === repo.name.replace("RepositoryImpl", "")
    );
    nodes.push({
      name: repo.implementedInterface, // referenced by consumers via the interface name
      kind: "repository",
      concreteName: repo.name,
      interfaceName: repo.implementedInterface,
      dependencies: dataSourceDep ? [dataSourceDep.name] : [],
      instantiationOrder: order++,
    });
  }

  // Layer 3: Use cases — depend on repository interfaces
  for (const uc of useCases) {
    nodes.push({
      name: uc.name,
      kind: "usecase",
      concreteName: uc.name,
      interfaceName: null,
      dependencies: uc.repositoryDependencies,
      instantiationOrder: order++,
    });
  }

  validateGraph(nodes);
  return nodes.sort((a, b) => a.instantiationOrder - b.instantiationOrder);
}

function validateGraph(nodes: DependencyNode[]): void {
  // Detect circular dependencies
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      const depNode = nodes.find((n) => n.name === dep || n.interfaceName === dep);
      if (!depNode) {
        throw new DependencyGraphError(
          `Node '${node.name}' depends on '${dep}' but no such node exists in the dependency graph.`
        );
      }
      if (depNode.instantiationOrder >= node.instantiationOrder) {
        throw new DependencyGraphError(
          `Circular or out-of-order dependency: '${node.name}' (order ${node.instantiationOrder}) depends on '${dep}' (order ${depNode.instantiationOrder}).`
        );
      }
    }
  }
}
```

**Quality checks:**
- The instantiation order is always: `ApiDataSource` → `RepositoryImpl` → `UseCase` — this order is enforced structurally, not by convention
- Circular dependencies are caught at graph-build time and produce a **FATAL** before any file is generated
- If a `RepositoryImpl` has no matching `ApiDataSource` (e.g. it uses a local cache) → its `dependencies[]` is empty; this is valid and produces no violation

---

## Step 4 — Generate the Composition Root

Produce `diBootstrap.ts` — the only file permitted to call `new ConcreteClass()`. It instantiates the full dependency graph in order and returns a ready `ThunkExtra` object.

```ts
// dependency-injector/generateCompositionRoot.ts

export function generateCompositionRoot(
  featureName: string,
  graph: DependencyNode[],
  apiDataSources: { name: string; outputPath: string }[],
  repositoryImpls: { name: string; implementedInterface: string; outputPath: string }[],
  useCases: { name: string; outputPath: string }[],
  basePath: string
): GeneratedFile {
  // Build import statements — concrete classes only, from their declared output paths
  const dataSourceImports = apiDataSources
    .map((ds) => `import { ${ds.name} } from '${toRelativePath(basePath, ds.outputPath)}';`)
    .join("\n");

  const repoImports = repositoryImpls
    .map((r) => `import { ${r.name} } from '${toRelativePath(basePath, r.outputPath)}';`)
    .join("\n");

  const useCaseImports = useCases
    .map((uc) => `import { ${uc.name} } from '${toRelativePath(basePath, uc.outputPath)}';`)
    .join("\n");

  // Build instantiation lines in dependency order
  const instantiations = graph.map((node) => {
    const args = node.dependencies
      .map((dep) => {
        const depNode = graph.find((n) => n.name === dep || n.interfaceName === dep)!;
        return toCamelCase(depNode.concreteName);
      })
      .join(", ");

    return `  const ${toCamelCase(node.concreteName)} = new ${node.concreteName}(${args});`;
  });

  // Build ThunkExtra return object
  const thunkExtraFields = useCases
    .map((uc) => `    ${toCamelCase(uc.name)}: ${toCamelCase(uc.name)},`)
    .join("\n");

  return {
    outputPath: `${basePath}/features/${featureName}/diBootstrap.ts`,
    fileContent: `// Composition Root — the ONLY file permitted to instantiate concrete classes.
// All instantiation must happen here. No other file may call 'new ConcreteClass()'.
import { apiClient } from '../../shared/api/apiClient';
import type { ThunkExtra } from '../../shared/store/thunkExtra';
${dataSourceImports}
${repoImports}
${useCaseImports}

export function create${toPascalCase(featureName)}ThunkExtra(): ThunkExtra {
${instantiations.join("\n")}

  return {
${thunkExtraFields}
  };
}
`,
  };
}
```

**Quality checks:**
- Variable names for instantiated objects use `toCamelCase(concreteName)` — consistent, predictable, and collision-free
- `apiClient` is imported from the shared location; it is passed to data sources that require it — never instantiated here
- The function returns a `ThunkExtra` typed object — callers pass this to the Redux store's `extra` argument during store setup
- If a use case has multiple repository dependencies, all are listed as constructor arguments in the order they appear in `repositoryDependencies[]`

---

## Step 5 — Generate the Store Wiring Snippet

After every feature generation, produce a comprehensive integration snippet that covers all four manual wiring steps a developer must perform in the shared app infrastructure. These steps are never performed automatically (store, navigators, and DI container are shared concerns that require human review), but they must be documented precisely so nothing is missed.

```ts
// dependency-injector/generateStoreWiringSnippet.ts

export function generateStoreWiringSnippet(
  featureName: string,
  basePath: string,
  screens: string[],       // screen component names from the feature's presentation layer
  tabEntry: string | null  // non-null if feature adds a tab to TabsNavigator
): GeneratedFile {
  const fnName         = `create${toPascalCase(featureName)}ThunkExtra`;
  const reducerName    = `${toCamelCase(featureName)}Reducer`;
  const sliceImport    = `${toCamelCase(featureName)}Slice`;
  const screenImports  = screens.map((s) => `import ${s} from '../features/${toKebabCase(featureName)}/presentation/screens/${s}';`).join("\n");
  const routeEntries   = screens.map((s) => `    <Stack.Screen name="${s}" component={${s}} />`).join("\n");

  return {
    outputPath: `${basePath}/features/${featureName}/storeWiring.snippet.ts`,
    fileContent: `// ════════════════════════════════════════════════════════════════════════════
// INTEGRATION CHECKLIST FOR: ${toPascalCase(featureName)}
// ════════════════════════════════════════════════════════════════════════════
// This file is a reference snippet — do NOT import it. Merge each section
// below into the corresponding shared app file. Remove this file after wiring.
// ════════════════════════════════════════════════════════════════════════════

// ── 1. src/app/state/store.ts ─────────────────────────────────────────────
// Add the feature reducer to combineReducers and wire ThunkExtra.

import { ${fnName} } from '../features/${toKebabCase(featureName)}/diBootstrap';
import ${sliceImport} from '../features/${toKebabCase(featureName)}/state/store/${toCamelCase(featureName)}Slice';

// In combineReducers({ ... }):
//   ${toCamelCase(featureName)}: ${sliceImport},
//
// In configureStore({ middleware }):
//   getDefaultMiddleware({
//     thunk: {
//       extraArgument: {
//         ...existingExtra,
//         ...${fnName}(),
//       },
//     },
//   })


// ── 2. src/app/routing/RootNavigator.tsx ──────────────────────────────────
// Register every screen from this feature in the root stack.

${screenImports}

// Inside <Stack.Navigator>:
${routeEntries}


// ── 3. src/app/routing/TabsNavigator.tsx ─────────────────────────────────
${tabEntry
  ? `// Add this tab entry to the bottom tab navigator:
//   <Tab.Screen
//     name="${tabEntry}"
//     component={${screens[0] ?? toPascalCase(featureName) + 'Screen'}}
//     options={{ title: '${toPascalCase(featureName)}', tabBarIcon: ({ color }) => /* your icon */ null }}
//   />`
  : `// No tab entry required for this feature (it is not a root tab).`}


// ── 4. src/app/di/container.ts ────────────────────────────────────────────
// If your project uses a top-level DI container singleton, register the
// feature's ThunkExtra factory here so it is available to the store setup.

//   import { ${fnName} } from '../features/${toKebabCase(featureName)}/diBootstrap';
//   container.register('${toCamelCase(featureName)}Extra', ${fnName});
`,
  };
}
```

**Rule:** Store wiring snippets are advisory — they show the developer exactly what to add to each shared file; they do not overwrite any shared file. Overwriting shared infrastructure (store, navigators, DI container) is a destructive action that requires human review. The snippet is a checklist, not an automator.

**Rule — diBootstrap.ts is mandatory:** If `diBootstrap.ts` was not produced as an output of Step 4 for any reason, the Dependency Injector skill must **FAIL** before generating any snippet: `"FATAL: 'diBootstrap.ts' was not generated for feature '{featureName}'. This is the composition root and is mandatory — without it, use cases cannot reach the Redux store and the feature will not function. Re-run this skill from Step 4 and resolve all prerequisite errors before continuing."` There is no path through this skill that completes successfully without a `diBootstrap.ts` in the output.

---

## Step 6 — Verify Constructor Signatures

Cross-check the generated `diBootstrap.ts` against the actual constructor signatures of each concrete class to confirm argument count and order are correct.

```ts
// dependency-injector/verifyConstructorSignatures.ts

export interface ConstructorCheck {
  className: string;
  expectedArgCount: number;
  providedArgCount: number;
  passed: boolean;
  violation: Violation | null;
}

export function verifyConstructorSignatures(
  graph: DependencyNode[],
  repositoryImpls: { name: string; constructorParams: string[] }[],
  useCases: { name: string; params: { name: string; type: string }[] }[]
): ConstructorCheck[] {
  const checks: ConstructorCheck[] = [];

  for (const node of graph) {
    if (node.kind === "repository") {
      const impl = repositoryImpls.find((r) => r.name === node.concreteName);
      if (!impl) continue;

      const provided = node.dependencies.length;
      const expected = impl.constructorParams.length;
      const passed = provided === expected;

      checks.push({
        className: node.concreteName,
        expectedArgCount: expected,
        providedArgCount: provided,
        passed,
        violation: passed ? null : {
          severity: "FATAL",
          message: `Constructor mismatch for '${node.concreteName}': expected ${expected} argument(s), wiring provides ${provided}. Check 'diBootstrap.ts' instantiation.`,
        },
      });
    }

    if (node.kind === "usecase") {
      const uc = useCases.find((u) => u.name === node.concreteName);
      if (!uc) continue;

      const provided = node.dependencies.length;
      const expected = uc.params.length;
      const passed = provided === expected;

      checks.push({
        className: node.concreteName,
        expectedArgCount: expected,
        providedArgCount: provided,
        passed,
        violation: passed ? null : {
          severity: "FATAL",
          message: `Constructor mismatch for '${node.concreteName}': expected ${expected} argument(s) (${uc.params.map((p) => p.name).join(", ")}), wiring provides ${provided}.`,
        },
      });
    }
  }

  return checks;
}
```

**Decision point:**
- Any constructor argument count mismatch → **FATAL**: the composition root would crash at runtime
- If a concrete class's constructor parameters cannot be determined (source not available) → add a WARN: `"Cannot verify constructor signature for '{name}'. Confirm argument count manually before running the app."`

---

## Step 7 — Validate the Dependency Graph Output

Run final validation across all generated files and the full dependency graph.

```ts
// dependency-injector/validateDiOutput.ts

export function validateDiOutput(
  graph: DependencyNode[],
  constructorChecks: ConstructorCheck[],
  generatedFiles: GeneratedFile[],
  auditViolations: CouplingViolation[]
): Violation[] {
  const violations: Violation[] = [
    ...auditViolations.map(toViolation),
    ...constructorChecks.flatMap((c) => c.violation ? [c.violation] : []),
  ];

  const bootstrapFile = generatedFiles.find((f) => f.outputPath.includes("diBootstrap"));

  // 1. Bootstrap file must exist
  if (!bootstrapFile) {
    violations.push({ severity: "FATAL", message: "diBootstrap.ts was not generated. Dependency wiring cannot proceed." });
    return violations;
  }

  // 2. Bootstrap must not import from domain or state layers
  if (/from ['"].*\/state\//.test(bootstrapFile.fileContent)) {
    violations.push({ severity: "FATAL", message: "diBootstrap.ts imports from the state layer. The composition root must not depend on Redux or state management." });
  }
  if (/from ['"].*\/presentation\//.test(bootstrapFile.fileContent)) {
    violations.push({ severity: "FATAL", message: "diBootstrap.ts imports from the presentation layer. Only data and domain layer artifacts are permitted." });
  }

  // 3. Every use case declared in ThunkExtra must be instantiated in diBootstrap
  for (const node of graph.filter((n) => n.kind === "usecase")) {
    if (!bootstrapFile.fileContent.includes(`new ${node.concreteName}(`)) {
      violations.push({ severity: "FATAL", message: `UseCase '${node.concreteName}' is in the dependency graph but not instantiated in diBootstrap.ts.` });
    }
  }

  // 4. No `new ConcreteClass()` outside diBootstrap in generated files
  for (const file of generatedFiles) {
    if (file.outputPath.includes("diBootstrap")) continue;
    if (/new\s+\w+(RepositoryImpl|ApiDataSource|UseCase)\s*\(/.test(file.fileContent)) {
      violations.push({ severity: "FATAL", message: `Generated file '${file.outputPath}' contains a direct instantiation. Only diBootstrap.ts may instantiate concrete classes.` });
    }
  }

  return violations;
}
```

Run through this checklist before returning:

- [ ] All existing files were audited — no tight-coupling patterns found outside `diBootstrap.ts`
- [ ] Dependency graph was built without circular dependencies
- [ ] Instantiation order is: `ApiDataSource` → `RepositoryImpl` → `UseCase`
- [ ] Every use case's repository dependencies resolve to a node in the graph
- [ ] Constructor argument counts were verified for all repository implementations and use cases
- [ ] `diBootstrap.ts` does not import from the state or presentation layers
- [ ] Every use case declared in `ThunkExtra` is instantiated in `diBootstrap.ts`
- [ ] No generated file outside `diBootstrap.ts` contains `new ConcreteClass()`
- [ ] `violations[]` contains no `FATAL` entries before returning

---

## File Layout Reference

```
dependency-injector/
├── index.ts                          ← Orchestrator: runs steps 1–7 in order
├── auditCoupling.ts                  ← Step 2: tight-coupling pattern scanner
├── buildDependencyGraph.ts           ← Step 3: ordered DependencyNode graph
├── generateCompositionRoot.ts        ← Step 4: diBootstrap.ts — only permitted new() site
├── generateStoreWiringSnippet.ts     ← Step 5: advisory store.ts merge snippet
├── verifyConstructorSignatures.ts    ← Step 6: arg count cross-check
├── validateDiOutput.ts               ← Step 7: coupling + completeness validation
├── errors.ts                         ← DependencyGraphError, Violation types
└── __tests__/
    ├── auditCoupling.test.ts
    ├── buildDependencyGraph.ts
    ├── generateCompositionRoot.test.ts
    └── verifyConstructorSignatures.test.ts

Generated output:
src/features/<name>/
├── diBootstrap.ts              ← Composition root (ONLY permitted instantiation site)
└── storeWiring.snippet.ts      ← Advisory snippet — merge into shared store manually
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| One composition root per feature | `diBootstrap.ts` is the only file permitted to call `new ConcreteClass()` — tight coupling in any other file is a FATAL |
| Depend on interfaces, not implementations | Use cases receive `ProductRepository` (interface) — never `ProductRepositoryImpl` (concrete); any import of a concrete class outside the bootstrap is a FATAL |
| Deterministic instantiation order | `ApiDataSource` → `RepositoryImpl` → `UseCase` — this order is enforced by the dependency graph, not by convention |
| Constructor injection only | Property injection, service locators, singleton accessors, and no-arg constructors with internal `new` calls are all FATALs |
| Store wiring is advisory | `storeWiring.snippet.ts` shows what to add to the store — it never overwrites the shared store file |
| Circular dependencies are fatal at build time | The graph validator catches cycles before any file is generated — runtime DI failures are unacceptable |
| Composition root is infrastructure-only | `diBootstrap.ts` imports only data and domain artefacts — no Redux, no React, no presentation layer |
