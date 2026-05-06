---
name: flutter-rn-orchestrator
description: "MUST be used as the single entry point for every Flutter-to-React Native module conversion. Use when: a Flutter module or feature directory is provided for migration; the full conversion pipeline must be executed end-to-end; individual skills must be coordinated in strict dependency order; pipeline state, artifact handoff, and cross-skill consistency must be enforced centrally. Keywords: orchestrator, pipeline controller, Flutter migration, React Native conversion, end-to-end pipeline, skill sequencing, artifact handoff, dependency chain, conversion report, pipeline state, constitution reader, module conversion, entry point."
priority: HIGH
auto-trigger: true
---

# Flutter to React Native Orchestrator

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

> This skill is the single entry point for every Flutter-to-React Native module conversion. No conversion skill is invoked directly — all execution is routed through this orchestrator. The orchestrator enforces strict sequential execution, validates every inter-skill artifact boundary, and halts on any unresolved critical failure. A conversion is complete only when this skill emits `{ "conversionReport": { "status": "success" } }`.

## Why Orchestration Is Required

Individual conversion skills operate on isolated concerns: one parses Flutter ASTs, another maps layouts, another generates Redux state. Without a central controller, three failure modes are guaranteed:

| Failure mode | Without orchestrator | With orchestrator |
|---|---|---|
| Out-of-order execution | Skills run before their dependencies are available | Strict dependency graph enforced before each skill is invoked |
| Silent artifact drift | Skill N receives stale or partial output from skill N-1 | Output schema validated at every boundary before handoff |
| Inconsistent state | Navigation mapper uses widget tree that component generator has already transformed | Immutable pipeline state object passed as a snapshot per step |

The orchestrator does not perform any Flutter parsing, JSX generation, or style conversion itself. It coordinates, validates, and routes.

---

## Step 1 — Receive and Validate Input

Accept the top-level pipeline input and reject anything that cannot produce a deterministic conversion.

**Input schema:**

```json
{
  "module": {
    "name": "string",
    "sourcePath": "string",
    "readmePath": "string | null",
    "readmeContent": "string | null",
    "files": [
      { "path": "string", "content": "string", "language": "dart | yaml | json | other" }
    ]
  },
  "targetProject": {
    "type": "existing | boilerplate | new",
    "rnFiles": [
      { "path": "string", "content": "string" }
    ],
    "packageJson": "string | null",
    "hasEnvFile": false,
    "existingComponents": [
      { "name": "string", "path": "string", "type": "button | text | checkbox | input | modal | other" }
    ]
  },
  "apiConfig": {
    "baseUrl": "string | null",
    "promptUserForBaseUrl": true
  },
  "mockConfig": {
    "globalMockDefault": true,
    "perApiOverrides": {
      "<apiId>": { "mockEnabled": false, "delayMs": 0, "mockError": null }
    }
  },
  "constitutionConfig": null,
    "stopOnCritical": true,
    "maxRetries": 1,
    "dryRun": false,
    "skipCategories": []
  }
}
```

**Decision point:**
- If `module.files` is empty or absent → **FAIL**: `"CRITICAL: No source files provided. The orchestrator requires at least one Dart source file to begin the pipeline."`
- If no `.dart` file is present in `module.files` → **FAIL**: `"CRITICAL: No Dart files found in the module. Flutter-to-React Native conversion requires Dart source input."`
- If `constitutionConfig` is `null` → proceed without constitution enforcement but emit WARN: `"No constitutionConfig provided. Architecture rules will not be enforced. Run the Constitution Reader skill first for governed conversions."`
- If `pipelineOptions.stopOnCritical` is `false` → override to `true` and emit WARN: `"stopOnCritical was false. Overridden to true. The orchestrator never continues past an unresolved critical failure."`
- If `pipelineOptions.skipCategories` is non-empty → **override to `[]` (empty) and emit WARN for each entry**: `"WARN: skipCategories entry '{category}' was ignored. The orchestrator does not permit skipping pipeline steps — every step in PIPELINE_STEPS must execute. Remove 'skipCategories' from pipelineOptions to suppress this warning."` No step may be bypassed via skipCategories regardless of what is passed in.
- If `module.files` contains Dart files from **more than one distinct module root** (detected by differing top-level directory prefixes in their file paths, e.g. `feature/portfolio/` and `feature/portfolio_v2/` both present in the same input) → **FAIL**: `"CRITICAL: Multiple module roots detected in the input files: [{roots}]. The orchestrator processes exactly one module root per pipeline run. Split the input into separate pipeline invocations — one per module root — before proceeding."` Never attempt to merge files from different module trees into a single pipeline context.
- If `module.files` contains files with paths under top-level folder names (`controllers/`, `mappers/`, `models/`, `repositories/`, `widgets/`) that are **not** nested inside any `feature/` subdirectory → do **not** FAIL; emit a WARN for each such folder: `"WARN: Top-level shared folder '{folderName}/' detected outside any 'feature/' directory in the input. Files here cross feature boundaries and need explicit placement decisions before conversion. Each file must be assigned to a specific feature layer (domain/data/presentation) or to a 'core/' shared module. All such files are inventoried in pipelineContext.sharedFolderInventory[] so downstream skills can resolve import dependencies."` Add every discovered path to a new `pipelineContext.sharedFolderInventory: string[]` field so downstream skills can cross-reference them when resolving unresolved imports.
- If `targetProject.type` is `"boilerplate"` or `"new"` → emit WARN: `"WARN: Target project has no prior structure. The pipeline will scaffold all required folders and generate a .env file with placeholder values. Review and configure .env before running the app."` and set `pipelineContext.isNewProject = true` so all downstream skills generate full scaffolding rather than extending existing structure.
- If `targetProject.hasEnvFile` is `false` → pipeline will auto-generate `.env` and `.env.example` at pipeline finalization (Step 8). Log: `"INFO: No .env file detected. Environment config files will be generated as part of this conversion."`
- If `apiConfig.baseUrl` is null or empty AND `apiConfig.promptUserForBaseUrl` is `true` → **PROMPT**: `"ACTION REQUIRED: Provide the Base URL for API integration. Example: https://api.example.com/v1 — If you cannot provide it now, the pipeline will attempt to extract it from the Flutter source files (look for baseUrl, ApiConfig, Dio baseUrl, or http.Client url patterns in .dart files). Respond with the URL or type 'extract' to auto-extract."` Store result in `pipelineContext.resolvedBaseUrl`. If the user responds 'extract' or provides no answer, proceed with Step 1b below.
- If `targetProject.existingComponents` is non-empty → store the catalog in `pipelineContext.existingComponentCatalog` and emit: `"INFO: {count} existing components catalogued. Widget-to-JSX Converter will prioritize reuse over new component generation."`
- If `module.readmeContent` is non-null → store in `pipelineContext.readmeContent` and emit INFO: `"INFO: README content pre-loaded ({length} chars). Constitution Reader will use it for supplementary insight extraction (Step 1c)."`
- If `module.readmeContent` is null but `module.readmePath` is non-null → the orchestrator attempts to read the file at `module.readmePath` before passing it to Constitution Reader. If the file is missing, set `readmeContent = null` and emit WARN: `"WARN: readmePath '{path}' specified but file not found. Proceeding without README context."`
- **mockConfig.globalMockDefault validation (critical):** If `mockConfig.globalMockDefault` is not provided → default to `true` and emit WARN: `"WARN: mockConfig.globalMockDefault not set. Defaulting to true (all APIs use mock data). Set to false to call real APIs."` Store the resolved value in `pipelineContext.globalMockDefault` and forward it to Step 11 (Mock Data Generator) as the `globalMockDefault` input. This value must NEVER be modified or overridden by any downstream step — it is set once here and consumed verbatim by the Mock Data Generator. If `perApiOverrides` contains entries, they only affect per-API `mockEnabled` flags — they cannot change `globalMockDefault`.
- **README loading for two-phase processing:** If `module.readmeContent` is non-null, the Constitution Reader (Step 1) must process it in Phase 1 before loading GSD artifacts. This ensures the README-derived model is built first, then validated against the codebase in Phase 2. The `pipelineContext.readmeContent` field is the input to Phase 1 of the Constitution Reader.

**Rule:** Input validation is the first and only gate that runs outside the pipeline step sequence. All other validation runs inside steps 3–12. Nothing proceeds until Step 1 produces a clean `PipelineContext`.

---

## Step 1b — Auto-Extract Base URL from Flutter Source (Conditional)

Run this step only when `apiConfig.baseUrl` is null **and** the user responded 'extract' or did not provide a URL in Step 1. Scan all Dart source files for the Base URL declaration before Step 2 proceeds.

```ts
// flutter-rn-orchestrator/extractBaseUrl.ts

const BASE_URL_PATTERNS: Array<{ regex: RegExp; description: string }> = [
  { regex: /baseUrl\s*[=:]\s*['"]([^'"]+)['"]/,              description: "Dart baseUrl assignment" },
  { regex: /baseOptions\.baseUrl\s*=\s*['"]([^'"]+)['"]/,    description: "Dio baseOptions.baseUrl" },
  { regex: /Dio\s*\(\s*BaseOptions\s*\(\s*baseUrl:\s*['"]([^'"]+)['"]/,  description: "Dio constructor baseUrl" },
  { regex: /Uri\.parse\s*\(\s*['"]([^'"]+)['"]\s*\)/,        description: "Uri.parse base" },
  { regex: /ApiConfig\.baseUrl\s*=\s*['"]([^'"]+)['"]/,      description: "ApiConfig.baseUrl" },
  { regex: /static\s+const\s+\w*[Bb]ase[Uu][Rr][Ll]\w*\s*=\s*['"]([^'"]+)['"]/,  description: "Static const baseUrl" },
  { regex: /kBaseUrl\s*=\s*['"]([^'"]+)['"]/,                description: "kBaseUrl constant" },
  { regex: /BASE_URL\s*=\s*['"]([^'"]+)['"]/,                description: "BASE_URL constant" },
];

export function extractBaseUrlFromFlutter(dartFiles: Array<{ path: string; content: string }>): string | null {
  for (const file of dartFiles) {
    for (const { regex } of BASE_URL_PATTERNS) {
      const match = regex.exec(file.content);
      if (match?.[1]) {
        const extracted = match[1];
        // Emit info about the extraction source
        console.info(`INFO: Base URL '${extracted}' extracted from '${file.path}' using pattern '${BASE_URL_PATTERNS.find(p => p.regex === regex)?.description}'.`);
        return extracted;
      }
    }
  }
  return null;
}
```

**Decision point:**
- If extraction finds a URL → set `pipelineContext.resolvedBaseUrl = extractedUrl` and emit: `"INFO: Base URL auto-extracted from Flutter source: '{url}'. Verify this is correct for the target environment before running the app."`
- If extraction finds **multiple distinct** URLs → emit WARN for each: `"WARN: Multiple Base URL candidates found: [{urls}]. Using the first match. Set apiConfig.baseUrl explicitly to override."` and use the first found.
- If extraction finds **no** URL → emit WARN: `"WARN: Could not extract Base URL from Flutter source. Generated apiClient.ts will use a TODO placeholder. Configure API_BASE_URL in .env before running the app."` Set `pipelineContext.resolvedBaseUrl = null`.
- `resolvedBaseUrl` is passed as `apiOutput.baseUrl` to both the API Integration skill (Step 10) and the Data Layer Builder (Step 11).

---

---

## Step 2 — Initialize Pipeline State

Construct the immutable `PipelineContext` that is passed to every subsequent step. No skill receives mutable shared state — each step receives a context snapshot and returns a new artifact.

