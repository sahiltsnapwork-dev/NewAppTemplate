---
name: readme-constitution-reader
description: "MUST be used whenever the GSD codebase analysis artifacts (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, CONCERNS.md, INTEGRATIONS.md, STACK.md, TESTING.md) or a project-level architecture README needs to be parsed, validated, or converted into a structured config that governs downstream skills. GSD artifacts are always the PRIMARY and AUTHORITATIVE source — README is a secondary fallback only. Use when: reading or re-reading the GSD artifacts before generating any feature code; extracting architecture rules, layer definitions, or dependency constraints from codebase-derived analysis; normalizing folder-structure conventions into machine-readable JSON; detecting missing, conflicting, or ambiguous sections; using CONCERNS.md to identify anti-patterns that must NOT be replicated; supplying base config to all other Spec-Kit skills. Keywords: GSD, codebase analysis, constitution, readme, architecture rules, feature-first, clean architecture, layer definitions, dependency rules, react native spec-kit, config extraction, concerns, anti-patterns, technical debt."
priority: HIGH
auto-trigger: true
---

# README / Constitution Reader (GSD-First Mode)

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

> Trigger this skill **before** any other Spec-Kit skill runs. All downstream skills depend on the structured config this skill produces. Never generate feature code, layer scaffolding, or design-system tokens until this skill has returned a valid, violation-free config.

