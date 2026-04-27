---
name: readme-constitution-reader
description: "MUST be used whenever the React Native Spec-Kit Constitution (or any project-level architecture README) needs to be parsed, validated, or converted into a structured config that governs downstream skills. Use when: reading or re-reading the constitution file before generating any feature code; extracting architecture rules, layer definitions, or dependency constraints; normalizing folder-structure conventions into machine-readable JSON; detecting missing, conflicting, or ambiguous sections in the constitution; supplying base config to all other Spec-Kit skills. Keywords: constitution, readme, architecture rules, feature-first, clean architecture, layer definitions, dependency rules, react native spec-kit, config extraction."
priority: HIGH
auto-trigger: true
---

# README / Constitution Reader

> Trigger this skill **before** any other Spec-Kit skill runs. All downstream skills depend on the structured config this skill produces. Never generate feature code, layer scaffolding, or design-system tokens until this skill has returned a valid, violation-free config.

## Step 1 — Locate and Load the Constitution File

This skill loads **two separate markdown files** and merges them. Each file owns a distinct set of data:

| Data | Source |
|---|---|
| Architecture pattern, layers, dependency rules, tech stack, folder structure | Project-level constitution file (repo root / `docs/`) |
| **API Endpoints** | **Flutter module README** (takes priority) → falls back to constitution file |

**Step 1a — Load the Flutter module README (primary source for API Endpoints):**

- If the pipeline input includes `module.readmePath` (an explicit path to a feature README) → load that file as `moduleReadme`. This is the preferred method.
- Otherwise, scan the `module.sourcePath` directory and its immediate subdirectories for any `.md` file. Load the first `.md` file found as `moduleReadme`.
- Parse `moduleReadme` using the same markdown parser as the constitution (Step 2). Extract its sections into `moduleReadmeSections[]`.
- If a `moduleReadme` is found → emit: `"INFO: Flutter module README loaded from '{path}'. This file is the authoritative source for API Endpoints."`
- If no `.md` file is found in `module.sourcePath` → set `moduleReadme = null` and emit WARN: `"No README found in Flutter module folder '{sourcePath}'. API endpoints will fall back to the project constitution file."`

**Step 1b — Load the project-level constitution file:**

- Search the repo root and `docs/` for files named `CONSTITUTION.md`, `README.md`, `SPEC.md`, or `ARCHITECTURE.md`
- If multiple candidates exist, prefer the one containing the heading `# React Native Spec-Kit Constitution` (or the nearest equivalent)
- Load the raw markdown string into memory as `constitutionFile`

**Decision point:**
- If no constitution file is found → **FAIL** immediately with `{ "violations": [{ "severity": "FATAL", "message": "Constitution file not found. Cannot proceed." }] }`. Do not attempt to infer rules.
- If the file is found but is empty or under 200 characters → **FAIL** with `{ "violations": [{ "severity": "FATAL", "message": "Constitution file is too short to be valid." }] }`
- If multiple equally-named files exist → surface a conflict violation and ask the user to designate the canonical file before continuing

**Priority rule for Step 6b (API Endpoints extraction):**
- If `moduleReadme` is non-null → run Step 6b against `moduleReadmeSections[]` exclusively. The project constitution is NOT searched for API endpoints.
- If `moduleReadme` is null → run Step 6b against the project constitution sections as the fallback.
- This priority is absolute — never merge endpoints from both files. The module README always wins.

**Rule:** Never fabricate, assume, or default-fill any rule that is not explicitly present in the loaded document.

---

## Step 2 — Parse Markdown Structure

Walk the document heading tree to build a section map. Every H1/H2/H3 becomes a named node.