```ts
// flutter-rn-orchestrator/initPipelineState.ts

export type StepStatus = "pending" | "running" | "success" | "skipped" | "failed";

export type ErrorClass = "CRITICAL" | "NON_CRITICAL";

export interface PipelineError {
  step: number;
  stepName: string;
  errorClass: ErrorClass;
  message: string;
  retryCount: number;
  timestamp: string;
}

export interface PipelineWarning {
  step: number;
  stepName: string;
  message: string;
  timestamp: string;
}

export interface StepRecord {
  stepNumber: number;
  stepName: string;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  inputArtifactKeys: string[];
  outputArtifactKeys: string[];
  errors: PipelineError[];
  warnings: PipelineWarning[];
}

export interface PipelineContext {
  readonly pipelineId: string;
  readonly moduleName: string;
  readonly startedAt: string;
  readonly isNewProject: boolean;           // true when targetProject.type is "boilerplate" or "new"
  readonly resolvedBaseUrl: string | null;  // from user input or auto-extraction
  readonly existingComponentCatalog: Array<{ name: string; path: string; type: string }>;
  readonly gsdArtifactsLoaded: string[];    // Names of GSD artifacts successfully loaded by Constitution Reader
  readonly gsdArtifactsMissing: string[];   // Names of GSD artifacts that were not found
  readonly primarySource: "gsd" | "constitution" | "mixed";  // Primary authority source for this pipeline run
  readonly concerns: CodebaseConcern[];     // Anti-patterns from CONCERNS.md — passed to all downstream skills
  readonly readmeContent: string | null;    // Raw README content forwarded to all skills (from module.readmeContent)
  readonly referenceStructure: ReferenceStructure | null;  // Generated by Step 1 (Constitution Reader); null until then
  readonly globalMockDefault: boolean;      // Top-level mockConfig.globalMockDefault — forwarded verbatim to Step 11 (Mock Data Generator). NEVER overridden by perApiOverrides or any downstream step.
  steps: StepRecord[];
  artifacts: Map<string, unknown>;       // Key: artifact type name; Value: skill output
  errors: PipelineError[];
  warnings: PipelineWarning[];
  status: "running" | "success" | "failed";
}

export function initPipelineState(input: PipelineInput): PipelineContext {
  const steps: StepRecord[] = PIPELINE_STEPS.map((step) => ({
    stepNumber: step.number,
    stepName: step.name,
    status: "pending",
    startedAt: null,
    completedAt: null,
    inputArtifactKeys: step.requires,
    outputArtifactKeys: step.produces,
    errors: [],
    warnings: [],
  }));

  return {
    pipelineId: generatePipelineId(),
    moduleName: input.module.name,
    startedAt: new Date().toISOString(),
    isNewProject: input.targetProject?.type === "boilerplate" || input.targetProject?.type === "new",
    resolvedBaseUrl: input.apiConfig?.baseUrl ?? null,
    existingComponentCatalog: input.targetProject?.existingComponents ?? [],
    gsdArtifactsLoaded: [],        // Populated after Constitution Reader (Step 1) completes
    gsdArtifactsMissing: [],       // Populated after Constitution Reader (Step 1) completes
    primarySource: "constitution", // Updated to "gsd" or "mixed" after Constitution Reader runs
    concerns: [],                  // Populated from CONCERNS.md after Constitution Reader completes
    readmeContent: input.module.readmeContent ?? null,  // Forwarded to all downstream skills
    referenceStructure: null,      // Populated after Constitution Reader (Step 1) completes
    globalMockDefault: input.mockConfig?.globalMockDefault ?? true,  // Default true; forwarded verbatim to Mock Data Generator
    steps,
    artifacts: new Map([["sourceFiles", input.module.files]]),
    errors: [],
    warnings: [],
    status: "running",
  };
}
```

**Rule:** `artifacts` is the single source of truth for all inter-skill data. No skill communicates with another skill directly. All data flows through `artifacts`. A skill reads its required keys from `artifacts`, executes, and writes its output keys back to `artifacts`. The orchestrator performs this read-write handoff — no skill touches `artifacts` directly.

---

## Step 3 — Define the Pipeline Step Registry

Declare the canonical ordered sequence of all conversion skills, their required input artifact keys, and their produced output artifact keys. This registry is the authoritative execution contract.

```ts
// flutter-rn-orchestrator/pipelineRegistry.ts

export interface PipelineStep {
  number: number;
  name: string;
  skillName: string;
  requires: string[];   // artifact keys that must exist before this step runs
  produces: string[];   // artifact keys this step writes on success
  retryable: boolean;
  critical: boolean;    // if true, failure halts the entire pipeline
  perFeature: boolean;  // if true, the step is invoked once per feature in domainOutput.features[]
                        // and results are merged into a single combined artifact
}

export const PIPELINE_STEPS: readonly PipelineStep[] = Object.freeze([
  {
    number: 1,
    name: "Constitution Reader",
    skillName: "readme-constitution-reader",
    requires: ["sourceFiles"],
    produces: ["constitutionConfig", "referenceStructure"],  // referenceStructure generated in Step 8b
    retryable: false,
    critical: true,    // MUST always run — downstream skills require constitutionConfig even when empty
    perFeature: false,
  },
  {
    number: 2,
    name: "Flutter Module and Component Analyzer",
    skillName: "flutter-parser",
    requires: ["sourceFiles"],
    produces: ["parsedFlutter"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 3,
    name: "UI Structure Mapper",
    skillName: "component-classifier",
    requires: ["parsedFlutter", "constitutionConfig"],
    produces: ["classifiedComponents"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 4,
    name: "Layout Converter",
    skillName: "layout-converter",
    requires: ["parsedFlutter", "classifiedComponents"],
    produces: ["layoutOutput"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 5,
    name: "Styling and Theme Extractor",
    skillName: "styling-converter",
    requires: ["parsedFlutter", "classifiedComponents"],
    produces: ["styleOutput"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 6,
    name: "Business Logic Extractor",
    skillName: "domain-extraction",
    requires: ["parsedFlutter", "classifiedComponents", "constitutionConfig"],
    produces: ["domainOutput"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 7,
    name: "State Management Mapper",
    skillName: "redux-state-generator",
    requires: ["domainOutput", "constitutionConfig"],
    produces: ["stateOutput"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 8,
    name: "Navigation Mapper",
    skillName: "navigation-converter",
    requires: ["parsedFlutter", "classifiedComponents"],
    produces: ["navigationOutput"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 9,
    name: "Asset and Resource Mapper",
    skillName: "feature-folder-generator",
    requires: ["classifiedComponents", "constitutionConfig"],
    produces: ["folderManifest"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 10,
    name: "API Integration Mapper",
    skillName: "api-integration",
    requires: ["parsedFlutter", "domainOutput", "constitutionConfig"],
    produces: ["apiOutput"],
    retryable: true,
    critical: true,
    perFeature: false,
  },
  {
    number: 11,
    name: "Mock Data Generator",
    skillName: "mock-data-generator",
    requires: ["apiOutput", "domainOutput"],
    produces: ["mockOutput"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 12,
    name: "Data Layer Builder",
    skillName: "data-layer-builder",
    requires: ["apiOutput", "domainOutput", "mockOutput"],
    produces: ["dataLayerOutput"],
    retryable: false,
    critical: true,
    perFeature: true,   // Invoked once per feature in domainOutput.features[]. Results merged into dataLayerOutput.
  },
  {
    number: 13,
    name: "Dependency Injector",
    skillName: "dependency-injector",
    requires: ["dataLayerOutput", "domainOutput", "stateOutput"],
    produces: ["diOutput"],
    retryable: false,
    critical: true,
    perFeature: true,   // Invoked once per feature. diOutput.diBootstrap and diOutput.createThunkExtra merged per feature.
  },
  {
    number: 14,
    name: "React Native Component Generator",
    skillName: "widget-to-jsx-converter",
    requires: ["classifiedComponents", "styleOutput", "navigationOutput", "folderManifest", "layoutOutput"],
    produces: ["generatedComponents"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 15,
    name: "Code Quality and Accessibility Enhancer",
    skillName: "typescript-enforcer",
    requires: ["generatedComponents", "stateOutput", "apiOutput", "diOutput"],
    produces: ["enforcedFiles"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 16,
    name: "Test Generator",
    skillName: "test-generator",
    requires: ["enforcedFiles", "constitutionConfig", "mockOutput"],
    produces: ["testOutput"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 17,
    name: "React Native Environment Validator",
    skillName: "final-validator",
    requires: ["enforcedFiles", "folderManifest", "navigationOutput", "constitutionConfig", "testOutput", "mockOutput"],
    produces: ["validationResult"],
    retryable: false,
    critical: true,
    perFeature: false,
  },
  {
    number: 18,
    name: "API Execution Trace Documentation",
    skillName: "api-execution-trace",
    requires: ["apiOutput", "dataLayerOutput"],
    produces: ["apiTraceOutput"],
    retryable: false,
    critical: true,    // MUST always run — api_info.md is a required pipeline deliverable, not optional documentation
    perFeature: true,  // Invoked once per feature. apiTraceOutput.apiList merged across features.
  },
  {
    number: 19,
    name: "Environment Configuration Generator",
    skillName: "env-config-generator",
    requires: ["apiOutput", "dataLayerOutput", "diOutput"],
    produces: ["envConfigOutput"],
    retryable: false,
    critical: true,    // MUST always run — .env and .env.example are required deliverables; app cannot start without API_BASE_URL
    perFeature: false,
  },
]);
```

**Rule:** The `PIPELINE_STEPS` array is frozen. No runtime code may reorder, remove, or insert steps. If a step needs to be bypassed, it must be marked `skipped` in its `StepRecord` — it is never removed from the registry.

---

## Step 3b — Initialize the Todo List (One Todo Per Pipeline Step)

Before invoking any skill, create a todo list with **exactly one todo item per entry in `PIPELINE_STEPS`**. This is a hard rule — steps must never be grouped, merged, or combined into a single todo item. The purpose is to give the user full per-skill visibility into pipeline progress.

**Rules:**
- The todo list is created in full from `PIPELINE_STEPS` **before the execution loop begins** — all items start as `not-started`.
- Each todo item uses the format: `Step {number} — {name}` (e.g. `Step 1 — Constitution Reader`, `Step 6 — Business Logic Extractor`).
- **Never merge steps** (e.g. do not create a single todo like "Steps 6–7: Domain + State" or "Layout + Styling"). The pipeline contains 19 discrete steps; the todo list must therefore contain exactly **19** items.
- **Never omit a step from the todo list.** All 19 steps appear in the todo list regardless of whether the caller passed `skipCategories`. `skipCategories` is overridden to `[]` at Step 1 — no step is ever legitimately skipped.
- When the execution loop in Step 4 begins a step, mark that step's todo as `in-progress` **before** invoking the skill. Mark it `completed` **immediately** after the skill result passes schema validation. Mark it `failed` if the step errors.
- At most one todo may be `in-progress` at any time.
- The todo list is never re-created mid-pipeline — it is initialized once and updated in place.
- **If the pipeline halts on a CRITICAL error, all remaining todos stay `not-started` and are visible to the user.** Never mark downstream todos `skipped` or remove them — the user must see exactly which steps did not run.

**Per-skill TODO file rule (MANDATORY — separate from the todo list above):**
- Immediately after each skill execution completes (success, failure, or partial), write a dedicated `TODO.md` file at: `<skillName>/TODO.md` (e.g. `readme-constitution-reader/TODO.md`).
- This file is written **before advancing to the next skill** — never deferred.
- The `Skill_info.md` audit log must have a reference line appended for every skill: `- TODOs: [<skillName>/TODO.md](<skillName>/TODO.md)`.
- If `pipelineOptions.dryRun === true`, print the TODO content to console instead of writing the file.
- **Template** — use this exact structure for every per-skill `TODO.md`:

```markdown
# TODO — <Skill Name> (Step <N>)

**Status:** completed | failed | partial  
**Timestamp:** YYYY-MM-DDTHH:MM:SSZ

## Inputs Consumed
- [ ] Confirm inputs received: list artifact keys consumed (e.g. `sourceFiles`, `parsedFlutter`)
- [ ] README content used: yes | no | n/a
- [ ] GSD artifacts consulted: list names (e.g. `INTEGRATIONS.md`)
- [ ] `Hardcoded_Response` / seeded data: used | not used | n/a

## Outputs Produced
- [ ] List artifact keys written (e.g. `apiOutput`, `mockOutput`)
- [ ] List files created or modified (with paths)
- [ ] `probedResponseShape` populated: yes (N fields) | no | n/a

## Validation
- [ ] Output schema validated: pass | fail (list errors)
- [ ] UNMAPPED KEYS check: pass | pending | n/a
- [ ] Mock data source tier: live-api | exampleValue | heuristic | n/a
- [ ] URL verification status: [URL-VERIFIED] | [URL-VERIFIED-PATH] | [URL-UNVERIFIED] | n/a

## Issues & Follow-ups
- [ ] List any open issues, WARNs, or FATALs emitted by this skill
- [ ] List any manual review items required before shipping

## Completion Summary
<one-line summary of what this skill did>
```

```ts
// flutter-rn-orchestrator/writeSkillTodo.ts

import fs from "fs/promises";
import path from "path";

export async function writeSkillTodo(
  workspaceRoot: string,
  step: PipelineStep,
  record: StepRecord,
  dryRun = false
): Promise<void> {
  const status = record.status === "success" ? "completed"
               : record.status === "failed"  ? "failed"
               : "partial";
  const timestamp = record.completedAt ?? new Date().toISOString();

  const issues = record.errors.map(e => `- [ ] [${e.errorClass}] ${e.message}`).join("\n")
    || record.warnings.map(w => `- [ ] WARN: ${w.message}`).join("\n")
    || "- [ ] None";

  const content = [
    `# TODO — ${step.name} (Step ${step.number})`,
    ``,
    `**Status:** ${status}  `,
    `**Timestamp:** ${timestamp}`,
    ``,
    `## Inputs Consumed`,
    `- [ ] Confirm inputs received: ${step.requires.map(r => `\`${r}\``).join(", ") || "none"}`,
    `- [ ] README content used: pending`,
    `- [ ] GSD artifacts consulted: pending`,
    `- [ ] \`Hardcoded_Response\` / seeded data: pending`,
    ``,
    `## Outputs Produced`,
    `- [ ] Artifact keys written: ${step.produces.map(p => `\`${p}\``).join(", ") || "none"}`,
    `- [ ] Files created/modified: pending — review skill output`,
    `- [ ] \`probedResponseShape\` populated: n/a`,
    ``,
    `## Validation`,
    `- [ ] Output schema validated: ${status === "completed" ? "pass" : "fail"}`,
    `- [ ] UNMAPPED KEYS check: pending`,
    `- [ ] Mock data source tier: n/a`,
    `- [ ] URL verification status: n/a`,
    ``,
    `## Issues & Follow-ups`,
    issues,
    ``,
    `## Completion Summary`,
    `${step.name} finished with status: ${status}.`,
  ].join("\n");

  if (dryRun) {
    console.info(`[DRY-RUN] TODO for Step ${step.number} (${step.skillName}):\n${content}`);
    return;
  }

  const skillDir  = path.join(workspaceRoot, step.skillName);
  const todoPath  = path.join(skillDir, "TODO.md");
  const skillInfoPath = path.join(workspaceRoot, "Skill_info.md");

  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(todoPath, content, "utf8");

  // Append reference line to Skill_info.md (create if missing)
  const refLine = `\n- TODOs: [${step.skillName}/TODO.md](${step.skillName}/TODO.md)\n`;
  try {
    await fs.appendFile(skillInfoPath, refLine, "utf8");
  } catch {
    await fs.writeFile(skillInfoPath, `# Skill Audit Log\n${refLine}`, "utf8");
  }
}
```

```ts
// Canonical todo item labels — one per PIPELINE_STEPS entry, in order (19 total):
// "Step 1  — Constitution Reader"
// "Step 2  — Flutter Module and Component Analyzer"
// "Step 3  — UI Structure Mapper"
// "Step 4  — Layout Converter"
// "Step 5  — Styling and Theme Extractor"
// "Step 6  — Business Logic Extractor"
// "Step 7  — State Management Mapper"
// "Step 8  — Navigation Mapper"
// "Step 9  — Asset and Resource Mapper"
// "Step 10 — API Integration Mapper"
// "Step 11 — Mock Data Generator"
// "Step 12 — Data Layer Builder"
// "Step 13 — Dependency Injector"
// "Step 14 — React Native Component Generator"
// "Step 15 — Code Quality and Accessibility Enhancer"
// "Step 16 — Test Generator"
// "Step 17 — React Native Environment Validator"
// "Step 18 — API Execution Trace Documentation"
// "Step 19 — Environment Configuration Generator"
// Total: 19 items — one per PIPELINE_STEPS entry. Never fewer, never more.
```

**Decision point:**
- If a step is skipped (e.g. its category is in `skipCategories`) → mark the todo as `skipped`, not `completed`. Never silently omit a skipped step from the todo list.
- If the pipeline halts early due to a CRITICAL error → mark the currently-running step's todo as `failed`, leave all remaining todos as `not-started`. Do not mark downstream todos as `skipped` unless the pipeline options explicitly skip them.

---

## Step 4 — Execute Each Skill Sequentially

Iterate through `PIPELINE_STEPS` in index order. Before invoking each skill, resolve its dependencies. After each invocation, validate its output. Never advance to step N+1 if step N produced a critical failure.

```ts
// flutter-rn-orchestrator/executePipeline.ts