> **CRITICAL — GSD ARTIFACTS TAKE ABSOLUTE PRIORITY:** The GSD codebase analysis artifacts (`ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `CONCERNS.md`, `INTEGRATIONS.md`, `STACK.md`, `TESTING.md`) are derived directly from the actual Flutter codebase. They reflect **real implementation behavior**, not documented intent. When a GSD artifact contradicts a README, the GSD artifact wins — always.

---

## Priority Hierarchy (Non-Negotiable)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. GSD CODEBASE ARTIFACTS  (highest authority)                 │
│     ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md,              │
│     CONCERNS.md, INTEGRATIONS.md, STACK.md, TESTING.md          │
│     → Derived from actual codebase; reflects real behavior      │
├─────────────────────────────────────────────────────────────────┤
│  2. FLUTTER SOURCE CODE  (direct evidence)                      │
│     .dart files, pubspec.yaml, route definitions                │
│     → When GSD is silent on a topic, inspect source directly    │
├─────────────────────────────────────────────────────────────────┤
│  3. MODULE README  (secondary — API endpoints only)             │
│     Feature-level README.md                                     │
│     → Used for API endpoint declarations when GSD lacks them    │
├─────────────────────────────────────────────────────────────────┤
│  4. PROJECT CONSTITUTION / README  (lowest authority)            │
│     CONSTITUTION.md, root README.md, SPEC.md                    │
│     → Fallback only; never overrides GSD-derived data           │
└─────────────────────────────────────────────────────────────────┘
```

**Override rule:** If a GSD artifact and a README disagree on any fact (architecture pattern, layer boundaries, tech stack, folder structure, API endpoints, conventions), the GSD artifact value is used and a WARN is emitted: `"CONFLICT: GSD artifact '{gsdFile}' states '{gsdValue}' but README states '{readmeValue}'. Using GSD value — it is derived from the actual codebase."`

---

## Step 0 — Locate and Load GSD Codebase Artifacts (PRIMARY SOURCE)

Before loading any README or constitution file, scan for and load the GSD analysis artifacts. These are the **primary and authoritative** source of truth for the entire pipeline.

**GSD Artifact Registry — each file maps to specific config domains:**

| GSD Artifact | Config Domains It Populates | Priority |
|---|---|---|
| `ARCHITECTURE.md` | `architecture.pattern`, `layers[]`, `allowedDependencies[]`, data flow | **REQUIRED** |
| `STRUCTURE.md` | `folderStructure`, `folderConventions`, feature/module layout | **REQUIRED** |
| `CONVENTIONS.md` | Naming rules, coding standards, import conventions | **REQUIRED** |
| `CONCERNS.md` | `antiPatterns[]`, `technicalDebt[]`, legacy patterns to AVOID | **REQUIRED** |
| `INTEGRATIONS.md` | `apiEndpoints[]`, environment config, third-party service mappings | **REQUIRED** |
| `STACK.md` | `techStack` (state management, navigation, networking, testing) | **REQUIRED** |
| `TESTING.md` | Test framework, coverage thresholds, test patterns | **RECOMMENDED** |

**Step 0a — Scan for GSD artifacts:**

- Search the pipeline input for a `gsdArtifactsPath` (explicit path to the GSD output folder).
- If not provided, scan the module root, repo root, `docs/`, and `analysis/` for files matching the GSD artifact names listed above.
- For each artifact found, load its full content into `gsdArtifacts: Record<string, string>`.

```ts
// constitution-reader/loadGsdArtifacts.ts

export const GSD_ARTIFACT_NAMES = [
  "ARCHITECTURE.md",
  "STRUCTURE.md",
  "CONVENTIONS.md",
  "CONCERNS.md",
  "INTEGRATIONS.md",
  "STACK.md",
  "TESTING.md",
] as const;

export type GsdArtifactName = (typeof GSD_ARTIFACT_NAMES)[number];

export interface GsdArtifacts {
  files: Record<GsdArtifactName, string | null>;  // content or null if not found
  foundCount: number;
  missingArtifacts: GsdArtifactName[];
  basePath: string;
}

export function loadGsdArtifacts(
  searchPaths: string[],
  inputFiles: Array<{ path: string; content: string }>
): GsdArtifacts {
  const files = {} as Record<GsdArtifactName, string | null>;
  const missing: GsdArtifactName[] = [];

  for (const artifactName of GSD_ARTIFACT_NAMES) {
    // Check pipeline input files first, then scan disk paths
    const fromInput = inputFiles.find((f) =>
      f.path.endsWith(artifactName) || f.path.endsWith(`/${artifactName}`)
    );
    if (fromInput) {
      files[artifactName] = fromInput.content;
      continue;
    }

    // Scan search paths on disk
    let found = false;
    for (const base of searchPaths) {
      const candidate = `${base}/${artifactName}`;
      // Load file if exists (implementation depends on runtime)
      const content = tryReadFile(candidate);
      if (content !== null) {
        files[artifactName] = content;
        found = true;
        break;
      }
    }
    if (!found) {
      files[artifactName] = null;
      missing.push(artifactName);
    }
  }

  return {
    files,
    foundCount: GSD_ARTIFACT_NAMES.length - missing.length,
    missingArtifacts: missing,
    basePath: searchPaths[0] ?? "",
  };
}
```

**Decision points:**
- If ALL 7 GSD artifacts are found → emit: `"INFO: All 7 GSD codebase artifacts loaded. These are the primary source of truth for this conversion. README will be used as supplementary reference only."`
- If ARCHITECTURE.md is missing → **FAIL**: `"FATAL: GSD artifact 'ARCHITECTURE.md' not found. This is the primary source for architecture pattern and layer definitions. Cannot proceed without codebase-derived architecture analysis."`
- If STRUCTURE.md is missing → **FAIL**: `"FATAL: GSD artifact 'STRUCTURE.md' not found. This is the primary source for folder structure and module layout. Cannot proceed without codebase-derived structure analysis."`
- If CONCERNS.md is missing → **FAIL**: `"FATAL: GSD artifact 'CONCERNS.md' not found. This artifact identifies anti-patterns and technical debt that must NOT be replicated in the target system. Cannot proceed without it."`
- If INTEGRATIONS.md is missing → add a WARN: `"GSD artifact 'INTEGRATIONS.md' not found. API endpoint extraction will fall back to module README → Flutter source code. Declare endpoints in INTEGRATIONS.md for authoritative coverage."`
- If STACK.md is missing → add a WARN: `"GSD artifact 'STACK.md' not found. Tech stack detection will fall back to README → pubspec.yaml inference."`
- If CONVENTIONS.md is missing → add a WARN: `"GSD artifact 'CONVENTIONS.md' not found. Naming and coding conventions will be inferred from source patterns. Explicit conventions in CONVENTIONS.md prevent inference errors."`
- If TESTING.md is missing → add a WARN: `"GSD artifact 'TESTING.md' not found. Test configuration will use pipeline defaults (Jest, 100% coverage)."`
- If `foundCount >= 4` (at least 4 of 7 found, including the 3 REQUIRED) → proceed with GSD-first mode fully active.
- If `foundCount < 4` but ARCHITECTURE.md + STRUCTURE.md + CONCERNS.md are present → proceed with WARNs for missing artifacts.

**Step 0b — Parse all GSD artifacts into section maps:**

Each GSD artifact is parsed using the same markdown parser as Step 2. The resulting section maps are stored in `gsdSections: Record<GsdArtifactName, SectionNode[]>`.

```ts
// constitution-reader/parseGsdArtifacts.ts

export function parseAllGsdArtifacts(
  gsdArtifacts: GsdArtifacts
): Record<GsdArtifactName, SectionNode[]> {
  const result = {} as Record<GsdArtifactName, SectionNode[]>;

  for (const [name, content] of Object.entries(gsdArtifacts.files)) {
    if (content !== null) {
      result[name as GsdArtifactName] = parseConstitution(content);
    } else {
      result[name as GsdArtifactName] = [];
    }
  }

  return result;
}
```

**Step 0c — Extract anti-patterns and technical debt from CONCERNS.md:**

CONCERNS.md is a special GSD artifact. Unlike the others (which provide facts to replicate), CONCERNS.md provides facts to **avoid**. Every concern listed here is a pattern, implementation, or practice in the Flutter codebase that must NOT be carried into the React Native target.

```ts
// constitution-reader/extractConcerns.ts

export type ConcernSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface CodebaseConcern {
  id: string;                  // slugified concern title
  severity: ConcernSeverity;
  title: string;               // verbatim from CONCERNS.md heading or bullet
  description: string;         // full concern text
  category: "anti-pattern" | "technical-debt" | "legacy-pattern" | "security" | "performance" | "maintainability";
  affectedLayers: string[];    // layers where this concern was observed (e.g. ["data", "presentation"])
  recommendation: string;      // how to avoid this in the target system
  doNotReplicate: boolean;     // always true — CONCERNS.md items are never carried forward
}

export function extractConcerns(
  concernsSections: SectionNode[]
): CodebaseConcern[] {
  const concerns: CodebaseConcern[] = [];

  for (const section of concernsSections) {
    if (section.depth >= 2) {
      const severity = inferConcernSeverity(section);
      const category = inferConcernCategory(section);
      const affectedLayers = inferAffectedLayers(section);

      concerns.push({
        id: slugify(section.rawTitle),
        severity,
        title: section.rawTitle.trim(),
        description: section.bodyLines.join("\n").trim(),
        category,
        affectedLayers,
        recommendation: extractRecommendation(section),
        doNotReplicate: true,  // ALWAYS true — this is the whole point of CONCERNS.md
      });
    }
  }

  return concerns;
}

function inferConcernSeverity(section: SectionNode): ConcernSeverity {
  const text = section.bodyLines.join(" ").toLowerCase();
  if (text.includes("critical") || text.includes("severe") || text.includes("blocker")) return "CRITICAL";
  if (text.includes("high") || text.includes("significant") || text.includes("major")) return "HIGH";
  if (text.includes("medium") || text.includes("moderate")) return "MEDIUM";
  return "LOW";
}

function inferConcernCategory(section: SectionNode): CodebaseConcern["category"] {
  const text = (section.rawTitle + " " + section.bodyLines.join(" ")).toLowerCase();
  if (text.includes("anti-pattern") || text.includes("antipattern"))  return "anti-pattern";
  if (text.includes("technical debt") || text.includes("tech debt"))  return "technical-debt";
  if (text.includes("legacy") || text.includes("deprecated"))        return "legacy-pattern";
  if (text.includes("security") || text.includes("vulnerability"))   return "security";
  if (text.includes("performance") || text.includes("slow"))         return "performance";
  return "maintainability";
}

function inferAffectedLayers(section: SectionNode): string[] {
  const text = section.bodyLines.join(" ").toLowerCase();
  const layers: string[] = [];
  if (text.includes("presentation") || text.includes("widget") || text.includes("ui") || text.includes("screen")) layers.push("presentation");
  if (text.includes("domain") || text.includes("business logic") || text.includes("use case"))                     layers.push("domain");
  if (text.includes("data") || text.includes("repository") || text.includes("api") || text.includes("datasource")) layers.push("data");
  if (text.includes("state") || text.includes("bloc") || text.includes("cubit") || text.includes("provider"))      layers.push("state");
  return layers.length > 0 ? layers : ["unknown"];
}

function extractRecommendation(section: SectionNode): string {
  // Look for lines starting with "Recommendation:", "Fix:", "Instead:", "Should:", etc.
  const recLine = section.bodyLines.find((l) =>
    /^(recommendation|fix|instead|should|solution|alternative|improvement):/i.test(l.trim())
  );
  return recLine?.replace(/^[^:]+:\s*/, "").trim() ?? "Avoid replicating this pattern in the target system.";
}
```

**Decision point:**
- If CONCERNS.md yields 0 concerns → WARN: `"CONCERNS.md was loaded but no structured concerns could be extracted. Verify the file contains H2/H3 headings with concern descriptions."`
- If any concern has `severity: "CRITICAL"` → emit for each: `"CRITICAL CONCERN: '{title}' — this pattern MUST NOT be replicated in the React Native target. Downstream skills will be instructed to avoid it."`
- All extracted concerns are stored in `constitutionConfig.concerns[]` and passed to every downstream skill that might encounter the anti-pattern.

**Rule:** CONCERNS.md is a blacklist, not a whitelist. Every item in it describes something the Flutter codebase does WRONG. The target system must not replicate these patterns. Downstream skills that encounter code matching a concern pattern must emit a WARN and choose an alternative implementation.

---

## Step 1 — Locate and Load Supplementary Files (README / Constitution)

After GSD artifacts are loaded (Step 0), load supplementary files. These are **secondary sources** that fill gaps where GSD artifacts are silent — they never override GSD data.

This skill loads **two supplementary markdown files** and merges them with GSD data. Each supplementary file fills specific gaps:

| Data | Primary Source (GSD) | Fallback Source |
|---|---|---|
| Architecture pattern, layers, dependency rules | **ARCHITECTURE.md** (GSD) | Project constitution file |
| Folder structure, module layout | **STRUCTURE.md** (GSD) | Project constitution file |
| Tech stack | **STACK.md** (GSD) | Project constitution / pubspec.yaml |
| Coding conventions, naming rules | **CONVENTIONS.md** (GSD) | Project constitution file |
| Anti-patterns, technical debt | **CONCERNS.md** (GSD) | _(no fallback — CONCERNS.md is the only source)_ |
| API Endpoints | **INTEGRATIONS.md** (GSD) → Module README | Project constitution file |
| Test configuration | **TESTING.md** (GSD) | Pipeline defaults |

**Step 1a — Load the Flutter module README (supplementary source for API Endpoints):**

- If the pipeline input includes `module.readmePath` (an explicit path to a feature README) → load that file as `moduleReadme`.
- Otherwise, scan the `module.sourcePath` directory and its immediate subdirectories for any `.md` file. Load the first `.md` file found as `moduleReadme`.
- Parse `moduleReadme` using the same markdown parser as the constitution (Step 2). Extract its sections into `moduleReadmeSections[]`.
- If a `moduleReadme` is found → emit: `"INFO: Flutter module README loaded from '{path}'. This is a SUPPLEMENTARY source — GSD artifacts (especially INTEGRATIONS.md) take priority for API endpoints."`
- If no `.md` file is found in `module.sourcePath` → set `moduleReadme = null` and emit WARN: `"No README found in Flutter module folder '{sourcePath}'."`

**Step 1b — Load the project-level constitution file (lowest-priority fallback):**

- Search the repo root and `docs/` for files named `CONSTITUTION.md`, `README.md`, `SPEC.md`, or `ARCHITECTURE.md`
- If multiple candidates exist, prefer the one containing the heading `# React Native Spec-Kit Constitution` (or the nearest equivalent)
- Load the raw markdown string into memory as `constitutionFile`

**Decision point:**
- If no GSD artifacts AND no constitution file are found → **FAIL** immediately with `{ "violations": [{ "severity": "FATAL", "message": "Neither GSD codebase artifacts nor a constitution file were found. Cannot proceed without at least one authoritative source." }] }`.
- If GSD artifacts are present but no constitution file → this is **perfectly valid**. GSD artifacts are sufficient on their own. Emit: `"INFO: No project constitution file found. GSD codebase artifacts are the sole authoritative source. This is the preferred configuration."`
- If the constitution file is found but is empty or under 200 characters → add WARN (not FAIL, since GSD artifacts are primary): `"WARN: Constitution file exists but is too short to be useful. GSD artifacts will be used exclusively."`
- If both GSD artifacts and constitution file exist → load both, but GSD always wins on conflicts (see Priority Hierarchy).

**Priority rule for API Endpoints extraction (Step 6b):**
1. **INTEGRATIONS.md** (GSD) — if present and contains API endpoint declarations, this is the authoritative source. Stop here.
2. **Module README** — if INTEGRATIONS.md has no endpoints, fall back to `moduleReadmeSections[]`.
3. **Project constitution** — if neither above has endpoints, search constitution sections as last resort.
- This priority is absolute — never merge endpoints across sources. The highest-priority source with endpoints wins exclusively.

**Rule:** Never fabricate, assume, or default-fill any rule that is not explicitly present in a loaded document. GSD artifacts are the primary source; README/constitution fill gaps only.

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

## Step 3 — Identify and Validate Required Sections (GSD-First Resolution)

Map parsed sections to the six required constitution domains. **GSD artifacts are checked first** — only fall back to constitution sections when the GSD artifact for that domain is missing.

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

// GSD artifact → required section mapping
// Each GSD artifact may satisfy one or more required sections
const GSD_TO_SECTION_MAP: Record<string, RequiredSection[]> = {
  "ARCHITECTURE.md": ["guiding principles", "layer definitions", "dependency rules"],
  "STRUCTURE.md":    ["folder structure"],
  "STACK.md":        ["tech stack"],
  "CONVENTIONS.md":  ["design system"],  // design system tokens/conventions
};

export function matchRequiredSections(
  gsdSections: Record<GsdArtifactName, SectionNode[]>,
  constitutionSections: SectionNode[]
): Record<RequiredSection, { source: "gsd" | "constitution" | null; section: SectionNode | null; gsdArtifact: string | null }> {
  const result = {} as Record<RequiredSection, { source: "gsd" | "constitution" | null; section: SectionNode | null; gsdArtifact: string | null }>;

  for (const required of REQUIRED_SECTIONS) {
    // PRIORITY 1: Check GSD artifacts
    let foundInGsd = false;
    for (const [artifactName, coveredSections] of Object.entries(GSD_TO_SECTION_MAP)) {
      if (coveredSections.includes(required) && gsdSections[artifactName as GsdArtifactName]?.length > 0) {
        const gsdMatch = gsdSections[artifactName as GsdArtifactName]
          .find((s) => s.title.includes(required));
        // Even if no exact title match, the GSD artifact itself covers this domain
        const anySection = gsdMatch ?? gsdSections[artifactName as GsdArtifactName][0];
        result[required] = { source: "gsd", section: anySection, gsdArtifact: artifactName };
        foundInGsd = true;
        break;
      }
    }
    if (foundInGsd) continue;

    // PRIORITY 2: Fall back to constitution sections
    const constitutionMatch = constitutionSections.find((s) => s.title.includes(required)) ?? null;
    if (constitutionMatch) {
      result[required] = { source: "constitution", section: constitutionMatch, gsdArtifact: null };
      // Emit a WARN when falling back to README for a domain that should have been in GSD
      console.warn(`WARN: Required section '${required}' resolved from README/constitution, not from GSD artifacts. GSD-derived data is preferred — consider adding this to the appropriate GSD artifact.`);
    } else {
      result[required] = { source: null, section: null, gsdArtifact: null };
    }
  }

  return result;
}
```

**Decision point:**
- If `guiding principles` / `layer definitions` / `dependency rules` are ALL resolved from GSD artifacts → emit: `"INFO: All critical architecture sections resolved from GSD codebase artifacts. No README fallback needed for architecture rules."`
- If `guiding principles` is `null` (not in GSD, not in constitution) → **FAIL**: `"FATAL: 'Guiding Principles' / architecture pattern not found in ARCHITECTURE.md or any fallback. Architecture pattern cannot be determined."`
- If `layer definitions` is `null` → **FAIL**: `"FATAL: 'Layer Definitions' not found in ARCHITECTURE.md or any fallback. Layer boundaries cannot be enforced."`
- If `dependency rules` is `null` → **FAIL**: `"FATAL: 'Dependency Rules' not found in ARCHITECTURE.md or any fallback. Cross-layer constraints cannot be applied."`
- If `folder structure`, `tech stack`, or `design system` are `null` → add a **WARN** violation but continue processing
- If ANY section resolved from constitution instead of GSD → add a WARN per section: `"Section '{section}' was resolved from README instead of GSD artifact '{expectedArtifact}'. README-derived data may not reflect actual codebase behavior. Verify before proceeding."`

**Rule:** FAIL violations must halt the skill and return the violations array to the caller. WARN violations are appended to `violations[]` in the output config but do not stop execution.

---

## Step 4 — Extract Architecture Pattern and Layers (GSD-First)

Parse architecture data from **ARCHITECTURE.md** (GSD) as the primary source. Fall back to constitution guiding-principles / layer-definitions sections only when ARCHITECTURE.md is absent.

```ts
// constitution-reader/extractArchitecture.ts

export interface LayerDefinition {
  name: string;            // e.g. "presentation", "domain", "data", "state"
  responsibilities: string[];
  allowedDependencies: string[]; // layers this layer MAY import from
  source: "gsd" | "constitution";  // tracks where this definition came from
}

export interface ArchitectureConfig {
  pattern: string;         // e.g. "feature-first"
  layers: LayerDefinition[];
  dataFlow: string | null;        // data flow description from ARCHITECTURE.md
  stateManagementPattern: string | null;  // e.g. "BLoC", "Provider", "Cubit"
  source: "gsd" | "constitution";  // which source provided the architecture data
}

const KNOWN_PATTERNS = ["feature-first", "modular", "monolithic", "clean-architecture", "layered", "mvvm", "mvc", "bloc"] as const;

export function extractArchitecture(
  gsdArchitectureSections: SectionNode[],   // from ARCHITECTURE.md (GSD) — checked FIRST
  principlesSection: SectionNode | null,     // from constitution — fallback only
  layersSection: SectionNode | null,         // from constitution — fallback only
  concernsList: CodebaseConcern[]            // from CONCERNS.md — anti-patterns to flag
): ArchitectureConfig {

  // ── PRIORITY 1: Extract from ARCHITECTURE.md (GSD) ──────────────────────────
  if (gsdArchitectureSections.length > 0) {
    const allBody = gsdArchitectureSections.flatMap((s) => s.bodyLines);
    const allText = allBody.join(" ").toLowerCase();

    // 1a. Detect architecture pattern
    const patternLine = allBody.find((l) =>
      KNOWN_PATTERNS.some((p) => l.toLowerCase().includes(p))
    );
    const pattern = KNOWN_PATTERNS.find((p) =>
      patternLine?.toLowerCase().includes(p)
    ) ?? "unknown";

    // 1b. Parse layers from GSD sections
    const layerSections = gsdArchitectureSections.filter((s) =>
      ["presentation", "domain", "data", "state", "layer"].some((kw) =>
        s.title.includes(kw)
      )
    );
    const layers = layerSections.length > 0
      ? parseLayerBlocks(layerSections, "gsd")
      : parseLayerBlocksFromBody(allBody, "gsd");

    // 1c. Extract data flow description
    const dataFlowSection = gsdArchitectureSections.find((s) =>
      s.title.includes("data flow") || s.title.includes("dataflow")
    );
    const dataFlow = dataFlowSection?.bodyLines.join("\n").trim() ?? null;

    // 1d. Extract state management pattern from actual codebase analysis
    const stateManagementPattern = detectStateManagementPattern(allText);

    // 1e. Cross-reference with CONCERNS.md — flag architecture-level anti-patterns
    const architectureConcerns = concernsList.filter((c) =>
      c.affectedLayers.includes("domain") || c.affectedLayers.includes("data") || c.category === "anti-pattern"
    );
    for (const concern of architectureConcerns) {
      console.warn(`ARCHITECTURE CONCERN from CONCERNS.md: '${concern.title}' — this pattern must NOT be replicated. Downstream skills will be instructed to use an alternative.`);
    }

    return { pattern, layers, dataFlow, stateManagementPattern, source: "gsd" };
  }

  // ── PRIORITY 2: Fall back to constitution sections ──────────────────────────
  if (principlesSection && layersSection) {
    console.warn("WARN: Architecture data resolved from README/constitution, not ARCHITECTURE.md (GSD). Codebase-derived architecture data is more reliable.");

    const patternLine = principlesSection.bodyLines.find((l) =>
      KNOWN_PATTERNS.some((p) => l.toLowerCase().includes(p))
    );
    const pattern = KNOWN_PATTERNS.find((p) =>
      patternLine?.toLowerCase().includes(p)
    ) ?? "unknown";

    const layers = parseLayerBlocks([layersSection], "constitution");
    return { pattern, layers, dataFlow: null, stateManagementPattern: null, source: "constitution" };
  }

  // Should not reach here — Step 3 validation prevents it
  throw new Error("FATAL: No architecture source available.");
}

function detectStateManagementPattern(text: string): string | null {
  if (text.includes("bloc"))      return "BLoC";
  if (text.includes("cubit"))     return "Cubit";
  if (text.includes("provider"))  return "Provider";
  if (text.includes("riverpod"))  return "Riverpod";
  if (text.includes("getx"))      return "GetX";
  if (text.includes("mobx"))      return "MobX";
  return null;
}
```

**Quality checks:**
- If `pattern` resolves to `"unknown"` → add a WARN violation: `"Architecture pattern not explicitly stated in ARCHITECTURE.md or constitution. Defaulting is not permitted; please name the pattern."`
- Layer `allowedDependencies` must only reference other layer names found in the same document — never invent dependency rules
- If architecture data came from GSD (`source: "gsd"`), and the constitution also has architecture data that **conflicts** → emit: `"CONFLICT: ARCHITECTURE.md (GSD) states pattern '{gsdPattern}' but constitution states '{constitutionPattern}'. Using GSD value — it reflects the actual codebase."` and use the GSD value.
- `dataFlow` and `stateManagementPattern` are GSD-exclusive fields — they have no constitution fallback because only codebase analysis can accurately determine actual data flow and state patterns.

---

## Step 5 — Extract Dependency Rules, Cross-Feature Rules, and Anti-Patterns (GSD-First)

Parse dependency rules from **ARCHITECTURE.md** (GSD) and **CONVENTIONS.md** (GSD) as primary sources. Integrate **CONCERNS.md** anti-patterns as negative rules (things to NOT do). Fall back to constitution dependency-rules section only when GSD sources are absent.

```ts
// constitution-reader/extractRules.ts

export type RuleSeverity = "MUST" | "MUST_NOT" | "SHOULD" | "SHOULD_NOT";
export type RuleSource = "gsd-architecture" | "gsd-conventions" | "gsd-concerns" | "constitution";

export interface ArchitectureRule {
  id: string;            // e.g. "no-cross-feature-import"
  severity: RuleSeverity;
  description: string;   // exact text from source document, trimmed
  section: string;       // source section title
  source: RuleSource;    // tracks provenance — GSD rules override constitution rules
  fromConcerns: boolean; // true if this rule was derived from CONCERNS.md (anti-pattern avoidance)
}

const SEVERITY_KEYWORDS: Record<RuleSeverity, string[]> = {
  MUST: ["must", "required", "always"],
  MUST_NOT: ["must not", "never", "forbidden", "not allowed"],
  SHOULD: ["should", "recommended"],
  SHOULD_NOT: ["should not", "avoid", "discouraged"],
};

export function extractRules(
  gsdArchitectureSections: SectionNode[],    // from ARCHITECTURE.md (GSD) — PRIORITY 1
  gsdConventionsSections: SectionNode[],     // from CONVENTIONS.md (GSD) — PRIORITY 1
  concernsList: CodebaseConcern[],           // from CONCERNS.md (GSD) — generates MUST_NOT rules
  dependencySection: SectionNode | null,     // from constitution — fallback only
  allConstitutionSections: SectionNode[]
): ArchitectureRule[] {
  const rules: ArchitectureRule[] = [];

  // ── PRIORITY 1a: Extract rules from ARCHITECTURE.md (GSD) ──────────────────
  for (const section of gsdArchitectureSections) {
    for (const line of section.bodyLines) {
      const rule = tryExtractRule(line, section.rawTitle, "gsd-architecture");
      if (rule) rules.push(rule);
    }
  }

  // ── PRIORITY 1b: Extract rules from CONVENTIONS.md (GSD) ───────────────────
  for (const section of gsdConventionsSections) {
    for (const line of section.bodyLines) {
      const rule = tryExtractRule(line, section.rawTitle, "gsd-conventions");
      if (rule) rules.push(rule);
    }
  }

  // ── PRIORITY 1c: Convert CONCERNS.md anti-patterns into MUST_NOT rules ─────
  // Every concern in CONCERNS.md becomes a MUST_NOT rule that downstream skills
  // must respect. This ensures anti-patterns are not blindly replicated.
  for (const concern of concernsList) {
    rules.push({
      id: `concern-${concern.id}`,
      severity: "MUST_NOT",
      description: `[FROM CONCERNS.md] ${concern.title}: ${concern.description}. Recommendation: ${concern.recommendation}`,
      section: "CONCERNS.md",
      source: "gsd-concerns",
      fromConcerns: true,
    });
  }

  // ── PRIORITY 2: Fall back to constitution dependency rules ─────────────────
  // Only add constitution rules that don't duplicate GSD rules
  if (dependencySection) {
    for (const section of [dependencySection, ...allConstitutionSections]) {
      for (const line of section.bodyLines) {
        const rule = tryExtractRule(line, section.rawTitle, "constitution");
        if (rule && !rules.some((r) => r.id === rule.id)) {
          rules.push(rule);
        }
      }
    }
  }

  return deduplicateRules(rules);
}

function tryExtractRule(line: string, sectionTitle: string, source: RuleSource): ArchitectureRule | null {
  const lower = line.toLowerCase();
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return {
        id: slugify(line),
        severity: severity as RuleSeverity,
        description: line.trim(),
        section: sectionTitle,
        source,
        fromConcerns: source === "gsd-concerns",
      };
    }
  }
  return null;
}