```ts
// constitution-reader/parseHeings.ts
import { unified } from "unified";
import remarkParse from "remark-parse";
import { visit } from "unist-util-visit";

interface SectionNode {
  depth: number;       // 1 = H1, 2 = H2, 3 = H3
  title: string;       // normalized, trimmed, lowercase
  rawTitle: string;    // original casing, used for display
  bodyLines: string[]; // all non-heading lines until the next heading
}

export function parseConstitution(markdown: string): SectionNode[] {
  const tree = unified().use(remarkParse).parse(markdown);
  const sections: SectionNode[] = [];
  let current: SectionNode | null = null;

  visit(tree, (node) => {
    if (node.type === "heading") {
      if (current) sections.push(current);
      const rawTitle = node.children
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.value)
        .join("");
      current = {
        depth: node.depth,
        rawTitle,
        title: rawTitle.toLowerCase().trim(),
        bodyLines: [],
      };
    } else if (current && node.type === "paragraph") {
      const text = node.children
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.value)
        .join("");
      current.bodyLines.push(text);
    }
  });

  if (current) sections.push(current);
  return sections;
}
```

**Quality check:** The section map must be built purely from the document structure. Do not apply keyword heuristics that could fabricate a section that is absent from the source.

---

## Step 3 — Identify and Validate Required Sections

Map parsed sections to the six required constitution domains. A section is matched by title substring — no fuzzy matching beyond simple `includes()`.

```ts
// constitution-reader/sectionMatcher.ts

const REQUIRED_SECTIONS = [
  "guiding principles",
  "folder structure",
  "layer definitions",
  "dependency rules",
  "tech stack",
  "design system",
] as const;

type RequiredSection = (typeof REQUIRED_SECTIONS)[number];

export function matchRequiredSections(
  sections: SectionNode[]
): Record<RequiredSection, SectionNode | null> {
  const result = {} as Record<RequiredSection, SectionNode | null>;

  for (const required of REQUIRED_SECTIONS) {
    result[required] =
      sections.find((s) => s.title.includes(required)) ?? null;
  }

  return result;
}
```

**Decision point:**
- If `architecture` (guiding principles) section is `null` → **FAIL**: `"FATAL: 'Guiding Principles' section missing. Architecture pattern cannot be determined."`
- If `layer definitions` section is `null` → **FAIL**: `"FATAL: 'Layer Definitions' section missing. Layer boundaries cannot be enforced."`
- If `dependency rules` section is `null` → **FAIL**: `"FATAL: 'Dependency Rules' section missing. Cross-layer constraints cannot be applied."`
- If `folder structure`, `tech stack`, or `design system` sections are `null` → add a **WARN** violation but continue processing

**Rule:** FAIL violations must halt the skill and return the violations array to the caller. WARN violations are appended to `violations[]` in the output config but do not stop execution.

---

## Step 4 — Extract Architecture Pattern and Layers

Parse the guiding-principles and layer-definitions sections to populate `architecture` and `layers` in the output config.

```ts
// constitution-reader/extractArchitecture.ts

export interface LayerDefinition {
  name: string;            // e.g. "presentation", "domain", "data", "state"
  responsibilities: string[];
  allowedDependencies: string[]; // layers this layer MAY import from
}

export interface ArchitectureConfig {
  pattern: string;         // e.g. "feature-first"
  layers: LayerDefinition[];
}

const KNOWN_PATTERNS = ["feature-first", "modular", "monolithic"] as const;

export function extractArchitecture(
  principlesSection: SectionNode,
  layersSection: SectionNode
): ArchitectureConfig {
  // 1. Detect architecture pattern from principles body
  const patternLine = principlesSection.bodyLines.find((l) =>
    KNOWN_PATTERNS.some((p) => l.toLowerCase().includes(p))
  );
  const pattern = KNOWN_PATTERNS.find((p) =>
    patternLine?.toLowerCase().includes(p)
  ) ?? "unknown";

  // 2. Parse layer names from layers section (expect H3 sub-headings or bullet lists)
  const layers = parseLayerBlocks(layersSection);

  return { pattern, layers };
}
```

**Quality checks:**
- If `pattern` resolves to `"unknown"` → add a WARN violation: `"Architecture pattern not explicitly stated. Defaulting is not permitted; please name the pattern in the constitution."`
- Layer `allowedDependencies` must only reference other layer names found in the same section — never invent dependency rules

---

## Step 5 — Extract Dependency and Cross-Feature Rules

Parse the dependency-rules section into a normalized `rules[]` array. Each rule carries a severity, a short machine-readable key, and human-readable description.