export async function executePipeline(
  context: PipelineContext,
  input: PipelineInput,
  options: PipelineOptions
): Promise<PipelineContext> {

  for (const step of PIPELINE_STEPS) {
    const record = context.steps[step.number - 1];

    // ── Phase A: Dependency resolution ──────────────────────────────────────
    const missing = resolveDependencies(step, context.artifacts, context);
    if (missing.length > 0) {
      const error: PipelineError = {
        step: step.number,
        stepName: step.name,
        errorClass: "CRITICAL",
        message: `Step ${step.number} (${step.name}) cannot execute: required artifacts are missing: [${missing.join(", ")}]. A prior step likely failed.`,
        retryCount: 0,
        timestamp: new Date().toISOString(),
      };
      record.status = "failed";
      record.errors.push(error);
      context.errors.push(error);
      context.status = "failed";
      break; // Hard stop — dependency chain is broken
    }

    // ── Phase B: Skill invocation ────────────────────────────────────────────
    record.status = "running";
    record.startedAt = new Date().toISOString();

    // ── Per-feature iteration ────────────────────────────────────────────────
    // Steps marked perFeature:true are invoked once per feature declared in
    // domainOutput.features[]. Results are merged before writing to artifacts.
    // Steps with perFeature:false are invoked exactly once (standard behaviour).
    const featureNames: string[] = step.perFeature
      ? (() => {
          const domainOutput = context.artifacts.get("domainOutput") as { features?: string[] } | undefined;
          const names = domainOutput?.features ?? [];
          if (names.length === 0) {
            context.warnings.push({
              step: step.number,
              stepName: step.name,
              message: `Step ${step.number} (${step.name}) is perFeature:true but domainOutput.features[] is empty. ` +
                `Falling back to a single invocation with featureName derived from moduleName.`,
              timestamp: new Date().toISOString(),
            });
            return [context.moduleName];
          }
          return names;
        })()
      : [null as unknown as string]; // Single-invocation sentinel

    // Collect merged results across all feature invocations
    const perFeatureResults: SkillResult[] = [];

    let skillResult: SkillResult | null = null;
    let attempts = 0;
    const maxAttempts = step.retryable ? options.maxRetries + 1 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        if (step.perFeature) {
          // ── Per-feature invocation loop ──────────────────────────────────────
          // Invoke the skill once per feature. Each feature invocation receives a
          // skill input scoped to that feature's slice of apiOutput and domainOutput.
          // All results are accumulated in perFeatureResults[] and merged after the loop.
          for (const featureName of featureNames) {
            const skillInput = buildSkillInput(step, context.artifacts, input.constitutionConfig, featureName, context.concerns, context.readmeContent, context.referenceStructure, context.globalMockDefault);
            const featureResult = await invokeSkill(step.skillName, skillInput);
            perFeatureResults.push(featureResult);
          }
          // Merge all per-feature results into a single skillResult artifact.
          skillResult = mergePerFeatureResults(step, perFeatureResults);
        } else {
          const skillInput = buildSkillInput(step, context.artifacts, input.constitutionConfig, undefined, context.concerns, context.readmeContent, context.referenceStructure, context.globalMockDefault);
          skillResult = await invokeSkill(step.skillName, skillInput);
        }
        break;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempts < maxAttempts) {
          context.warnings.push({ step: step.number, stepName: step.name, message: `Attempt ${attempts} failed: ${message}. Retrying.`, timestamp: new Date().toISOString() });
        } else {
          const error: PipelineError = {
            step: step.number,
            stepName: step.name,
            errorClass: step.critical ? "CRITICAL" : "NON_CRITICAL",
            message: `Step ${step.number} (${step.name}) failed after ${attempts} attempt(s): ${message}`,
            retryCount: attempts - 1,
            timestamp: new Date().toISOString(),
          };
          record.errors.push(error);
          context.errors.push(error);
        }
      }
    }

    // ── Phase C: Output schema validation ───────────────────────────────────
    if (skillResult !== null) {
      const schemaErrors = validateOutputSchema(step, skillResult);
      if (schemaErrors.length > 0) {
        for (const msg of schemaErrors) {
          const error: PipelineError = {
            step: step.number,
            stepName: step.name,
            errorClass: "CRITICAL",
            message: `Output schema violation after step ${step.number} (${step.name}): ${msg}`,
            retryCount: 0,
            timestamp: new Date().toISOString(),
          };
          record.errors.push(error);
          context.errors.push(error);
        }
      } else {
        // Write artifacts only when schema is valid
        for (const key of step.produces) {
          context.artifacts.set(key, (skillResult as Record<string, unknown>)[key]);
        }
        record.status = "success";

        // ── Post-step: propagate GSD data from Constitution Reader back into context ──
        // Step 1 (constitution-reader) loads GSD artifacts and extracts concerns.
        // These must be written back to the pipeline context so all downstream skills
        // can access concerns[] and GSD metadata without re-reading constitutionConfig.
        if (step.number === 1) {
          const config = context.artifacts.get("constitutionConfig") as Record<string, unknown> | undefined;
          if (config) {
            (context as { gsdArtifactsLoaded: string[] }).gsdArtifactsLoaded = (config["gsdArtifactsLoaded"] as string[]) ?? [];
            (context as { gsdArtifactsMissing: string[] }).gsdArtifactsMissing = (config["gsdArtifactsMissing"] as string[]) ?? [];
            (context as { primarySource: string }).primarySource = (config["primarySource"] as string) ?? "constitution";
            (context as { concerns: unknown[] }).concerns = (config["concerns"] as unknown[]) ?? [];
            // Propagate referenceStructure from constitutionConfig → pipelineContext
            const refStructure = config["referenceStructure"] as ReferenceStructure | null ?? null;
            (context as { referenceStructure: ReferenceStructure | null }).referenceStructure = refStructure;
            if (refStructure) {
              context.artifacts.set("referenceStructure", refStructure);
            }
            context.warnings.push({
              step: step.number,
              stepName: step.name,
              message: `INFO: GSD data propagated to pipeline context. primarySource='${config["primarySource"]}', concerns=${(config["concerns"] as unknown[])?.length ?? 0}, gsdArtifactsLoaded=[${(config["gsdArtifactsLoaded"] as string[])?.join(", ") ?? ""}]. README insights: ${(config["readmeInsights"] as { source?: string })?.source ?? "none"}.`,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // ── Post-step: propagate confirmedBaseUrl from API Integration back into context ──
        // Step 10 (api-integration) is the only step that interactively resolves the base URL
        // with the user. Once it succeeds, its confirmed value must be written back so that
        // Step 18 (env-config-generator) can emit the correct API_BASE_URL in the .env file.
        if (step.number === 10) {
          const apiOut = context.artifacts.get("apiOutput") as { confirmedBaseUrl?: string } | undefined;
          if (apiOut?.confirmedBaseUrl) {
            (context as { resolvedBaseUrl: string | null }).resolvedBaseUrl = apiOut.confirmedBaseUrl;
            context.warnings.push({
              step: step.number,
              stepName: step.name,
              message: `INFO: confirmedBaseUrl '${apiOut.confirmedBaseUrl}' written back to pipelineContext.resolvedBaseUrl. Step 18 will emit this value as API_BASE_URL in .env.`,
              timestamp: new Date().toISOString(),
            });
          } else {
            context.warnings.push({
              step: step.number,
              stepName: step.name,
              message: "WARN: apiOutput.confirmedBaseUrl is missing after Step 10. The .env file will not contain a valid API_BASE_URL. Set it manually before running the app.",
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    record.completedAt = new Date().toISOString();

    // ── Phase D: Write per-skill TODO.md (MANDATORY — runs regardless of success/failure) ──
    // Write the TODO file immediately before advancing to the next skill.
    // This must never be deferred or batched — each skill gets its own TODO.md
    // written at the moment that skill finishes.
    await writeSkillTodo(
      options.workspaceRoot,
      step,
      record,
      options.dryRun ?? false
    );

    if (record.status !== "success") {
      const hasCritical = record.errors.some((e) => e.errorClass === "CRITICAL");
      if (hasCritical && options.stopOnCritical) {
        context.status = "failed";
        break;
      }
    }
  }

  return context;
}
```

**Decision point:**
- If a step's `requires` key is absent from `artifacts` → **CRITICAL** — stop the pipeline immediately. Do not attempt the step.
- If a skill throws an exception and `step.retryable` is `true` → retry up to `maxRetries` times with a WARN logged per attempt.
- If a skill throws after all retry attempts are exhausted → always classify as **CRITICAL**. Every step is `critical: true` — there is no `NON_CRITICAL` classification in this pipeline.
- If output schema validation fails → **CRITICAL** regardless of any other flag. Invalid artifacts must never be written to the context.
- **A step may never be silently skipped.** If a step cannot run due to a missing dependency, it is marked `failed` — never `skipped`. The only legitimate `skipped` state is one where a CRITICAL error in a prior step caused the pipeline to halt before reaching this step, and the user must see it as `not-started` in the todo list, not `skipped`.
- **Per-feature steps (`perFeature: true`):** if the skill invocation for **any single feature** throws a CRITICAL error, the entire step is marked `failed` and the pipeline halts. All features are attempted before halting so all failures are surfaced together.

**Per-feature merge rules (applied by `mergePerFeatureResults`):**

| Artifact | Merge strategy |
|---|---|
| `dataLayerOutput` | `repositoryImpls[]`, `apiDataSources[]`, `mappers[]` concatenated across all features |
| `diOutput` | `diBootstrap` and `createThunkExtra` concatenated per-feature; `violations[]` concatenated |
| `apiTraceOutput` | `apiList[]` concatenated; `totalApis` summed; `violations[]` concatenated; `fileName` becomes `"api_info.md"` (shared) |

---

## Step 5 — Validate Output Schema at Every Boundary

After each skill returns, verify that its output conforms to the expected artifact schema before writing it to the pipeline context.

```ts
// flutter-rn-orchestrator/validateOutputSchema.ts

const OUTPUT_SCHEMAS: Record<string, (output: unknown) => string[]> = {
  constitutionConfig: (o) => {
    const errors: string[] = [];
    if (typeof o !== "object" || o === null) { errors.push("constitutionConfig must be an object"); return errors; }
    const c = o as Record<string, unknown>;
    // GSD-derived required fields (populated by the GSD-first Constitution Reader)
    if (!Array.isArray(c["concerns"]))           errors.push("constitutionConfig.concerns must be an array of CodebaseConcern[] — populated from CONCERNS.md");
    if (!Array.isArray(c["gsdArtifactsLoaded"])) errors.push("constitutionConfig.gsdArtifactsLoaded must be an array of loaded GSD artifact names");
    if (!Array.isArray(c["gsdArtifactsMissing"])) errors.push("constitutionConfig.gsdArtifactsMissing must be an array of missing GSD artifact names");
    if (typeof c["primarySource"] !== "string")  errors.push("constitutionConfig.primarySource must be 'gsd' | 'constitution' | 'mixed'");
    // GSD-derived optional but expected fields
    if (!Array.isArray(c["conventions"]))         errors.push("constitutionConfig.conventions must be an array of convention strings — populated from CONVENTIONS.md");
    if (!Array.isArray(c["featureModules"]))      errors.push("constitutionConfig.featureModules must be an array — populated from STRUCTURE.md");
    if (!Array.isArray(c["sharedModules"]))       errors.push("constitutionConfig.sharedModules must be an array — populated from STRUCTURE.md");
    // README supplementary fields (always present — source:"none" if no README)
    if (!c["readmeInsights"] || typeof c["readmeInsights"] !== "object")
      errors.push("constitutionConfig.readmeInsights must be a ReadmeInsights object (source:'none' if no README was provided)");
    // Original required fields
    if (!c["layers"] || !Array.isArray(c["layers"]))  errors.push("constitutionConfig.layers must be a non-empty array of LayerDefinition[]");
    if (!c["techStack"] || typeof c["techStack"] !== "object") errors.push("constitutionConfig.techStack must be an object");
    return errors;
  },
  parsedFlutter: (o) => {
    const errors: string[] = [];
    const p = o as Record<string, unknown>;
    if (!Array.isArray(p["widgets"])) errors.push("parsedFlutter.widgets must be an array");
    if (!Array.isArray(p["violations"])) errors.push("parsedFlutter.violations must be an array");
    return errors;
  },
  classifiedComponents: (o) => {
    const errors: string[] = [];
    const c = o as Record<string, unknown>;
    if (!c["presentation"]) errors.push("classifiedComponents.presentation is required");
    if (!c["domainLogic"])  errors.push("classifiedComponents.domainLogic is required");
    if (!c["apiLayer"])     errors.push("classifiedComponents.apiLayer is required");
    if (!c["stateLogic"])   errors.push("classifiedComponents.stateLogic is required");
    return errors;
  },
  styleOutput: (o) => {
    const errors: string[] = [];
    const s = o as Record<string, unknown>;
    if (!Array.isArray(s["styleSheetEntries"])) errors.push("styleOutput.styleSheetEntries must be an array");
    if (!Array.isArray(s["violations"]))        errors.push("styleOutput.violations must be an array");
    return errors;
  },
  domainOutput: (o) => {
    const errors: string[] = [];
    const d = o as Record<string, unknown>;
    if (!Array.isArray(d["entities"]))    errors.push("domainOutput.entities must be an array");
    if (!Array.isArray(d["usecases"]))    errors.push("domainOutput.usecases must be an array");
    if (!Array.isArray(d["interfaces"]))  errors.push("domainOutput.interfaces must be an array");
    if (!Array.isArray(d["violations"]))  errors.push("domainOutput.violations must be an array");
    if (!Array.isArray(d["features"]))    errors.push("domainOutput.features must be an array of feature name strings — required for perFeature step iteration");
    return errors;
  },
  stateOutput: (o) => {
    const errors: string[] = [];
    const s = o as Record<string, unknown>;
    if (!s["slice"])     errors.push("stateOutput.slice is required");
    if (!s["thunks"])    errors.push("stateOutput.thunks is required");
    if (!s["selectors"]) errors.push("stateOutput.selectors is required");
    return errors;
  },
  navigationOutput: (o) => {
    const errors: string[] = [];
    const n = o as Record<string, unknown>;
    if (!n["paramList"])       errors.push("navigationOutput.paramList is required");
    if (!n["convertedCalls"])  errors.push("navigationOutput.convertedCalls is required");
    return errors;
  },
  folderManifest: (o) => {
    const errors: string[] = [];
    const f = o as Record<string, unknown>;
    if (!Array.isArray(f["folders"]))    errors.push("folderManifest.folders must be an array");
    if (!Array.isArray(f["indexFiles"])) errors.push("folderManifest.indexFiles must be an array");
    return errors;
  },
  mockOutput: (o) => {
    const errors: string[] = [];
    if (typeof o !== "object" || o === null) { errors.push("mockOutput must be an object"); return errors; }
    const m = o as Record<string, unknown>;
    if (typeof m["status"] !== "string")         errors.push("mockOutput.status must be 'success' | 'failure'");
    if (typeof m["apiCount"] !== "number")        errors.push("mockOutput.apiCount must be a number");
    if (!Array.isArray(m["generatedFiles"]))      errors.push("mockOutput.generatedFiles must be an array");
    if (!Array.isArray(m["mockCatalog"]))         errors.push("mockOutput.mockCatalog must be an array — one entry per API");
    if (!Array.isArray(m["violations"]))          errors.push("mockOutput.violations must be an array");
    if (typeof m["globalMockEnabled"] === "undefined") errors.push("mockOutput.globalMockEnabled must be present (boolean or env-aware string)");
    // apiCount must equal the number of entries in mockCatalog
    const catalog = m["mockCatalog"] as unknown[];
    if (Array.isArray(catalog) && typeof m["apiCount"] === "number" && catalog.length !== m["apiCount"]) {
      errors.push(`mockOutput.apiCount (${m["apiCount"]}) does not match mockOutput.mockCatalog.length (${catalog.length}). Mock Data Generator produced an inconsistent result.`);
    }
    return errors;
  },
  apiOutput: (o) => {
    const errors: string[] = [];
    if (typeof o !== "object" || o === null) errors.push("apiOutput must be an object");
    const a = o as Record<string, unknown>;
    if (!Array.isArray(a["endpoints"]))          errors.push("apiOutput.endpoints must be an array");
    if (!Array.isArray(a["violations"]))         errors.push("apiOutput.violations must be an array");
    if (!Array.isArray(a["fidelityReport"]))     errors.push("apiOutput.fidelityReport must be an array — include [] when flutterApiCalls input was empty");
    if (!Array.isArray(a["discrepancyLog"]))     errors.push("apiOutput.discrepancyLog must be an array — include [] when no discrepancies found");
    if (typeof a["confirmedBaseUrl"] !== "string" || !(a["confirmedBaseUrl"] as string).length)
      errors.push("apiOutput.confirmedBaseUrl must be a non-empty string — set to effectiveBaseUrl resolved in Step 1. The orchestrator needs this to populate API_BASE_URL in .env.");
    return errors;
  },
  layoutOutput: (o) => {
    const errors: string[] = [];
    const l = o as Record<string, unknown>;
    if (!Array.isArray(l["convertedLayouts"])) errors.push("layoutOutput.convertedLayouts must be an array");
    if (!Array.isArray(l["violations"]))        errors.push("layoutOutput.violations must be an array");
    return errors;
  },
  dataLayerOutput: (o) => {
    const errors: string[] = [];
    const d = o as Record<string, unknown>;
    if (!Array.isArray(d["repositoryImpls"])) errors.push("dataLayerOutput.repositoryImpls must be an array");
    if (!Array.isArray(d["apiDataSources"]))  errors.push("dataLayerOutput.apiDataSources must be an array");
    if (!Array.isArray(d["mappers"]))         errors.push("dataLayerOutput.mappers must be an array");
    return errors;
  },
  diOutput: (o) => {
    const errors: string[] = [];
    const d = o as Record<string, unknown>;
    if (typeof d["diBootstrap"] !== "string")      errors.push("diOutput.diBootstrap must be a string");
    if (typeof d["createThunkExtra"] !== "string") errors.push("diOutput.createThunkExtra must be a string");
    if (!Array.isArray(d["violations"]))           errors.push("diOutput.violations must be an array");
    return errors;
  },
  testOutput: (o) => {
    const errors: string[] = [];
    const t = o as Record<string, unknown>;
    if (typeof t["valid"] !== "boolean")  errors.push("testOutput.valid must be a boolean");
    if (!Array.isArray(t["testFiles"]))   errors.push("testOutput.testFiles must be an array");
    if (!Array.isArray(t["mswHandlers"])) errors.push("testOutput.mswHandlers must be an array");
    if (!Array.isArray(t["violations"])) errors.push("testOutput.violations must be an array");
    return errors;
  },
  generatedComponents: (o) => {
    const errors: string[] = [];
    const g = o as Record<string, unknown>;
    if (!Array.isArray(g["violations"])) errors.push("generatedComponents.violations must be an array");
    return errors;
  },
  enforcedFiles: (o) => {
    const errors: string[] = [];
    const e = o as Record<string, unknown>;
    if (typeof e["valid"] !== "boolean")  errors.push("enforcedFiles.valid must be a boolean");
    if (!Array.isArray(e["files"]))       errors.push("enforcedFiles.files must be an array");
    if (!Array.isArray(e["issues"]))      errors.push("enforcedFiles.issues must be an array");
    return errors;
  },
  validationResult: (o) => {
    const errors: string[] = [];
    const v = o as Record<string, unknown>;
    if (typeof v["valid"] !== "boolean") errors.push("validationResult.valid must be a boolean");
    if (!Array.isArray(v["issues"]))     errors.push("validationResult.issues must be an array");
    return errors;
  },
  apiTraceOutput: (o) => {
    const errors: string[] = [];
    const a = o as Record<string, unknown>;
    if (typeof a["fileName"] !== "string")    errors.push("apiTraceOutput.fileName must be a string");
    if (typeof a["content"] !== "string")     errors.push("apiTraceOutput.content must be a string");
    if (!Array.isArray(a["apiList"]))          errors.push("apiTraceOutput.apiList must be an array");
    if (!Array.isArray(a["violations"]))       errors.push("apiTraceOutput.violations must be an array");
    if (typeof a["featureName"] !== "string") errors.push("apiTraceOutput.featureName must be a string");
    if (typeof a["totalApis"] !== "number")   errors.push("apiTraceOutput.totalApis must be a number");
    return errors;
  },
  envConfigOutput: (o) => {
    const errors: string[] = [];
    const e = o as Record<string, unknown>;
    if (typeof e["envFileContent"] !== "string")        errors.push("envConfigOutput.envFileContent must be a string");
    if (typeof e["envExampleContent"] !== "string")     errors.push("envConfigOutput.envExampleContent must be a string");
    if (!Array.isArray(e["requiredKeys"]))               errors.push("envConfigOutput.requiredKeys must be an array");
    if (!Array.isArray(e["violations"]))                 errors.push("envConfigOutput.violations must be an array");
    return errors;
  },
};

export function validateOutputSchema(step: PipelineStep, output: SkillResult): string[] {
  const errors: string[] = [];
  for (const key of step.produces) {
    const validator = OUTPUT_SCHEMAS[key];
    if (!validator) {
      errors.push(`No schema validator registered for artifact key '${key}'. Register one in OUTPUT_SCHEMAS.`);
      continue;
    }
    const value = (output as Record<string, unknown>)[key];
    if (value === undefined || value === null) {
      errors.push(`Step '${step.name}' did not produce required artifact '${key}'.`);
      continue;
    }
    errors.push(...validator(value));
  }
  return errors;
}
```

---

## Step 6 — Run Cross-Skill Consistency Checks

After all 16 steps complete, perform cross-artifact consistency validation before the pre-final validation phase. These checks verify that outputs from different skills align with each other.

```ts
// flutter-rn-orchestrator/crossSkillConsistency.ts

export interface ConsistencyIssue {
  severity: "CRITICAL" | "WARN";
  check: string;
  message: string;
  affectedArtifacts: string[];
}

export function runCrossSkillConsistencyChecks(artifacts: Map<string, unknown>): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  const parsed         = artifacts.get("parsedFlutter")       as ParsedFlutter | undefined;
  const classified     = artifacts.get("classifiedComponents") as ClassifiedComponents | undefined;
  const navigation     = artifacts.get("navigationOutput")    as NavigationOutput | undefined;
  const generated      = artifacts.get("generatedComponents") as GeneratedComponents | undefined;
  const state          = artifacts.get("stateOutput")         as StateOutput | undefined;
  const api            = artifacts.get("apiOutput")           as ApiOutput | undefined;

  // ── Check 1: Widget count alignment ─────────────────────────────────────────
  if (parsed && generated) {
    const parsedCount    = parsed.widgets.length;
    const generatedCount = (generated.files ?? []).filter((f: { path: string }) => f.path.endsWith(".tsx")).length;
    if (parsedCount > 0 && generatedCount === 0) {
      issues.push({
        severity: "CRITICAL",
        check: "widget-to-component-alignment",
        message: `Flutter parser found ${parsedCount} widget(s) but the component generator produced 0 TSX files. The generation step may have failed silently.`,
        affectedArtifacts: ["parsedFlutter", "generatedComponents"],
      });
    }
  }

  // ── Check 2: Navigation screens vs RootStackParamList ───────────────────────
  if (classified && navigation) {
    const screens = (classified.presentation?.screens ?? []) as Array<{ name: string }>;
    const paramList = (navigation.paramList ?? {}) as Record<string, unknown>;
    for (const screen of screens) {
      if (!Object.prototype.hasOwnProperty.call(paramList, screen.name)) {
        issues.push({
          severity: "CRITICAL",
          check: "navigation-vs-classifier",
          message: `Screen '${screen.name}' was identified by the Component Classifier but is absent from the Navigation Mapper's RootStackParamList. Every screen must have a declared route.`,
          affectedArtifacts: ["classifiedComponents", "navigationOutput"],
        });
      }
    }
  }

  // ── Check 3: API endpoints vs state thunks ───────────────────────────────────
  if (api && state) {
    const apiEndpoints = (api.endpoints ?? []) as Array<{ repositoryMethod: string }>;
    const thunks       = (state.thunks ?? []) as Array<{ name: string }>;
    const thunkNames   = new Set(thunks.map((t) => t.name.toLowerCase()));
    for (const endpoint of apiEndpoints) {
      const expected = `${endpoint.repositoryMethod}Thunk`.toLowerCase();
      if (!thunkNames.has(expected)) {
        issues.push({
          severity: "WARN",
          check: "api-vs-state-thunks",
          message: `API endpoint for '${endpoint.repositoryMethod}' has no corresponding thunk in the state layer. Either the State Generator did not cover this endpoint or the method names are misaligned.`,
          affectedArtifacts: ["apiOutput", "stateOutput"],
        });
      }
    }
  }

  // ── Check 4: Domain use cases vs state thunks ────────────────────────────────
  if (artifacts.has("domainOutput") && state) {
    const domain   = artifacts.get("domainOutput") as { usecases: Array<{ name: string }> };
    const thunks   = (state.thunks ?? []) as Array<{ name: string }>;
    const thunkMap = new Set(thunks.map((t) => t.name.replace("Thunk", "UseCase")));
    for (const uc of domain.usecases) {
      if (!thunkMap.has(uc.name)) {
        issues.push({
          severity: "WARN",
          check: "domain-vs-state-thunks",
          message: `Use case '${uc.name}' has no corresponding thunk in the state layer. Verify the Redux State Generator covered all domain use cases.`,
          affectedArtifacts: ["domainOutput", "stateOutput"],
        });
      }
    }
  }

  // ── Check 5: GSD concerns compliance across generated files ──────────────────
  if (artifacts.has("constitutionConfig") && generated) {
    const config = artifacts.get("constitutionConfig") as Record<string, unknown>;
    const concerns = (config["concerns"] ?? []) as Array<{ id: string; title: string; severity: string; affectedLayers: string[]; recommendation: string }>;
    const generatedFiles = (generated.files ?? []) as Array<{ path: string; content: string }>;

    for (const concern of concerns.filter((c) => c.severity === "CRITICAL" || c.severity === "HIGH")) {
      // Check if any generated file contains patterns matching the anti-pattern described in the concern
      const antiPatternKeywords = extractAntiPatternKeywords(concern);
      for (const file of generatedFiles) {
        for (const keyword of antiPatternKeywords) {
          if (file.content.toLowerCase().includes(keyword.toLowerCase())) {
            issues.push({
              severity: concern.severity === "CRITICAL" ? "CRITICAL" : "WARN",
              check: "gsd-concerns-compliance",
              message: `Generated file '${file.path}' may replicate GSD concern '${concern.title}' (${concern.id}). Anti-pattern keyword '${keyword}' found in output. Recommendation: ${concern.recommendation}`,
              affectedArtifacts: ["constitutionConfig", "generatedComponents"],
            });
          }
        }
      }
    }
  }

  // ── Check 6: Mock data coverage vs API endpoints ──────────────────────────────
  if (artifacts.has("mockOutput") && api) {
    const mockOut = artifacts.get("mockOutput") as { apiCount: number; mockCatalog: Array<{ id: string }> } | undefined;
    const apiEndpoints = (api.endpoints ?? []) as Array<{ repositoryMethod: string }>;
    if (mockOut && mockOut.apiCount !== apiEndpoints.length) {
      issues.push({
        severity: "WARN",
        check: "mock-vs-api-coverage",
        message: `Mock Data Generator produced ${mockOut.apiCount} mock entry(ies) but the API Integration skill registered ${apiEndpoints.length} endpoint(s). Re-run the Mock Data Generator with the current apiOutput to sync.`,
        affectedArtifacts: ["mockOutput", "apiOutput"],
      });
    }
    if (mockOut) {
      const mockIds = new Set(mockOut.mockCatalog.map((m) => m.id));
      for (const endpoint of apiEndpoints) {
        if (!mockIds.has(endpoint.repositoryMethod)) {
          issues.push({
            severity: "WARN",
            check: "mock-vs-api-coverage",
            message: `API endpoint '${endpoint.repositoryMethod}' has no corresponding mock entry in mockData.ts. Add it to the mock catalog or re-run Mock Data Generator.`,
            affectedArtifacts: ["mockOutput", "apiOutput"],
          });
        }
      }
    }
  }

  return issues;
}
```

**Quality check:** Any CRITICAL consistency issue sets `context.status = "failed"` before the pre-final validation phase runs. The pre-final phase is skipped if the context is already failed.

---

## Step 7 — Execute Pre-Final Validation Phase

Run the five mandatory pre-final checks in order. All five must pass before the pipeline is finalized.

```ts
// flutter-rn-orchestrator/preFinalValidation.ts

export interface PreFinalCheckResult {
  checkName: string;
  passed: boolean;
  issues: Array<{ severity: "CRITICAL" | "WARN"; message: string }>;
}

export async function runPreFinalValidation(
  artifacts: Map<string, unknown>,
  constitutionConfig: unknown
): Promise<PreFinalCheckResult[]> {
  const results: PreFinalCheckResult[] = [];

  // ── Check 1: Component contract validation ───────────────────────────────────
  results.push(await validateComponentContracts(artifacts));

  // ── Check 2: Navigation behavior validation ──────────────────────────────────
  results.push(await validateNavigationBehavior(artifacts));

  // ── Check 3: API contract readiness ──────────────────────────────────────────
  results.push(await validateApiContractReadiness(artifacts));

  // ── Check 4: Dependency validation ───────────────────────────────────────────
  results.push(await validateDependencyGraph(artifacts));

  // ── Check 5: TypeScript validation ───────────────────────────────────────────
  results.push(await validateTypeScriptIntegrity(artifacts));

  return results;
}

async function validateComponentContracts(artifacts: Map<string, unknown>): Promise<PreFinalCheckResult> {
  const issues: PreFinalCheckResult["issues"] = [];
  const generated = artifacts.get("generatedComponents") as GeneratedComponents | undefined;
  const state     = artifacts.get("stateOutput") as StateOutput | undefined;

  if (generated && state) {
    const componentFiles = (generated.files ?? []) as Array<{ path: string; content: string }>;
    const selectorNames  = extractSelectorNames(state);
    for (const file of componentFiles.filter((f) => f.path.endsWith(".tsx"))) {
      const usedSelectors = extractSelectorUsages(file.content);
      for (const used of usedSelectors) {
        if (!selectorNames.has(used)) {
          issues.push({ severity: "CRITICAL", message: `Component '${file.path}' uses selector '${used}' which was not generated by the State Generator.` });
        }
      }
    }
  }
  return { checkName: "component-contract-validation", passed: !issues.some((i) => i.severity === "CRITICAL"), issues };
}

async function validateNavigationBehavior(artifacts: Map<string, unknown>): Promise<PreFinalCheckResult> {
  const issues: PreFinalCheckResult["issues"] = [];
  const navigation = artifacts.get("navigationOutput") as NavigationOutput | undefined;
  const generated  = artifacts.get("generatedComponents") as GeneratedComponents | undefined;

  if (navigation && generated) {
    const paramList    = (navigation.paramList ?? {}) as Record<string, unknown>;
    const allFiles     = (generated.files ?? []) as Array<{ path: string; content: string }>;
    const containerFiles = allFiles.filter((f) => f.content.includes("NavigationContainer"));
    if (containerFiles.length > 1) {
      issues.push({ severity: "CRITICAL", message: `NavigationContainer appears in ${containerFiles.length} files. It must appear exactly once.` });
    }
    if (Object.keys(paramList).length === 0) {
      issues.push({ severity: "CRITICAL", message: "RootStackParamList is empty. At least one route must be declared." });
    }
  }
  return { checkName: "navigation-behavior-validation", passed: !issues.some((i) => i.severity === "CRITICAL"), issues };
}

async function validateApiContractReadiness(artifacts: Map<string, unknown>): Promise<PreFinalCheckResult> {
  const issues: PreFinalCheckResult["issues"] = [];
  const api      = artifacts.get("apiOutput") as ApiOutput | undefined;
  const domain   = artifacts.get("domainOutput") as { interfaces: Array<{ name: string }> } | undefined;

  if (api && domain) {
    const repoImpls      = extractRepositoryImplNames(api);
    const repoInterfaces = new Set(domain.interfaces.map((i: { name: string }) => i.name));
    for (const impl of repoImpls) {
      const expected = impl.replace("Impl", "");
      if (!repoInterfaces.has(expected)) {
        issues.push({ severity: "CRITICAL", message: `Repository implementation '${impl}' has no matching domain interface '${expected}'. The data layer cannot satisfy the domain contract.` });
      }
    }
  }
  return { checkName: "api-contract-readiness", passed: !issues.some((i) => i.severity === "CRITICAL"), issues };
}

async function validateDependencyGraph(artifacts: Map<string, unknown>): Promise<PreFinalCheckResult> {
  const issues: PreFinalCheckResult["issues"] = [];
  const enforcedFiles = artifacts.get("enforcedFiles") as { files: Array<{ path: string; content: string }> } | undefined;

  if (enforcedFiles) {
    const diFile = enforcedFiles.files.find((f) => f.path.endsWith("diBootstrap.ts"));
    if (!diFile) {
      issues.push({ severity: "CRITICAL", message: "diBootstrap.ts was not generated. The dependency injection composition root is required for the module to be wired." });
    } else {
      if (!diFile.content.includes("ApiDataSource") || !diFile.content.includes("RepositoryImpl") || !diFile.content.includes("UseCase")) {
        issues.push({ severity: "WARN", message: "diBootstrap.ts may be incomplete. Expected: ApiDataSource, RepositoryImpl, and UseCase instantiation sites." });
      }
    }
  }
  return { checkName: "dependency-validation", passed: !issues.some((i) => i.severity === "CRITICAL"), issues };
}

async function validateTypeScriptIntegrity(artifacts: Map<string, unknown>): Promise<PreFinalCheckResult> {
  const issues: PreFinalCheckResult["issues"] = [];
  const enforcedFiles = artifacts.get("enforcedFiles") as { valid: boolean; issues: Array<{ severity: string; message: string }> } | undefined;

  if (enforcedFiles) {
    if (!enforcedFiles.valid) {
      const fatals = enforcedFiles.issues.filter((i) => i.severity === "FATAL");
      for (const fatal of fatals) {
        issues.push({ severity: "CRITICAL", message: `TypeScript Enforcer reported unresolved FATAL: ${fatal.message}` });
      }
    }
  }
  return { checkName: "typescript-validation", passed: !issues.some((i) => i.severity === "CRITICAL"), issues };
}
```

**Decision point:**
- If any pre-final check returns `passed: false` → the pipeline does not proceed to finalization. `context.status` is set to `"failed"`.
- All five pre-final checks run to completion even if an earlier check fails — all issues are surfaced at once before the verdict is issued.

---

## Step 8 — Finalize and Assemble Output

Collect all generated artifacts into the React Native module output and assemble the conversion report.

```ts
// flutter-rn-orchestrator/finalizeOutput.ts

export interface ConversionReport {
  pipelineId: string;
  moduleName: string;
  startedAt: string;
  completedAt: string;
  status: "success" | "failed";
  stepsExecuted: Array<{
    stepNumber: number;
    stepName: string;
    status: StepStatus;
    durationMs: number;
  }>;
  errors: PipelineError[];
  warnings: PipelineWarning[];
  preFinalChecks: PreFinalCheckResult[];
  consistencyIssues: ConsistencyIssue[];
}

export interface OrchestratorOutput {
  reactNativeModule: {
    name: string;
    files: Array<{ path: string; content: string; layer: string }>;
  } | null;
  supportingFiles: {
    diBootstrap: string | null;
    jestConfig: string | null;
    mswHandlers: string | null;
    navigationTypes: string | null;
    envFile: string | null;           // .env with resolved values (never committed — add to .gitignore)
    envExampleFile: string | null;    // .env.example with placeholder values (committed as reference)
  };
  conversionReport: ConversionReport;
}

export function finalizeOutput(
  context: PipelineContext,
  preFinalResults: PreFinalCheckResult[],
  consistencyIssues: ConsistencyIssue[]
): OrchestratorOutput {
  const completedAt = new Date().toISOString();

  const enforcedFiles = context.artifacts.get("enforcedFiles") as { files: Array<{ path: string; content: string; layer: string }> } | undefined;
  const folderManifest = context.artifacts.get("folderManifest") as { folders: string[] } | undefined;

  const allCriticalErrors = [
    ...context.errors.filter((e) => e.errorClass === "CRITICAL"),
    ...consistencyIssues.filter((i) => i.severity === "CRITICAL"),
    ...preFinalResults.flatMap((r) => r.issues.filter((i) => i.severity === "CRITICAL")),
  ];

  const finalStatus: "success" | "failed" = allCriticalErrors.length === 0 && context.status !== "failed"
    ? "success"
    : "failed";

  return {
    reactNativeModule: finalStatus === "success" && enforcedFiles
      ? { name: context.moduleName, files: enforcedFiles.files }
      : null,
    supportingFiles: {
      diBootstrap:      extractSupportingFile(enforcedFiles, "diBootstrap.ts"),
      jestConfig:       extractSupportingFile(enforcedFiles, "jest.config."),
      mswHandlers:      extractSupportingFile(enforcedFiles, ".handlers.ts"),
      navigationTypes:  extractSupportingFile(enforcedFiles, "navigationTypes.ts"),
      envFile:          extractEnvFile(context.artifacts, ".env"),
      envExampleFile:   extractEnvFile(context.artifacts, ".env.example"),
    },
    conversionReport: {
      pipelineId: context.pipelineId,
      moduleName: context.moduleName,
      startedAt: context.startedAt,
      completedAt,
      status: finalStatus,
      stepsExecuted: context.steps.map((s) => ({
        stepNumber: s.stepNumber,
        stepName: s.stepName,
        status: s.status,
        durationMs: s.startedAt && s.completedAt
          ? new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()
          : 0,
      })),
      errors: context.errors,
      warnings: context.warnings,
      preFinalChecks: preFinalResults,
      consistencyIssues,
    },
  };
}

function extractSupportingFile(
  enforcedFiles: { files: Array<{ path: string; content: string }> } | undefined,
  pathSubstring: string
): string | null {
  if (!enforcedFiles) return null;
  return enforcedFiles.files.find((f) => f.path.includes(pathSubstring))?.content ?? null;
}

function extractEnvFile(
  artifacts: Map<string, unknown>,
  filename: ".env" | ".env.example"
): string | null {
  const envConfig = artifacts.get("envConfigOutput") as { envFileContent?: string; envExampleContent?: string } | undefined;
  if (!envConfig) return null;
  return filename === ".env" ? (envConfig.envFileContent ?? null) : (envConfig.envExampleContent ?? null);
}
```

**Rule:** `reactNativeModule` is `null` when `conversionReport.status === "failed"`. A consumer must not attempt to use a null module. The conversion report is always populated regardless of status — it is the audit record for failed pipelines.

---

## Step 9 — Error Classification and Handling Reference

All errors that enter the pipeline are classified at the point of capture. The classification governs whether the pipeline halts immediately or whether the error is logged and execution continues.

```ts
// flutter-rn-orchestrator/errorClassification.ts

export const CRITICAL_CONDITIONS = [
  "No Dart source files in module",
  "Required pipeline artifact missing",
  "Output schema validation failed",
  "Cross-skill consistency check CRITICAL",
  "Pre-final validation check failed",
  "TypeScript Enforcer returned valid: false with unresolved FATALs",
  "Final Validator returned valid: false",
  "Navigation: screen absent from RootStackParamList",
  "Repository implementation missing domain interface",
  "diBootstrap.ts not generated",
  "NavigationContainer appears more than once",
  "Test Generator returned valid: false with unresolved failures",
  "Data layer repository implementation missing for domain interface",
  "Dependency injector diBootstrap not generated",
  "API endpoint path mismatch between Flutter source and generated implementation",
  "API request method mismatch (Flutter uses POST, generated uses GET)",
  "Required API header missing in generated data source",
] as const;

export const NON_CRITICAL_CONDITIONS = [
  "Constitution config not provided",
  "Stale test file detected — regenerating",
  "API endpoint has no corresponding thunk (misaligned method names)",
  "Use case has no corresponding thunk",
  "diBootstrap.ts may be incomplete",
  "tokensOnly disabled — raw value check skipped",
  "Skipped category will not be validated",
  "Base URL could not be extracted — using TODO placeholder",
  ".env file not present — generated with placeholder values",
  "Existing component catalog not provided — all components generated fresh",
] as const;
```

**Decision point:**
- CRITICAL errors: pipeline execution stops at the current step (`stopOnCritical: true` is always enforced). No further skills are invoked. The conversion report is assembled immediately with `status: "failed"`.
- NON_CRITICAL errors: logged to `context.warnings`, the step's `StepRecord.status` is set to `"success"` with warnings, and execution continues to the next step.
- A step classified as `critical: true` in the registry always produces a CRITICAL error on failure — the step's own `critical` flag overrides the NON_CRITICAL classification.

---

## Step 9b — Flutter → React Native Dependency Mapping (Mandatory Pre-Validation)

Before emitting the final `OrchestratorOutput`, every Flutter package declared in the module's `pubspec.yaml` (or inferred from import statements in the Dart source) MUST be mapped to a React Native equivalent. This step is **non-optional** — shipping a conversion without a dependency map guarantees missing functionality.

**Selection criteria for every replacement package (all four must pass):**
1. Has an active GitHub repository with a commit in the last 6 months
2. Provides ≥70% functional parity with the Flutter package
3. Is production-ready and not deprecated
4. Is compatible with React Native's JS runtime (no Node.js built-ins, no browser-only APIs)

If no qualifying replacement exists → generate a custom native module stub and emit WARN: `"No production-ready RN equivalent found for Flutter package '{packageName}'. A native module stub has been scaffolded at 'native-modules/{packageName}/'. Implement the bridge before shipping."`

### Canonical Flutter → React Native Package Map

| Flutter Package | React Native Equivalent | Parity | Notes |
|---|---|---|---|
| `dio` / `http` | `axios` | 95% | Centralized via `apiClient.ts` only |
| `provider` | `zustand` or `redux` + `redux-thunk` | 85% | Use redux for large state, zustand for simple local state |
| `flutter_bloc` / `bloc` | `@reduxjs/toolkit` | 80% | BLoC events → RTK action creators |
| `go_router` / `auto_route` | `@react-navigation/native` + `@react-navigation/stack` | 85% | |
| `bottom_navigation` | `@react-navigation/bottom-tabs` | 90% | |
| `webview_flutter` / `flutter_inappwebview` | `react-native-webview` | 90% | Official, actively maintained |
| `shared_preferences` | `@react-native-async-storage/async-storage` | 95% | Production-ready |
| `flutter_secure_storage` | `react-native-keychain` | 90% | Native module — requires pod install / gradle sync |
| `image_picker` | `react-native-image-picker` | 90% | |
| `permission_handler` | `react-native-permissions` | 85% | |
| `cached_network_image` | `react-native-fast-image` | 90% | Preferred over RN `Image` for caching |
| `flutter_svg` | `react-native-svg` | 90% | |
| `intl` (date/number format) | `date-fns` + native `Intl` API | 85% | No native module needed |
| `connectivity_plus` | `@react-native-community/netinfo` | 95% | Official community package |
| `local_auth` (biometrics) | `react-native-biometrics` | 85% | Native module required |
| `firebase_core` + `firebase_*` | `@react-native-firebase/app` + `@react-native-firebase/*` | 90% | Matches Flutter Firebase API surface |
| `url_launcher` | `react-native-linking` (built-in `Linking` API) | 90% | Use `Linking.openURL()` from `react-native` |
| `path_provider` | `react-native-fs` | 80% | |
| `flutter_local_notifications` | `react-native-push-notification` | 80% | |
| `google_maps_flutter` | `react-native-maps` | 85% | |
| `fl_chart` / `charts_flutter` | `react-native-chart-kit` or `@shopify/react-native-skia` | 75% | Skia preferred for complex charts |
| `shimmer` | `react-native-shimmer-placeholder` | 90% | Requires LinearGradient peer dep |
| `lottie` | `lottie-react-native` | 95% | |
| `freezed` / `json_serializable` | TypeScript interfaces + `zod` for runtime validation | 85% | No code gen needed |
| `rxdart` | `rxjs` (web-compatible subset only) | 70% | Only use operators compatible with RN's JS engine |
| `hive` / `sqflite` | `react-native-mmkv` (key-value) or `react-native-sqlite-storage` (SQL) | 80% | |
| `crypto` (Dart) | `react-native-quick-crypto` | 85% | Node.js `crypto` module is NOT available in RN |
| `device_info_plus` | `react-native-device-info` | 90% | |
| `package_info_plus` | `react-native-device-info` | 85% | Same library covers both |
| `sensors_plus` | `react-native-sensors` | 80% | |
| `flutter_screenutil` | `react-native-responsive-screen` or `Dimensions` API | 75% | |
| `cupertino_icons` | `@expo/vector-icons` or `react-native-vector-icons` | 90% | |
| `font_awesome_flutter` | `react-native-vector-icons` (FontAwesome5) | 95% | |
| `get_it` (DI) | Constructor injection via custom `createThunkExtra` (generated by Dependency Injector skill) | 80% | No runtime DI container in RN |

**Enforcement rules:**
- Every Flutter import found in the parsed Dart source MUST appear in the mapping table above or be explicitly handled as a custom native module.
- Packages not in this table require manual research: check the package's GitHub for last commit date and README before adding it. If last commit > 6 months ago → flag as WARN and suggest an alternative.
- **Never use Node.js built-ins** (`fs`, `path`, `crypto`, `buffer`, `stream`) in React Native code — they are not available in the JS runtime. Use the RN-specific equivalents from the table.
- **Never use browser-only APIs** (`window`, `document`, `localStorage`, `sessionStorage`, `XMLHttpRequest`) — these do not exist in React Native's JS runtime.
- After mapping, emit a `dependencyMap` section in the `conversionReport` listing every Flutter → RN package pair for auditability.

**Unmapped package FATAL:** If a Flutter package is used in more than 3 Dart files AND has no mapping in the table AND no custom native module was scaffolded → **FATAL**: `"FATAL: Flutter package '{packageName}' is used in {count} files but has no React Native equivalent or native module stub. The conversion cannot ship without a replacement for this package."`

---

## Step 10 — Validate Final Output

Run a final completeness check on the assembled `OrchestratorOutput` before returning it to the caller.

Run through this checklist before returning:

- [ ] All 19 pipeline steps have a `StepRecord` with `status` set to `success`, `skipped`, or `failed` — no step has `status: "pending"` or `status: "running"`
- [ ] All artifacts declared as `produces` by steps with `status: "success"` are present in `context.artifacts`
- [ ] Cross-skill consistency checks completed — results included in `conversionReport.consistencyIssues`
- [ ] All five pre-final checks completed — results included in `conversionReport.preFinalChecks`
- [ ] `reactNativeModule` is non-null if and only if `conversionReport.status === "success"`
- [ ] `conversionReport.errors` contains every CRITICAL and NON_CRITICAL error from every step
- [ ] `conversionReport.warnings` contains every warning from every step and from the orchestrator itself
- [ ] `conversionReport.stepsExecuted` contains an entry for every step in `PIPELINE_STEPS` including skipped steps
- [ ] No artifact key in `context.artifacts` holds a value that failed its output schema validation
- [ ] `conversionReport.status === "failed"` if any CRITICAL error exists, regardless of how many steps succeeded
- [ ] `pipelineContext.resolvedBaseUrl` was updated from `apiOutput.confirmedBaseUrl` after Step 10 — verify the `.env` file contains `API_BASE_URL={confirmedBaseUrl}` and not a placeholder or empty value
- [ ] `mockOutput.apiCount` equals `apiOutput.endpoints.length` — mock catalog must cover every API endpoint
- [ ] **`conversion_validation.md` generated** — Final Validator (Step 12) has been invoked and `conversionReport.validationReport` is non-null
- [ ] **`conversionReport.validationStatus`** is set to `"passed"` | `"warnings"` | `"failed"` based on the Final Validator report
- [ ] **`<featureName>_extraction.md` generated** — Flutter Parser (Step 2) must have written the extraction report; verify `docs/<featureName>_extraction.md` exists in `context.artifacts`
- [ ] **`ThemeContext.tsx` generated** — Styling Converter (Step 5) must have produced `shared/theme/ThemeContext.tsx`, `shared/theme/tokens.light.ts`, and `shared/theme/tokens.dark.ts`; verify all three are present in `folderManifest`
- [ ] **`dependencyMap` populated** — Step 9b must have produced a non-empty `conversionReport.dependencyMap` array; a conversion with Flutter package imports but no dependency map is always a WARN
- [ ] **`mockConfig.ts` self-audit passed** — `globalMockEnabled` must not be the literal `true`; verify the generated mockConfig.ts uses the env-aware expression
- [ ] **All tab screen components wrapped in `React.memo`** — verify `generatedComponents` artifact; any tab body component without `React.memo` is a WARN in the final checklist

---

## Step 11 — Emit Post-Pipeline Integration Checklist

After `conversionReport.status === "success"`, emit a structured post-pipeline integration checklist as a final output section. This checklist covers the manual steps that must be completed before the feature can run. These steps are intentionally not automated because they modify shared app infrastructure.

The Dependency Injector's `storeWiring.snippet.ts` file provides the exact code for items 1–4. The checklist below is the orchestrator's authoritative enumeration of everything that must be done.

```
════════════════════════════════════════════════════════════════════════════════
POST-PIPELINE INTEGRATION CHECKLIST — {MODULE_NAME}
Generated by: flutter-rn-orchestrator
Pipeline ID:  {PIPELINE_ID}
════════════════════════════════════════════════════════════════════════════════

REQUIRED BEFORE RUNNING THE APP (all items are BLOCKING):

[ ] 0. ENVIRONMENT — .env
        • Open the generated .env file and confirm: API_BASE_URL={confirmedBaseUrl}
        • The value was set from your answer to the Base URL prompt during pipeline Step 10.
        • If the value reads 'TODO' or is empty, the app will fail all API calls at runtime.
        • Never commit .env to source control — it is listed in .gitignore by the pipeline.
        • Commit .env.example (placeholder values only) so teammates can configure their own .env.

[ ] 1. STORE WIRING — src/app/state/store.ts
        • Import: create{Feature}ThunkExtra from features/{feature}/diBootstrap
        • Import: {feature}Slice reducer from features/{feature}/state/store/{feature}Slice
        • Add reducer to combineReducers: { {feature}: {feature}Slice, ... }
        • Add ThunkExtra factory to configureStore middleware extraArgument
        • See: features/{feature}/storeWiring.snippet.ts → Section 1

[ ] 2. ROOT NAVIGATOR — src/app/routing/RootNavigator.tsx
        • Import each screen component from features/{feature}/presentation/screens/
        • Add <Stack.Screen> entries for each screen
        • Ensure route names match RootStackParamList declarations in navigationTypes.ts
        • See: features/{feature}/storeWiring.snippet.ts → Section 2

[ ] 3. TABS NAVIGATOR — src/app/routing/TabsNavigator.tsx
        • If this feature is a root tab: add a <Tab.Screen> entry
        • Set tabBarIcon, title, and accessibility label
        • See: features/{feature}/storeWiring.snippet.ts → Section 3

[ ] 4. DI CONTAINER — src/app/di/container.ts
        • Register the create{Feature}ThunkExtra factory if the project uses a top-level DI container
        • See: features/{feature}/storeWiring.snippet.ts → Section 4

[ ] 5. METRO BUNDLER — metro.config.js  (⚠️ required if feature uses local symlinked packages)
        • If any local package is referenced (e.g. file:../watchlist-framework), Metro must
          resolve symlinks correctly or it will crash with: "TreeFS: Could not add directory,
          already exists as a file."
        • Verify metro.config.js uses fs.realpathSync() for projectRoot resolution:
            const projectRoot = fs.realpathSync(__dirname);
        • Add the linked package's real path to watchFolders (not just the symlink path):
            watchFolders: [fs.realpathSync(path.resolve(__dirname, '../linked-package'))],
        • Remove duplicate watch folder entries
        • After changing metro.config.js, run cache-busting commands:
            npx react-native start --reset-cache
            (or: npm run reset:metro if the project has this script)
        • See: docs/postInstall.md for full cache-busting procedure

[ ] 6. LOCAL PACKAGE INTEGRATION (if feature depends on a file: package)
        • Run: npm install file:../your-local-package
        • In the integration service file, replace MockController with the real controller:
            import { RealController } from 'your-local-package';
            // Remove the Mock class
            // Change: new MockController(dataSource) → new RealController(dataSource)
        • Verify app console shows: ✅ {Feature} framework initialized successfully

ADVISORY (NON-BLOCKING — address before next release):

[ ] 7. TESTS — Screen/component integration tests
        • Domain + state layer tests: generated by Test Generator skill ✅
        • Screen-level integration tests: check test-generator output for *.screen.test.tsx files
        • If screen tests are absent, write them manually using @testing-library/react-native

[ ] 8. iOS — Xcode post-install steps (see docs/postInstall.md)
        • Run: pod install --repo-update
        • Set Base Configuration in xcconfig
        • Add Run Script build phase for strip-symbols.sh

[ ] 9. ANDROID — post-install steps (see docs/postInstall.md)
        • Verify AndroidManifest.xml permissions for Android 13+
        • Run: npx react-native-asset (if new fonts/assets added)

[ ] 10. CLEANUP
         • Delete: features/{feature}/storeWiring.snippet.ts (after merging into store/navigators)
         • Confirm: 0 TypeScript errors in the workspace after wiring
         • Run full test suite to confirm no regressions

[ ] 11. ENVIRONMENT CONFIGURATION
         • Locate: .env and .env.example in the project root (generated by this pipeline if absent)
         • Set API_BASE_URL to your environment-specific URL (dev/staging/production)
         • Set all other API_* variables declared in .env.example
         • Add .env to .gitignore — NEVER commit .env to source control
         • Share .env.example with the team so members can create their own .env
         • If using react-native-config: run npx react-native-asset to sync env variables

[ ] 12. API INTEGRATION VERIFICATION
         • Run the app and navigate to each converted screen that makes API calls
         • For each endpoint: verify response matches expected Flutter app behavior
         • Check console for HTTP 4xx/5xx errors — resolve any mismatch with apiTraceOutput
         • Verify auth token is injected correctly (check Authorization header in network tab)
         • Verify token refresh works: manually expire your token and confirm auto-refresh
         • Compare API response data shapes against domain entity definitions

════════════════════════════════════════════════════════════════════════════════
```

**Rule:** This checklist is emitted as a `conversionReport.postPipelineChecklist` string field on every successful pipeline run. It is always populated — never omitted even when no local packages are involved (items that don't apply are pre-checked in the output with a note: `[N/A — not applicable for this feature]`).

**Rule — Metro symlink safety:** Whenever the pipeline detects a `file:../` dependency in the module's `package.json` or dependency list, the Metro item (item 5) in the checklist is upgraded from advisory to **BLOCKING** and a WARN is emitted: `"WARN: Feature '{featureName}' references a local symlinked package. Metro bundler symlink handling must be verified before starting the app. See item 5 in the integration checklist."`

---

## Step 12 — Invoke Final Validator and Generate `conversion_validation.md`

After Step 11's integration checklist is emitted, **always** invoke the `final-validator` skill as the absolute last action of the orchestrator pipeline — regardless of whether `conversionReport.status` is `"success"` or `"failed"`. The Final Validator must run even on a failed pipeline so that all gaps are surfaced in the validation report.

**Trigger condition:** Run this step unconditionally after Step 11. It is never skipped.

**Input to the Final Validator:**

Pass the following from the current pipeline context:

```ts
finalValidatorInput = {
  flutterModule: {
    name:    pipelineContext.module.name,
    sourcePath: pipelineContext.module.sourcePath,
    files:   pipelineContext.module.files,           // all original .dart + README.md files
    readme:  pipelineContext.module.files.find(f => f.path.endsWith("README.md"))?.content ?? null,
  },
  reactNativeModule: {
    files: pipelineContext.artifacts["reactNativeModule"]?.files ?? [],  // all generated RN files
  },
  apiInfoMd: pipelineContext.artifacts["apiInfoMd"] ?? null,            // from API Execution Trace
  skillLogs: pipelineContext.stepRecords,                                // StepRecord[] for all 19 steps
  conversionReport: pipelineContext.conversionReport,
}
```

**Execution:**

```
1. Invoke the final-validator skill with finalValidatorInput.
2. The skill generates conversion_validation.md covering all six required sections:
     § Module Structure Comparison   (Flutter tree vs RN tree)
     § Component & Screen Coverage   (counts + missing items)
     § API Coverage                  (endpoint-by-endpoint match)
     § Skill Execution Checklist     (all 19 skills, task-level status)
     § Critical Issues               (aggregated ❌ findings)
     § Final Summary                 (category table + Overall Status)
3. Write conversion_validation.md to the React Native module root.
4. Attach conversion_validation.md content to conversionReport.validationReport.
```

**Decision point:**
- If `finalValidatorInput.flutterModule.files` is empty → emit WARN: `"WARN: Flutter source files missing from pipeline context. conversion_validation.md will have incomplete Module Structure and API Coverage sections."` Proceed — do not halt.
- If `finalValidatorInput.reactNativeModule.files` is empty → emit WARN: `"WARN: React Native output files missing from pipeline context. conversion_validation.md will reflect a fully failing conversion."` Proceed.
- If `skillLogs` has fewer than 19 entries → mark missing skill rows as `❓ Unknown — log not available` in the checklist. Do not fail.
- If the Final Validator itself throws → catch the error, emit CRITICAL: `"CRITICAL: Final Validator failed to execute: {error.message}. conversion_validation.md was not generated."` Set `conversionReport.validationReport = null`.

**Output:**
- `conversion_validation.md` written to the RN module root
- `conversionReport.validationReport` set to the file content string
- `conversionReport.validationStatus` set to `"passed"` | `"warnings"` | `"failed"` based on the Overall Status in the report

**Rule:** The pipeline is not complete until `conversion_validation.md` exists with all six sections populated. A `conversionReport.status === "success"` with `conversionReport.validationReport === null` is a pipeline bug — it must never occur.

---

## File Layout Reference

```
flutter-rn-orchestrator/
├── index.ts                         <- Entry point: accepts PipelineInput, returns OrchestratorOutput
├── initPipelineState.ts             <- Step 2: constructs PipelineContext
├── pipelineRegistry.ts              <- Step 3: PIPELINE_STEPS frozen registry
├── executePipeline.ts               <- Step 4: sequential skill invocation loop
├── validateOutputSchema.ts          <- Step 5: per-boundary artifact schema validators
├── crossSkillConsistency.ts         <- Step 6: cross-artifact alignment checks
├── preFinalValidation.ts            <- Step 7: five pre-final checks
├── finalizeOutput.ts                <- Step 8: module assembly + conversion report
├── errorClassification.ts           <- Step 9: CRITICAL / NON_CRITICAL condition registry
├── invokeSkill.ts                   <- Skill dispatch: maps skillName to skill invocation
├── buildSkillInput.ts               <- Artifact projection: builds per-skill input from context; accepts optional featureName for perFeature steps; always injects readmeContext from pipelineContext; injects globalMockDefault into Step 11 (Mock Data Generator) input from pipelineContext.globalMockDefault — never from perApiOverrides
├── mergePerFeatureResults.ts        <- Merges per-feature SkillResult[] into a single combined artifact for steps with perFeature:true
├── types.ts                         <- PipelineContext, StepRecord, OrchestratorOutput, etc.
└── __tests__/
    ├── initPipelineState.test.ts
    ├── executePipeline.test.ts
    ├── validateOutputSchema.test.ts
    ├── crossSkillConsistency.test.ts
    ├── preFinalValidation.test.ts
    └── finalizeOutput.test.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Single entry point | No conversion skill is ever invoked directly. All pipeline execution is routed through the orchestrator |
| Sequential execution | Steps execute in strict registry order. No step may be reordered, inserted, or removed at runtime |
| Dependency resolution before invocation | A step is never invoked if its required artifact keys are absent from the pipeline context |
| Schema validation at every boundary | Artifact output is validated against a registered schema before it is written to the pipeline context. Invalid artifacts are never passed to downstream steps |
| Immutable artifact handoff | Skills receive a projected copy of their required inputs. They do not receive or mutate the full pipeline context |
| CRITICAL errors halt immediately | Any CRITICAL error stops sequential execution at the current step. Pre-final checks and finalization are bypassed |
| Full scan before verdict | Cross-skill consistency checks and pre-final validation run all sub-checks to completion before issuing a status verdict |
| Conversion report is always produced | The `conversionReport` is populated regardless of pipeline outcome. A failed pipeline produces a complete audit record |
| Determinism | The same input module and the same constitution config always produce the same pipeline execution path and the same output structure |
| Traceability | Every error, warning, step status, artifact key, and duration is recorded in the conversion report for post-conversion audit |
| New project support | When `targetProject.type` is `"boilerplate"` or `"new"`, all skills scaffold from scratch; no skill assumes prior structure exists |
| Environment config always generated | `.env` and `.env.example` are always produced by Step 18 regardless of whether the project already has them. Existing `.env` values are preserved; new keys are appended with placeholder values |
| Base URL always resolved | `resolvedBaseUrl` is always set before the API Integration step runs — either from user input, auto-extraction from Flutter source, or a documented TODO placeholder. The pipeline never generates an Axios instance with an empty base URL without a TODO marker |
| Global mock flag takes absolute priority | `pipelineContext.globalMockDefault` is the sole source for `globalMockEnabled` in the Mock Data Generator. When `globalMockDefault` is `true`, ALL APIs return mock data regardless of any per-API override. `perApiOverrides` in `mockConfig` affects ONLY per-API `mockEnabled` flags — it can NEVER influence `globalMockDefault`. The orchestrator must verify this in the `buildSkillInput` for Step 11. |
| README parsed before codebase (two-phase) | The Constitution Reader (Step 1) must process the README in Phase 1 to build the `readmeModel` before loading GSD artifacts. Phase 2 then validates all README claims against GSD artifacts and Flutter source, with the codebase as truth. This two-phase process ensures README intent is understood AND cross-validated against actual implementation. |
| Multi-level features fully wired | The Data Layer Builder must detect parent-child API call dependencies and generate child data source methods that accept parent-supplied identifiers as parameters. Session-bound fields (clientCode, tradingAccountNo, etc.) must be wired from the auth context, not left as empty defaults. |
| Endpoint path never duplicated with base URL | Endpoint paths in all generated data source methods are ALWAYS relative paths (starting with '/'). The base URL is ALWAYS provided by `apiClient.baseURL`. The orchestrator validates there is no path segment duplication between base URL and endpoint paths in the `apiOutput.endpoints[]` before Step 11 runs. |
| Component reuse before creation | When `existingComponentCatalog` is non-empty, the Widget-to-JSX Converter must check it before generating new components. A new component is only generated when no suitable existing component can fulfill the requirement |
| API fidelity is mandatory | Every generated API call must exactly match the Flutter source in: HTTP method, endpoint path, request headers, request body shape, and query parameters. Any mismatch is a CRITICAL error |
| Final Validator is always the last step | The `final-validator` skill is invoked unconditionally as Step 12 — after Step 11 and regardless of pipeline status. `conversion_validation.md` must be produced on every run, success or failure |
| validationReport is never null on success | A `conversionReport.status === "success"` with `conversionReport.validationReport === null` is a pipeline bug. The orchestrator must surface this as a CRITICAL error |