function deduplicateRules(rules: ArchitectureRule[]): ArchitectureRule[] {
  const seen = new Map<string, ArchitectureRule>();
  for (const r of rules) {
    const existing = seen.get(r.id);
    if (!existing) {
      seen.set(r.id, r);
    } else if (existing.source === "constitution" && r.source !== "constitution") {
      // GSD rule overrides constitution rule with same ID
      seen.set(r.id, r);
    }
    // Otherwise first occurrence (higher priority) wins
  }
  return Array.from(seen.values());
}
```

**Quality checks:**
- Every rule description must be verbatim from the document — no paraphrasing
- Duplicate rules (same description, different sections) are collapsed; GSD source wins over constitution source
- If zero `MUST_NOT` rules are extracted (including from CONCERNS.md) → add a WARN: `"No hard prohibitions found. Cross-feature import restrictions and anti-pattern guards may be missing."`
- CONCERNS.md-derived rules are always `MUST_NOT` severity — they represent patterns that were actively identified as problematic in the real codebase
- If a constitution rule conflicts with a GSD rule → the GSD rule wins and a WARN is emitted: `"CONFLICT: GSD rule '{gsdId}' overrides constitution rule '{constitutionId}'. GSD rules are derived from the actual codebase."` 

---

## Step 6 — Extract Tech Stack and Design System Config (GSD-First)

Extract tech stack from **STACK.md** (GSD) as the primary source, and design system conventions from **CONVENTIONS.md** (GSD). Fall back to constitution sections only when the corresponding GSD artifact is absent.

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
  // GSD-exclusive fields (only available from STACK.md codebase analysis)
  flutterStatePattern: string | null;     // actual state pattern found in codebase (BLoC, Provider, etc.)
  flutterNetworking: string | null;       // actual networking lib (Dio, http, Retrofit, etc.)
  flutterDependencies: string[];          // key dependencies from pubspec.yaml analysis
  source: "gsd" | "constitution" | "mixed";  // provenance tracking
}

const KNOWN_LIBS: Record<keyof Omit<TechStackConfig, "designSystem" | "flutterStatePattern" | "flutterNetworking" | "flutterDependencies" | "source">, string[]> = {
  stateManagement: ["zustand", "redux", "jotai", "mobx", "context"],
  navigation: ["react-navigation", "expo-router"],
  networking: ["axios", "react-query", "tanstack", "fetch"],
  testing: ["jest", "testing-library", "detox", "maestro"],
};

// Flutter-specific libraries detected by GSD codebase analysis (from STACK.md)
const FLUTTER_LIBS = {
  stateManagement: ["bloc", "cubit", "provider", "riverpod", "getx", "mobx"],
  networking: ["dio", "http", "retrofit", "graphql", "chopper"],
  navigation: ["go_router", "auto_route", "navigator"],
};

export function extractTechStack(
  gsdStackSections: SectionNode[],         // from STACK.md (GSD) — PRIORITY 1
  gsdConventionsSections: SectionNode[],   // from CONVENTIONS.md (GSD) — design system
  gsdTestingSections: SectionNode[],       // from TESTING.md (GSD) — test config
  constitutionTechSection: SectionNode | null,  // from constitution — fallback
  constitutionDesignSection: SectionNode | null  // from constitution — fallback
): TechStackConfig {
  let source: TechStackConfig["source"] = "constitution";

  // ── PRIORITY 1: Extract from STACK.md (GSD) ──────────────────────────────────
  if (gsdStackSections.length > 0) {
    source = "gsd";
    const allText = gsdStackSections.flatMap((s) => s.bodyLines).join(" ").toLowerCase();

    // Detect Flutter-side patterns (what the codebase actually uses)
    const flutterStatePattern = FLUTTER_LIBS.stateManagement.find((lib) => allText.includes(lib)) ?? null;
    const flutterNetworking = FLUTTER_LIBS.networking.find((lib) => allText.includes(lib)) ?? null;

    // Detect target RN tech stack declarations
    const stateManagement = KNOWN_LIBS.stateManagement.find((lib) => allText.includes(lib))
      ?? (flutterStatePattern === "bloc" || flutterStatePattern === "cubit" ? "redux-toolkit" : null);
    const navigation = KNOWN_LIBS.navigation.find((lib) => allText.includes(lib)) ?? "react-navigation";
    const networking = KNOWN_LIBS.networking.find((lib) => allText.includes(lib))
      ?? (flutterNetworking === "dio" ? "axios" : null);

    // Extract testing config from TESTING.md if available
    const testing = extractTestingLibs(gsdTestingSections);

    // Extract design system from CONVENTIONS.md
    const designSystem = extractDesignSystemConfig(gsdConventionsSections, constitutionDesignSection);

    // Extract Flutter dependencies mentioned in STACK.md
    const flutterDependencies = extractFlutterDependencies(gsdStackSections);

    return {
      stateManagement, navigation, networking, testing, designSystem,
      flutterStatePattern, flutterNetworking, flutterDependencies,
      source,
    };
  }

  // ── PRIORITY 2: Fall back to constitution ───────────────────────────────────
  console.warn("WARN: Tech stack resolved from README/constitution, not STACK.md (GSD). Codebase-derived stack data is more reliable.");

  const constitutionText = constitutionTechSection?.bodyLines.join(" ").toLowerCase() ?? "";
  return {
    stateManagement: KNOWN_LIBS.stateManagement.find((lib) => constitutionText.includes(lib)) ?? null,
    navigation: KNOWN_LIBS.navigation.find((lib) => constitutionText.includes(lib)) ?? null,
    networking: KNOWN_LIBS.networking.find((lib) => constitutionText.includes(lib)) ?? null,
    testing: KNOWN_LIBS.testing.filter((lib) => constitutionText.includes(lib)),
    designSystem: extractDesignSystemConfig([], constitutionDesignSection),
    flutterStatePattern: null,
    flutterNetworking: null,
    flutterDependencies: [],
    source: "constitution",
  };
}

function extractTestingLibs(gsdTestingSections: SectionNode[]): string[] {
  if (gsdTestingSections.length === 0) return ["jest", "testing-library"]; // pipeline defaults
  const text = gsdTestingSections.flatMap((s) => s.bodyLines).join(" ").toLowerCase();
  return KNOWN_LIBS.testing.filter((lib) => text.includes(lib));
}

function extractDesignSystemConfig(
  gsdConventionsSections: SectionNode[],
  constitutionDesignSection: SectionNode | null
): TechStackConfig["designSystem"] {
  // Check GSD CONVENTIONS.md first
  if (gsdConventionsSections.length > 0) {
    const text = gsdConventionsSections.flatMap((s) => s.bodyLines).join(" ").toLowerCase();
    const tokensOnly = text.includes("tokens only") || text.includes("no raw values") || text.includes("no hard-coded");
    const tokenSourceMatch = text.match(/token[s]?\s+(?:source|file)[:=]\s*["']?([^\s"']+)/);
    return { tokensOnly, tokenSource: tokenSourceMatch?.[1] ?? null };
  }
  // Fall back to constitution
  if (constitutionDesignSection) {
    const text = constitutionDesignSection.bodyLines.join(" ").toLowerCase();
    const tokensOnly = text.includes("tokens only") || text.includes("no raw");
    return { tokensOnly, tokenSource: null };
  }
  return { tokensOnly: false, tokenSource: null };
}

function extractFlutterDependencies(gsdStackSections: SectionNode[]): string[] {
  const deps: string[] = [];
  const text = gsdStackSections.flatMap((s) => s.bodyLines).join("\n");
  // Match common pubspec dependency patterns
  const depMatches = text.matchAll(/[-*]\s*[`]?(\w[\w_-]*)[`]?(?:\s*[:=]\s*|$)/gm);
  for (const match of depMatches) {
    if (match[1] && match[1].length > 2) deps.push(match[1]);
  }
  return deps;
}
```

**Decision point:**
- If `tokensOnly` cannot be determined (no GSD or constitution section) → set to `false` and add a WARN: `"Design system token enforcement not declared. Raw style values may proliferate."`
- If `stateManagement`, `navigation`, or `networking` cannot be matched from any source → set to `null`; never guess
- If STACK.md describes a Flutter state pattern (e.g. BLoC) but no target RN state management is declared → default to `"redux-toolkit"` and emit: `"INFO: Flutter uses '{flutterStatePattern}'. Target RN state management defaulted to 'redux-toolkit' per pipeline convention. Override in STACK.md if a different library is intended."`

---

## Step 6b — Extract Declared API Endpoints (GSD-First: INTEGRATIONS.md → README → Constitution)

Extract API endpoints from **INTEGRATIONS.md** (GSD) as the primary source. Fall back to module README, then constitution.

**Priority chain (absolute — never merge across sources):**
1. **INTEGRATIONS.md** (GSD) — if it contains API endpoint declarations, use exclusively.
2. **Module README** (`moduleReadmeSections[]`) — only if INTEGRATIONS.md has no endpoints.
3. **Project constitution** — last resort.

```ts
// constitution-reader/extractApiEndpoints.ts

export interface DeclaredApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "UNKNOWN";
  path: string;           // verbatim path copied from the source line — never constructed or modified
  description: string | null;
  responseType: "json" | "webview-url" | "html" | "unknown";
  apiVersion: "v1" | "v2" | null;
  source: "gsd-integrations" | "module-readme" | "constitution";  // provenance tracking
}

export function extractApiEndpoints(
  gsdIntegrationsSections: SectionNode[],   // from INTEGRATIONS.md (GSD) — PRIORITY 1
  moduleReadmeSections: SectionNode[],       // from module README — PRIORITY 2
  constitutionSections: SectionNode[]        // from constitution — PRIORITY 3 (last resort)
): DeclaredApiEndpoint[] {

  // ── PRIORITY 1: Extract from INTEGRATIONS.md (GSD) ─────────────────────────
  if (gsdIntegrationsSections.length > 0) {
    const endpoints = extractEndpointsFromSections(gsdIntegrationsSections, "gsd-integrations");
    if (endpoints.length > 0) {
      console.info(`INFO: ${endpoints.length} API endpoints extracted from INTEGRATIONS.md (GSD). This is the authoritative source — module README and constitution will NOT be checked for endpoints.`);
      return endpoints;
    }
  }

  // ── PRIORITY 2: Extract from module README ─────────────────────────────────
  if (moduleReadmeSections.length > 0) {
    const endpoints = extractEndpointsFromSections(moduleReadmeSections, "module-readme");
    if (endpoints.length > 0) {
      console.info(`INFO: ${endpoints.length} API endpoints extracted from module README (fallback — INTEGRATIONS.md had no endpoints).`);
      return endpoints;
    }
  }

  // ── PRIORITY 3: Extract from constitution ──────────────────────────────────
  const endpoints = extractEndpointsFromSections(constitutionSections, "constitution");
  if (endpoints.length > 0) {
    console.warn(`WARN: API endpoints resolved from constitution (lowest priority). Consider adding them to INTEGRATIONS.md for authoritative codebase-derived coverage.`);
  }
  return endpoints;
}

function extractEndpointsFromSections(
  sections: SectionNode[],
  source: DeclaredApiEndpoint["source"]
): DeclaredApiEndpoint[] {
  const API_SECTION_KEYWORDS = ["api endpoint", "endpoints", "api routes", "api urls", "api integration", "api calls", "services", "http"];
  const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

  // Find the top-level API Endpoints section by title match
  const apiSectionIndex = sections.findIndex((s) =>
    API_SECTION_KEYWORDS.some((kw) => s.title.includes(kw))
  );
  if (apiSectionIndex === -1) {
    // For GSD INTEGRATIONS.md, search ALL sections (the entire file is about integrations)
    if (source === "gsd-integrations") {
      return extractFromAllLines(sections.flatMap((s) => s.bodyLines), source);
    }
    return [];
  }

  const apiSection = sections[apiSectionIndex];

  // Collect ALL descendant sub-sections
  const descendantSections = sections
    .slice(apiSectionIndex + 1)
    .filter((s) => s.depth > apiSection.depth);

  const allLines = [
    ...apiSection.bodyLines,
    ...descendantSections.flatMap((s) => s.bodyLines),
  ];

  return extractFromAllLines(allLines, source);
}

function extractFromAllLines(
  allLines: string[],
  source: DeclaredApiEndpoint["source"]
): DeclaredApiEndpoint[] {
  const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;

  return allLines
    .map((line) => {
      // Priority 1: backtick-quoted path
      const backtickMatch = line.match(/`([a-zA-Z0-9][a-zA-Z0-9/_{}?=&%.:!\-]*)`/);
      // Priority 2: bare path starting with /
      const slashMatch = line.match(/(?<![`\w])(\/[a-zA-Z0-9/_{}?=&%.-]+)/);
      const rawPath = backtickMatch?.[1] ?? slashMatch?.[1] ?? null;
      if (!rawPath) return null;
      const method = HTTP_METHODS.find((m) => line.toUpperCase().includes(m)) ?? "UNKNOWN";
      const description =
        line.replace(method, "").replace(rawPath, "").replace(/`/g, "").replace(/^[^a-zA-Z]*/, "").trim() || null;
      const responseType = inferResponseType(line);
      const apiVersion = inferApiVersion(rawPath);
      return { method, path: rawPath, description, responseType, apiVersion, source } as DeclaredApiEndpoint;
    })
    .filter((e): e is DeclaredApiEndpoint => e !== null);
}

function inferResponseType(line: string): DeclaredApiEndpoint["responseType"] {
  const lower = line.toLowerCase();
  if (lower.includes("webview") || lower.includes("url response") || lower.includes("opens in webview")) return "webview-url";
  if (lower.includes("html"))     return "html";
  if (lower.includes("json"))     return "json";
  return "unknown";
}

function inferApiVersion(path: string): DeclaredApiEndpoint["apiVersion"] {
  if (path.includes("/v2/") || path.includes("/v2")) return "v2";
  if (path.includes("/v1/") || path.includes("/v1")) return "v1";
  return null;
}
```

**Decision point:**
- If endpoints are found from INTEGRATIONS.md (GSD) → set `constitutionConfig.apiEndpoints[]` with `source: "gsd-integrations"` and emit: `"INFO: {count} API endpoints sourced from INTEGRATIONS.md (GSD). This is the authoritative endpoint source derived from the actual codebase."`
- If endpoints are found from module README (fallback) → emit: `"INFO: {count} API endpoints sourced from module README (fallback). INTEGRATIONS.md had no endpoints."`
- If endpoints are found from constitution (last resort) → emit WARN: `"API endpoints resolved from constitution (lowest priority). These may not reflect actual codebase usage. Add endpoints to INTEGRATIONS.md for authoritative coverage."`
- If the section is found but no parseable lines → WARN: `"API Endpoints section found but no endpoints could be parsed. Expected format: 'GET /api/v1/path — description'"`
- If no section found in any source → set `apiEndpoints: []` and WARN: `"No API Endpoints found in INTEGRATIONS.md, README, or constitution. The API Integration skill will rely on Flutter source extraction only."`

**Rule:** Every `path` is copied verbatim from the source line. Never construct, infer, or modify a path. Source provenance is tracked on every endpoint.

---

## Step 7 — Normalize Folder Structure (GSD-First: STRUCTURE.md → Constitution)

Convert folder structure from **STRUCTURE.md** (GSD) as the primary source. Fall back to constitution folder-structure section only when STRUCTURE.md is absent.

```ts
// constitution-reader/extractFolderStructure.ts

export type FolderNode = {
  [key: string]: FolderNode | string; // string = file leaf annotation
};

export interface FolderStructureResult {
  tree: FolderNode;
  source: "gsd" | "constitution";
  featureModules: string[];       // detected feature/module names from STRUCTURE.md
  sharedModules: string[];        // shared/core modules detected
}

export function extractFolderStructure(
  gsdStructureSections: SectionNode[],    // from STRUCTURE.md (GSD) — PRIORITY 1
  constitutionSection: SectionNode | null  // from constitution — fallback
): FolderStructureResult {

  // ── PRIORITY 1: Extract from STRUCTURE.md (GSD) ────────────────────────────
  if (gsdStructureSections.length > 0) {
    const allBody = gsdStructureSections.flatMap((s) => s.bodyLines);
    const treeLines = extractCodeBlock(allBody);

    if (treeLines.length > 0) {
      const tree = parseTreeLines(treeLines);
      const featureModules = detectFeatureModules(treeLines);
      const sharedModules = detectSharedModules(treeLines);

      console.info(`INFO: Folder structure extracted from STRUCTURE.md (GSD). ${featureModules.length} feature module(s) and ${sharedModules.length} shared module(s) detected.`);
      return { tree, source: "gsd", featureModules, sharedModules };
    }

    // STRUCTURE.md exists but has no code block — try parsing from raw body text
    const bodyTree = parseTreeFromRawBody(allBody);
    if (Object.keys(bodyTree).length > 0) {
      return { tree: bodyTree, source: "gsd", featureModules: detectFeatureModules(allBody), sharedModules: detectSharedModules(allBody) };
    }
  }

  // ── PRIORITY 2: Fall back to constitution section ──────────────────────────
  if (constitutionSection) {
    console.warn("WARN: Folder structure resolved from README/constitution, not STRUCTURE.md (GSD). Codebase-derived structure is more reliable.");
    const treeLines = extractCodeBlock(constitutionSection.bodyLines);
    if (!treeLines.length) {
      return { tree: {}, source: "constitution", featureModules: [], sharedModules: [] };
    }
    return { tree: parseTreeLines(treeLines), source: "constitution", featureModules: [], sharedModules: [] };
  }

  return { tree: {}, source: "constitution", featureModules: [], sharedModules: [] };
}

function detectFeatureModules(lines: string[]): string[] {
  const features: string[] = [];
  for (const line of lines) {
    // Match feature/ or features/ directory entries
    const match = line.match(/(?:feature|features|modules?)\/(\w[\w-]*)/i);
    if (match && match[1]) features.push(match[1]);
  }
  return [...new Set(features)];
}

function detectSharedModules(lines: string[]): string[] {
  const shared: string[] = [];
  for (const line of lines) {
    const match = line.match(/(?:shared|core|common|utils)\/(\w[\w-]*)/i);
    if (match && match[1]) shared.push(match[1]);
  }
  return [...new Set(shared)];
}
```

**Quality check:** If neither STRUCTURE.md nor constitution contains a fenced code block → add a WARN: `"Folder structure not found in STRUCTURE.md or constitution. Scaffolding skills will lack layout guidance."`

**Folder naming convention extraction:** After parsing the directory tree, scan the tree lines for the canonical casing of the `usecases` subfolder under `domain/`:
- If any tree line contains `domain/useCases` (camelCase C) → set `folderConventions.usecasesFolderName: "useCases"`
- If any tree line contains `domain/usecases` (all lowercase) → set `folderConventions.usecasesFolderName: "usecases"`
- If neither is found → set `folderConventions.usecasesFolderName: null` and add a WARN: `"Folder tree does not declare a 'domain/usecases' or 'domain/useCases' path. The Final Validator will not enforce casing for the use-cases folder."`
- If both `domain/useCases` and `domain/usecases` appear in the same tree → **FAIL**: `"FATAL: Folder tree contains both 'domain/usecases' and 'domain/useCases'. Choose one canonical casing and update the source before proceeding."`

**Rule:** `folderConventions.usecasesFolderName` is read verbatim from the source's folder tree (STRUCTURE.md or constitution). The Final Validator MUST NOT hardcode either casing — it must consume this value from the config.

---

## Step 8 — Assemble and Return the Config (GSD-Enriched)

Combine all extracted artefacts — GSD-sourced and constitution-sourced — into the canonical output shape. Track provenance for every field. Run completeness validation before returning.

```ts
// constitution-reader/assembleConfig.ts

export interface FolderConventions {
  usecasesFolderName: "useCases" | "usecases" | null;  // Extracted from folder tree
}

export interface ConstitutionConfig {
  // ── Core architecture (from GSD ARCHITECTURE.md or constitution) ────────────
  architecture: ArchitectureConfig;
  layers: LayerDefinition[];
  rules: ArchitectureRule[];

  // ── Tech stack (from GSD STACK.md or constitution) ──────────────────────────
  techStack: TechStackConfig;

  // ── Folder structure (from GSD STRUCTURE.md or constitution) ────────────────
  folderStructure: FolderNode;
  folderConventions: FolderConventions;
  featureModules: string[];      // feature/module names detected from STRUCTURE.md
  sharedModules: string[];       // shared/core module names

  // ── API endpoints (from GSD INTEGRATIONS.md → README → constitution) ───────
  apiEndpoints: DeclaredApiEndpoint[];

  // ── GSD-EXCLUSIVE FIELDS (only available from codebase analysis) ────────────
  concerns: CodebaseConcern[];   // from CONCERNS.md — anti-patterns to NOT replicate
  conventions: ConventionRule[]; // from CONVENTIONS.md — naming and coding rules
  testingConfig: TestingConfig | null;  // from TESTING.md — test framework and coverage

  // ── Provenance tracking ────────────────────────────────────────────────────
  gsdArtifactsLoaded: GsdArtifactName[];   // which GSD artifacts were found and loaded
  gsdArtifactsMissing: GsdArtifactName[];  // which GSD artifacts were not found
  primarySource: "gsd" | "constitution" | "mixed";  // overall provenance

  // ── Violations ─────────────────────────────────────────────────────────────
  violations: Violation[];
}

export interface ConventionRule {
  id: string;
  category: "naming" | "imports" | "formatting" | "structure" | "testing" | "other";
  description: string;
  source: "gsd-conventions" | "constitution";
}

export interface TestingConfig {
  framework: string;
  coverageThreshold: Record<string, number>;
  testPatterns: string[];
  source: "gsd-testing" | "pipeline-default";
}

export function assembleConfig(parts: {
  architecture: ArchitectureConfig;
  rules: ArchitectureRule[];
  techStack: TechStackConfig;
  folderStructure: FolderStructureResult;
  apiEndpoints: DeclaredApiEndpoint[];
  concerns: CodebaseConcern[];
  conventions: ConventionRule[];
  testingConfig: TestingConfig | null;
  gsdArtifacts: GsdArtifacts;
  violations: Violation[];
}): ConstitutionConfig {

  // Determine overall primary source
  const gsdCount = parts.gsdArtifacts.foundCount;
  const primarySource: ConstitutionConfig["primarySource"] =
    gsdCount >= 5 ? "gsd" :
    gsdCount >= 1 ? "mixed" :
    "constitution";

  const config: ConstitutionConfig = {
    architecture: parts.architecture,
    layers: parts.architecture.layers,
    rules: parts.rules,
    techStack: parts.techStack,
    folderStructure: parts.folderStructure.tree,
    folderConventions: extractFolderConventions(parts.folderStructure),
    featureModules: parts.folderStructure.featureModules,
    sharedModules: parts.folderStructure.sharedModules,
    apiEndpoints: parts.apiEndpoints,
    concerns: parts.concerns,
    conventions: parts.conventions,
    testingConfig: parts.testingConfig,
    gsdArtifactsLoaded: GSD_ARTIFACT_NAMES.filter((n) => parts.gsdArtifacts.files[n] !== null),
    gsdArtifactsMissing: parts.gsdArtifacts.missingArtifacts,
    primarySource,
    violations: parts.violations,
  };

  // Emit summary
  console.info(`CONFIG ASSEMBLED — Primary source: ${primarySource}. ` +
    `GSD artifacts loaded: ${config.gsdArtifactsLoaded.length}/7. ` +
    `Concerns (anti-patterns): ${config.concerns.length}. ` +
    `Rules: ${config.rules.length} (${config.rules.filter(r => r.fromConcerns).length} from CONCERNS.md). ` +
    `API endpoints: ${config.apiEndpoints.length}.`);

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

**Rule:** The assembled config is immutable from this point. Downstream skills read from it; they must never mutate or patch it. The `concerns[]` array is passed to every downstream skill so they can check whether a pattern they are about to generate matches a known anti-pattern from the real codebase.

---

## Step 9 — Validate the Config (GSD-Aware)

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
- [ ] **GSD CHECKS (new):**
- [ ] `gsdArtifactsLoaded` contains at minimum: `ARCHITECTURE.md`, `STRUCTURE.md`, `CONCERNS.md`
- [ ] `concerns[]` is non-empty (CONCERNS.md yielded at least one anti-pattern)
- [ ] Every concern in `concerns[]` has `doNotReplicate: true`
- [ ] `architecture.source` is `"gsd"` (architecture came from codebase analysis, not README)
- [ ] If `primarySource` is `"mixed"` or `"constitution"` → WARN for each GSD-missing domain: `"Domain '{domain}' was resolved from README, not GSD. Codebase-derived data is more reliable."`
- [ ] No `rules[]` entry from `"constitution"` source conflicts with a `"gsd-*"` source rule on the same topic
- [ ] `apiEndpoints[]` source tracking is consistent — all endpoints come from the same priority level
- [ ] If any `concerns[]` entry has `severity: "CRITICAL"` → verify it is propagated as a `MUST_NOT` rule in `rules[]`

---

## File Layout Reference

```
constitution-reader/
├── index.ts                    ← Orchestrator: runs steps 0–9 in order
├── loadGsdArtifacts.ts         ← Step 0: GSD artifact discovery and loading
├── parseGsdArtifacts.ts        ← Step 0b: GSD markdown → SectionNode[] per artifact
├── extractConcerns.ts          ← Step 0c: CONCERNS.md → CodebaseConcern[]
├── parseHeadings.ts            ← Step 2: markdown → SectionNode[]
├── sectionMatcher.ts           ← Step 3: GSD-first section resolution
├── extractArchitecture.ts      ← Step 4: GSD ARCHITECTURE.md → pattern + layers
├── extractRules.ts             ← Step 5: GSD + CONCERNS.md → rules[]
├── extractTechStack.ts         ← Step 6: GSD STACK.md → library + design system config
├── extractApiEndpoints.ts      ← Step 6b: GSD INTEGRATIONS.md → endpoint declarations
├── extractFolderStructure.ts   ← Step 7: GSD STRUCTURE.md → FolderNode
├── assembleConfig.ts           ← Step 8: final assembly + fatal gate + provenance
├── errors.ts                   ← ConstitutionFatalError, Violation types
└── __tests__/
    ├── loadGsdArtifacts.test.ts
    ├── extractConcerns.test.ts
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
| **GSD-first, always** | GSD codebase artifacts are the primary source of truth. README/constitution is a fallback for gaps only. GSD reflects actual codebase behavior; README reflects documented intent. |
| **CONCERNS.md is a blacklist** | Every item in CONCERNS.md describes a pattern to NOT replicate. These become MUST_NOT rules passed to all downstream skills. |
| **Provenance tracking** | Every extracted field records its source (`"gsd"` vs `"constitution"`). Conflicts are resolved in favor of GSD with a WARN emitted. |
| No hallucination | Every output field is traced to an explicit line in a GSD artifact or constitution; nothing is inferred or defaulted silently |
| Deterministic extraction | Given the same input documents, the output config must be byte-for-byte identical across runs |
| Fail fast on fatal gaps | Missing ARCHITECTURE.md, STRUCTURE.md, or CONCERNS.md are FATALs — the skill halts rather than producing a corrupt config |
| WARN, don't silence | Ambiguous or missing non-critical sections produce violations in the output, never silent defaults |
| Immutable output | The assembled config is written once and treated as read-only by all downstream skills |
| Verbatim rules | Rule descriptions are copied exactly from the source document — no paraphrasing that could shift meaning |
| Single source of truth | All other skills import from `constitution.config.json`; none re-parse the markdown independently |
| **Anti-pattern guard** | Downstream skills must check `concerns[]` before generating any code pattern. If a generated pattern matches a known concern, the skill must choose an alternative and emit a WARN. |