```ts
// constitution-reader/extractRules.ts

export type RuleSeverity = "MUST" | "MUST_NOT" | "SHOULD" | "SHOULD_NOT";

export interface ArchitectureRule {
  id: string;            // e.g. "no-cross-feature-import"
  severity: RuleSeverity;
  description: string;   // exact text from constitution, trimmed
  section: string;       // source section title
}

const SEVERITY_KEYWORDS: Record<RuleSeverity, string[]> = {
  MUST: ["must", "required", "always"],
  MUST_NOT: ["must not", "never", "forbidden", "not allowed"],
  SHOULD: ["should", "recommended"],
  SHOULD_NOT: ["should not", "avoid", "discouraged"],
};

export function extractRules(
  dependencySection: SectionNode,
  allSections: SectionNode[]
): ArchitectureRule[] {
  const rules: ArchitectureRule[] = [];

  for (const section of [dependencySection, ...allSections]) {
    for (const line of section.bodyLines) {
      const lower = line.toLowerCase();
      for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          rules.push({
            id: slugify(line),
            severity: severity as RuleSeverity,
            description: line.trim(),
            section: section.rawTitle,
          });
          break;
        }
      }
    }
  }

  return deduplicateRules(rules);
}

function deduplicateRules(rules: ArchitectureRule[]): ArchitectureRule[] {
  const seen = new Set<string>();
  return rules.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}
```

**Quality checks:**
- Every rule description must be verbatim from the document — no paraphrasing
- Duplicate rules (same description, different sections) are collapsed; the first occurrence wins
- If zero `MUST_NOT` rules are extracted → add a WARN: `"No hard prohibitions found. Cross-feature import restrictions may be missing."`

---

## Step 6 — Extract Tech Stack and Design System Config

```ts
// constitution-reader/extractTechStack.ts

export interface TechStackConfig {
  stateManagement: string | null;   // e.g. "zustand", "redux-toolkit"
  navigation: string | null;        // e.g. "react-navigation"
  networking: string | null;        // e.g. "axios", "react-query"
  testing: string[];                // e.g. ["jest", "testing-library"]
  designSystem: {
    tokensOnly: boolean;            // true if constitution forbids raw values
    tokenSource: string | null;     // e.g. "design-tokens.ts"
  };
}

const KNOWN_LIBS: Record<keyof Omit<TechStackConfig, "designSystem">, string[]> = {
  stateManagement: ["zustand", "redux", "jotai", "mobx", "context"],
  navigation: ["react-navigation", "expo-router"],
  networking: ["axios", "react-query", "tanstack", "fetch"],
  testing: ["jest", "testing-library", "detox", "maestro"],
};
```

**Decision point:**
- If `tokensOnly` cannot be determined (section absent or ambiguous) → set to `false` and add a WARN violation: `"Design system token enforcement not declared. Raw style values may proliferate."`
- If `stateManagement`, `navigation`, or `networking` cannot be matched → set to `null`; never guess

---

## Step 6b — Extract Declared API Endpoints

Scan the section list for a section whose title contains `"api endpoint"`, `"endpoints"`, `"api routes"`, or `"api urls"` (case-insensitive substring match).

```ts
// constitution-reader/extractApiEndpoints.ts

export interface DeclaredApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "UNKNOWN";
  path: string;           // verbatim path copied from the README line — never constructed or modified
  description: string | null;
}

export function extractApiEndpoints(sections: SectionNode[]): DeclaredApiEndpoint[] {
  const API_SECTION_KEYWORDS = ["api endpoint", "endpoints", "api routes", "api urls"];
  const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

  // Find the top-level API Endpoints section by title match
  const apiSectionIndex = sections.findIndex((s) =>
    API_SECTION_KEYWORDS.some((kw) => s.title.includes(kw))
  );
  if (apiSectionIndex === -1) return [];

  const apiSection = sections[apiSectionIndex];

  // Collect ALL descendant sub-sections (H3/H4/H5 nested under the API Endpoints heading).
  // READMEs commonly store endpoints inside sub-headings (e.g. "### Core Data APIs" →
  // "#### Company Quote"), so limiting extraction to apiSection.bodyLines alone misses them.
  const descendantSections = sections
    .slice(apiSectionIndex + 1)
    .filter((s) => s.depth > apiSection.depth);

  const allLines = [
    ...apiSection.bodyLines,
    ...descendantSections.flatMap((s) => s.bodyLines),
  ];

  return allLines
    .map((line) => {
      // Priority 1: backtick-quoted path — handles paths with NO leading slash (e.g. `bulkBlockDeal/companyCode/...`)
      // AND paths with a leading slash (e.g. `/api/v1/users`). Captures the full verbatim string between backticks.
      const backtickMatch = line.match(/`([a-zA-Z0-9][a-zA-Z0-9/_{}?=&%.:!\-]*)`/);
      // Priority 2: bare path starting with / — handles format: GET /api/v1/path (no backticks)
      const slashMatch = line.match(/(?<![`\w])(\/[a-zA-Z0-9/_{}?=&%.-]+)/);
      const rawPath = backtickMatch?.[1] ?? slashMatch?.[1] ?? null;
      if (!rawPath) return null;
      const method = HTTP_METHODS.find((m) => line.toUpperCase().includes(m)) ?? "UNKNOWN";
      const description =
        line.replace(method, "").replace(rawPath, "").replace(/`/g, "").replace(/^[^a-zA-Z]*/, "").trim() || null;
      return { method, path: rawPath, description } as DeclaredApiEndpoint;
    })
    .filter((e): e is DeclaredApiEndpoint => e !== null);
}
```

**Decision point:**
- If the section is found and yields endpoints → set `constitutionConfig.apiEndpoints[]` and emit: `"INFO: {count} API endpoints read from README. The API Integration skill will use these as the authoritative endpoint source."`
- If the section is found but no parseable lines → WARN: `"API Endpoints section found but no endpoints could be parsed. Expected format: 'GET /api/v1/path — description'"`
- If no section found → set `apiEndpoints: []` and WARN: `"No API Endpoints section found in README. The API Integration skill will have no authoritative source and must rely on Flutter source extraction only. Add an 'API Endpoints' section to the README."`

**Rule:** Every `path` is copied verbatim from the README line. Never construct, infer, or modify a path.

---

## Step 7 — Normalize Folder Structure

Convert the folder-structure section into a nested JSON object that downstream scaffolding skills can traverse.

```ts
// constitution-reader/extractFolderStructure.ts

export type FolderNode = {
  [key: string]: FolderNode | string; // string = file leaf annotation
};

export function extractFolderStructure(section: SectionNode): FolderNode {
  // Constitution is expected to contain a fenced code block
  // with a tree-style directory listing (indented with ├── └── │)
  const treeLines = extractCodeBlock(section.bodyLines);
  if (!treeLines.length) {
    return {}; // caller adds WARN violation
  }
  return parseTreeLines(treeLines);
}
```

**Quality check:** If the section contains no fenced code block → add a WARN: `"Folder structure section found but contains no directory tree. Scaffolding skills will lack layout guidance."`

**Folder naming convention extraction:** After parsing the directory tree, scan the tree lines for the canonical casing of the `usecases` subfolder under `domain/`:
- If any tree line contains `domain/useCases` (camelCase C) → set `folderConventions.usecasesFolderName: "useCases"`
- If any tree line contains `domain/usecases` (all lowercase) → set `folderConventions.usecasesFolderName: "usecases"`
- If neither is found → set `folderConventions.usecasesFolderName: null` and add a WARN: `"Constitution folder tree does not declare a 'domain/usecases' or 'domain/useCases' path. The Final Validator will not enforce casing for the use-cases folder."`
- If both `domain/useCases` and `domain/usecases` appear in the same tree → **FAIL**: `"FATAL: Constitution folder tree contains both 'domain/usecases' and 'domain/useCases'. Choose one canonical casing and update the constitution before proceeding."`

**Rule:** `folderConventions.usecasesFolderName` is read verbatim from the constitution's folder tree. The Final Validator MUST NOT hardcode either casing — it must consume this value from the config. If `usecasesFolderName` is `null`, the Final Validator skips the casing enforcement check entirely and emits a WARN instead of a FATAL.

---

## Step 8 — Assemble and Return the Config

Combine all extracted artefacts into the canonical output shape. Run completeness validation before returning.

```ts
// constitution-reader/assembleConfig.ts

export interface FolderConventions {
  usecasesFolderName: "useCases" | "usecases" | null;  // Extracted from folder tree in Step 7
}

export interface ConstitutionConfig {
  architecture: ArchitectureConfig;
  layers: LayerDefinition[];
  rules: ArchitectureRule[];
  techStack: TechStackConfig;
  folderStructure: FolderNode;
  folderConventions: FolderConventions;   // Naming conventions read verbatim from the folder tree
  apiEndpoints: DeclaredApiEndpoint[];    // Step 6b: verbatim paths from README; empty array if section absent
  violations: Violation[];
}

export function assembleConfig(parts: {
  architecture: ArchitectureConfig;
  rules: ArchitectureRule[];
  techStack: TechStackConfig;
  folderStructure: FolderNode;
  violations: Violation[];
}): ConstitutionConfig {
  const config: ConstitutionConfig = {
    architecture: parts.architecture,
    layers: parts.architecture.layers,
    rules: parts.rules,
    techStack: parts.techStack,
    folderStructure: parts.folderStructure,
    violations: parts.violations,
  };

  // Final completeness gate
  const fatalViolations = config.violations.filter(
    (v) => v.severity === "FATAL"
  );
  if (fatalViolations.length > 0) {
    throw new ConstitutionFatalError(fatalViolations);
  }

  return config;
}
```

**Rule:** The assembled config is immutable from this point. Downstream skills read from it; they must never mutate or patch it.

---

## Step 9 — Validate the Config

Run through this checklist before passing the config to any downstream skill:

- [ ] `architecture.pattern` is a known, non-`"unknown"` value
- [ ] `layers[]` contains at minimum: `presentation`, `domain`, `data`
- [ ] Every layer in `layers[]` declares explicit `allowedDependencies`
- [ ] At least one `MUST_NOT` rule exists in `rules[]`
- [ ] `techStack.stateManagement` is non-null
- [ ] `folderStructure` is a non-empty object
- [ ] `violations[]` contains no `FATAL` entries
- [ ] No rule `description` is empty or contains placeholder text
- [ ] `tokenSource` path, if set, exists in the repo
- [ ] Config was produced from the document verbatim — no fields were inferred

---

## File Layout Reference

```
constitution-reader/
├── index.ts                    ← Orchestrator: runs steps 1–8 in order
├── parseHeadings.ts            ← Step 2: markdown → SectionNode[]
├── sectionMatcher.ts           ← Step 3: section presence validation
├── extractArchitecture.ts      ← Step 4: pattern + layers
├── extractRules.ts             ← Step 5: dependency + cross-feature rules
├── extractTechStack.ts         ← Step 6: library + design system config
├── extractFolderStructure.ts   ← Step 7: directory tree → FolderNode
├── assembleConfig.ts           ← Step 8: final assembly + fatal gate
├── errors.ts                   ← ConstitutionFatalError, Violation types
└── __tests__/
    ├── parseHeadings.test.ts
    ├── extractRules.test.ts
    └── assembleConfig.test.ts

Shared (consumed by all downstream skills):
└── constitution.config.json    ← Written once; read-only to all other skills
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| No hallucination | Every output field is traced to an explicit line in the constitution; nothing is inferred or defaulted silently |
| Deterministic extraction | Given the same input document, the output config must be byte-for-byte identical across runs |
| Fail fast on fatal gaps | Missing architecture, layer, or dependency sections are FATALs — the skill halts rather than producing a corrupt config |
| WARN, don't silence | Ambiguous or missing non-critical sections produce violations in the output, never silent defaults |
| Immutable output | The assembled config is written once and treated as read-only by all downstream skills |
| Verbatim rules | Rule descriptions are copied exactly from the document — no paraphrasing that could shift meaning |
| Single source of truth | All other skills import from `constitution.config.json`; none re-parse the markdown independently |
