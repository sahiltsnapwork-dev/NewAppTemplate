---
name: typescript-enforcer
description: "MUST be used after any code generation skill produces TypeScript/TSX files and before the Final Validator runs. Use when: generated files contain 'any', 'unknown', or implicit types; unsafe type assertions are detected; non-null assertions appear without justification; optional chaining is absent where null/undefined is possible; readability or performance improvements are required. Keywords: TypeScript strict, fix types, remove any, type safety, null safety, undefined guard, optional chaining, type assertion, readability, performance, tsconfig strict, implicit return type, type widening, unsafe cast."
priority: HIGH
auto-trigger: true
---

# TypeScript Enforcer

> This skill runs after all code generation skills and before the Final Validator. It is the last chance to eliminate unsafe types, tighten null/undefined handling, improve readability, and apply micro-level performance fixes before the feature is gated. If any unsafe type remains after this skill runs, it is a FATAL that the Final Validator will also catch. Fix it here — not there.

## The Enforcement Contract

This skill operates in three passes over every generated TypeScript/TSX file:

| Pass | What it does |
|------|-------------|
| **Type Safety Pass** | Finds and replaces `any`, unsafe casts, missing return types, unguarded nullability |
| **Readability Pass** | Simplifies verbose patterns, removes dead code, enforces consistent naming conventions |
| **Performance Pass** | Detects and rewrites patterns with known RN runtime cost (inline object creation in render, missing `useCallback`/`useMemo`, large array operations without memoization) |

A file that was valid before this skill ran must still be valid after. This skill never changes behavior — only types, clarity, and efficiency.

---

## Step 1 — Receive and Validate Input

Accept the set of generated TypeScript/TSX files and the project's tsconfig strict settings.

**Input schema:**

```json
{
  "files": [
    { "path": "string", "content": "string", "layer": "presentation | domain | data | state | shared | navigation" }
  ],
  "tsconfig": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  },
  "options": {
    "fixTypes": true,
    "fixReadability": true,
    "fixPerformance": true,
    "autoFix": true
  }
}
```

**Decision point:**
- If `files` is empty → **FAIL**: `"FATAL: No files provided. Nothing to enforce."`
- If `tsconfig.strict` is `false` → **FAIL**: `"FATAL: tsconfig.strict must be true. This project requires full strict mode. Set 'strict: true' in tsconfig.json and do not override with individual compiler options."`
- If `tsconfig.strictNullChecks` is explicitly `false` → **FAIL**: `"FATAL: strictNullChecks cannot be disabled. Null safety is mandatory."`
- `options.autoFix: true` means the skill rewrites the file content in-place. `autoFix: false` means it only reports violations without editing — useful for audit mode.

**Rule:** This skill works on file content strings. It does not invoke the TypeScript compiler directly. All checks are AST-level pattern matching or regex heuristics applied at line granularity. Any finding that cannot be fixed with certainty without changing runtime behavior is reported as a WARN, not auto-fixed.

---

## Step 2 — Scan for Unsafe Type Patterns

Perform a full scan of every file to build the complete violation inventory before any fix is applied. Never fix-and-scan interleaved — scan everything first.

```ts
// typescript-enforcer/scanUnsafeTypes.ts

export const UNSAFE_TYPE_PATTERNS: Array<{
  id: string;
  pattern: RegExp;
  severity: "FATAL" | "WARN";
  description: string;
  autoFixable: boolean;
}> = [
  // ─── any ───────────────────────────────────────────────────────────────────
  { id: "no-explicit-any",       pattern: /:\s*any\b/,                             severity: "FATAL", description: "Explicit 'any' type annotation",                        autoFixable: false },
  { id: "no-any-cast",           pattern: /as\s+any\b/,                            severity: "FATAL", description: "Unsafe cast to 'any'",                                 autoFixable: false },
  { id: "no-any-array",          pattern: /Array<any>/,                            severity: "FATAL", description: "Array<any> — provide a concrete element type",          autoFixable: false },
  { id: "no-any-generic",        pattern: /<any>/,                                 severity: "FATAL", description: "Generic type parameter 'any'",                          autoFixable: false },

  // ─── unknown without narrowing ─────────────────────────────────────────────
  { id: "unnarrowed-unknown",    pattern: /catch\s*\(\s*\w+\s*\)\s*\{(?![^}]*typeof|[^}]*instanceof|[^}]*ErrorType)/, severity: "WARN", description: "catch block uses unnarrowed caught value — narrow with instanceof or typeof before use", autoFixable: false },

  // ─── non-null assertion ────────────────────────────────────────────────────
  { id: "non-null-assertion",    pattern: /\w+!/,                                  severity: "WARN",  description: "Non-null assertion '!' — use optional chaining or a guard", autoFixable: false },

  // ─── unsafe index access ───────────────────────────────────────────────────
  { id: "unsafe-index-access",   pattern: /\[[^\]]+\]\s*(?!\?|as\s)/,             severity: "WARN",  description: "Unchecked index access — may be undefined when noUncheckedIndexedAccess is enabled", autoFixable: false },

  // ─── missing return types ──────────────────────────────────────────────────
  { id: "implicit-return-type",  pattern: /^(export\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)\s*\{/, severity: "WARN",  description: "Function missing explicit return type annotation",    autoFixable: false },
  { id: "arrow-implicit-return", pattern: /const\s+\w+\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*\{(?!\s*\/\/\s*@returns)/, severity: "WARN", description: "Arrow function missing return type — add ': ReturnType' after parameter list", autoFixable: false },

  // ─── object spread type loss ───────────────────────────────────────────────
  { id: "object-spread-any",     pattern: /\.\.\.(action\.payload|response\.data|props)\b/, severity: "WARN",  description: "Spreading a value whose type may not be fully known — assign to a typed const first", autoFixable: false },

  // ─── type assertion widening ───────────────────────────────────────────────
  { id: "double-cast",           pattern: /as\s+unknown\s+as\b/,                  severity: "FATAL", description: "Double cast 'as unknown as T' — indicates a type lie; fix the upstream type instead", autoFixable: false },

  // ─── Record<string, any> ───────────────────────────────────────────────────
  { id: "record-any-value",      pattern: /Record<string,\s*any>/,                severity: "FATAL", description: "Record<string, any> — provide a concrete value type",    autoFixable: false },

  // ─── Function type ─────────────────────────────────────────────────────────
  { id: "function-type",         pattern: /:\s*Function\b/,                       severity: "FATAL", description: "Bare 'Function' type — use a typed function signature e.g. () => void", autoFixable: false },

  // ─── Object type ───────────────────────────────────────────────────────────
  { id: "object-type",           pattern: /:\s*Object\b/,                         severity: "FATAL", description: "Bare 'Object' type — use 'object', a specific interface, or 'Record<K,V>'", autoFixable: false },
];

export interface TypeViolation {
  fileId: string;
  filePath: string;
  line: number;
  column: number;
  ruleId: string;
  severity: "FATAL" | "WARN";
  description: string;
  snippet: string;
  autoFixable: boolean;
}

export function scanUnsafeTypes(files: GeneratedFile[]): TypeViolation[] {
  const violations: TypeViolation[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip comment lines
      if (/^\s*(\/\/|\/\*|\*)/.test(line)) continue;

      for (const rule of UNSAFE_TYPE_PATTERNS) {
        const match = rule.pattern.exec(line);
        if (match) {
          violations.push({
            fileId: file.path,
            filePath: file.path,
            line: i + 1,
            column: match.index + 1,
            ruleId: rule.id,
            severity: rule.severity,
            description: rule.description,
            snippet: line.trim(),
            autoFixable: rule.autoFixable,
          });
        }
      }
    }
  }

  return violations;
}
```

**Quality check:** After scan, count FATAL violations. If `fatals > 0` and `autoFix: false`, the skill immediately returns the violation report without proceeding to fix passes. Auto-fix mode proceeds even with FATALs, but non-fixable FATALs remain in the output.

---

## Step 3 — Fix Null and Undefined Safety

Apply null/undefined safety fixes. This is the highest-priority fix pass because missing null guards produce runtime crashes that TypeScript strict mode is specifically designed to prevent.

```ts
// typescript-enforcer/fixNullSafety.ts

export const NULL_SAFETY_TRANSFORMS: Array<{
  id: string;
  name: string;
  detect: RegExp;
  transform: (line: string, match: RegExpExecArray) => string;
  note: string;
}> = [
  {
    // item.prop → item?.prop (when item could be undefined/null based on context)
    id: "optional-chain-property",
    name: "Missing optional chain on nullable property access",
    detect: /(\w+)\.(\w+)(?!\?)/,
    transform: (line, match) => line, // cannot auto-transform without type info — reported as WARN only
    note: "Cannot auto-fix: requires type context. Review and add '?.' where the receiver may be null/undefined.",
  },
  {
    // array[0] → array[0] ?? fallback (reported as WARN when noUncheckedIndexedAccess is on)
    id: "unchecked-indexed-access",
    name: "Array index access without undefined guard",
    detect: /const\s+(\w+)\s*=\s*(\w+)\[(\d+)\](?!\s*\?\?|\s*!)/,
    transform: (line, match) => {
      // Example: const item = arr[0] → const item = arr[0] ?? undefined
      return line.replace(
        /const\s+(\w+)\s*=\s*(\w+)\[(\d+)\]/,
        (_, varName, arrName, idx) => `const ${varName} = ${arrName}[${idx}] ?? undefined`
      );
    },
    note: "Added '?? undefined' to acknowledge the value may be undefined per noUncheckedIndexedAccess.",
  },
  {
    // catch (e) { ... e.message } → catch (e) { if (e instanceof Error) { ... e.message } }
    id: "narrow-catch-error",
    name: "Unnarrowed catch parameter used as Error",
    detect: /catch\s*\(\s*(\w+)\s*\)[\s\S]*?\1\.(message|stack|name)/,
    transform: (line, match) => line, // multi-line transform — flagged as WARN, manual fix required
    note: "Cannot auto-fix: catch block is multi-line. Wrap body with: if (err instanceof Error) { ... }",
  },
  {
    // dispatch(action) where action could be null → guard with if (value != null)
    id: "nullable-dispatch-arg",
    name: "Dispatch called with potentially null argument",
    detect: /dispatch\(\w+\((\w+)\)\)(?!\s*\/\/\s*@nullable-ok)/,
    transform: (line, match) => line,
    note: "Verify the dispatch argument is defined before the call. Annotate with // @nullable-ok to suppress.",
  },
];

export function fixNullSafety(
  file: GeneratedFile,
  violations: TypeViolation[]
): { content: string; appliedFixes: string[]; remainingViolations: TypeViolation[] } {
  let content = file.content;
  const appliedFixes: string[] = [];
  const remainingViolations: TypeViolation[] = [];

  const lines = content.split("\n");

  for (const transform of NULL_SAFETY_TRANSFORMS) {
    for (let i = 0; i < lines.length; i++) {
      const match = transform.detect.exec(lines[i]);
      if (!match) continue;

      const transformed = transform.transform(lines[i], match);
      if (transformed !== lines[i]) {
        appliedFixes.push(`Line ${i + 1}: [${transform.id}] ${transform.name}`);
        lines[i] = transformed;
      } else if (transformed === lines[i] && match) {
        // Could not auto-fix — preserve as violation
        remainingViolations.push({
          fileId: file.path,
          filePath: file.path,
          line: i + 1,
          column: match.index + 1,
          ruleId: transform.id,
          severity: "WARN",
          description: transform.note,
          snippet: lines[i].trim(),
          autoFixable: false,
        });
      }
    }
  }

  return { content: lines.join("\n"), appliedFixes, remainingViolations };
}
```

**Decision point:**
- If `noUncheckedIndexedAccess` is enabled and there are index accesses without `?? fallback` — add `?? undefined` to acknowledge the possible undefined. Do not guess a "better" default value.
- If a `catch` block uses the caught value as `Error` without narrowing — flag as WARN. Cannot auto-fix multi-line catch blocks.
- If the parameter is typed non-nullable but is being called with a nullable value — flag as FATAL.

---

## Step 4 — Fix Explicit `any` and Widen to Concrete Types

Where `any` appears with enough local context to infer a concrete type, replace it. Where context is insufficient, flag as FATAL (cannot safely auto-fix).

```ts
// typescript-enforcer/fixAnyTypes.ts

export const ANY_INFERENCE_RULES: Array<{
  id: string;
  detect: RegExp;
  infer: (line: string, match: RegExpExecArray, fileContent: string) => string | null;
  note: string;
}> = [
  {
    // useState<any> → useState<T> inferred from initial value
    id: "fix-usestate-any",
    detect: /useState<any>\(([^)]+)\)/,
    infer: (line, match) => {
      const initial = match[1].trim();
      if (initial === "null")    return line.replace("useState<any>", "useState<null>");
      if (initial === "[]")      return line.replace("useState<any>", "useState<unknown[]>");
      if (initial === "{}")      return line.replace("useState<any>", "useState<Record<string, unknown>>");
      if (/^\d+$/.test(initial)) return line.replace("useState<any>", "useState<number>");
      if (/^['"]/.test(initial)) return line.replace("useState<any>", "useState<string>");
      if (initial === "false" || initial === "true") return line.replace("useState<any>", "useState<boolean>");
      return null; // Cannot infer — leave as FATAL
    },
    note: "useState<any> replaced with inferred primitive type. If a richer type is needed, replace with the exact interface.",
  },
  {
    // catch (e: any) → catch (e: unknown)
    id: "fix-catch-any",
    detect: /catch\s*\(\s*(\w+)\s*:\s*any\s*\)/,
    infer: (line, match) => line.replace(/catch\s*\(\s*(\w+)\s*:\s*any\s*\)/, `catch ($1: unknown)`),
    note: "Replaced 'catch (e: any)' with 'catch (e: unknown)'. Narrow with instanceof before use.",
  },
  {
    // (event: any) in RN event handlers → concrete event types
    id: "fix-rn-event-handler",
    detect: /\(\s*(\w+)\s*:\s*any\s*\).*=>\s*\{/,
    infer: (line, match) => {
      if (/onPress/.test(line))      return line.replace(/(\w+)\s*:\s*any/, "$1: GestureResponderEvent");
      if (/onChangeText/.test(line)) return line.replace(/(\w+)\s*:\s*any/, "$1: string");
      if (/onScroll/.test(line))     return line.replace(/(\w+)\s*:\s*any/, "$1: NativeSyntheticEvent<NativeScrollEvent>");
      if (/onChange/.test(line))     return line.replace(/(\w+)\s*:\s*any/, "$1: NativeSyntheticEvent<TextInputChangeEventData>");
      return null;
    },
    note: "Replaced 'any' in RN event handler with concrete React Native event type.",
  },
  {
    // Promise<any> → Promise<unknown>
    id: "fix-promise-any",
    detect: /Promise<any>/,
    infer: (line) => line.replace(/Promise<any>/g, "Promise<unknown>"),
    note: "Replaced Promise<any> with Promise<unknown>. Narrow the resolved value before use.",
  },
  {
    // : any[] → : unknown[]
    id: "fix-any-array",
    detect: /:\s*any\[\]/,
    infer: (line) => line.replace(/:\s*any\[\]/g, ": unknown[]"),
    note: "Replaced 'any[]' with 'unknown[]'. Narrow elements before use.",
  },
];

export function fixAnyTypes(
  file: GeneratedFile
): { content: string; appliedFixes: string[]; unresolvedFatals: TypeViolation[] } {
  let lines = file.content.split("\n");
  const appliedFixes: string[] = [];
  const unresolvedFatals: TypeViolation[] = [];

  for (const rule of ANY_INFERENCE_RULES) {
    for (let i = 0; i < lines.length; i++) {
      const match = rule.detect.exec(lines[i]);
      if (!match) continue;

      const fixed = rule.infer(lines[i], match, file.content);
      if (fixed !== null && fixed !== lines[i]) {
        appliedFixes.push(`Line ${i + 1}: [${rule.id}] ${rule.note}`);
        lines[i] = fixed;
      } else if (fixed === null) {
        unresolvedFatals.push({
          fileId: file.path,
          filePath: file.path,
          line: i + 1,
          column: match.index + 1,
          ruleId: rule.id,
          severity: "FATAL",
          description: `Cannot auto-fix 'any' at this location. Provide an explicit type. Context hint: ${rule.note}`,
          snippet: lines[i].trim(),
          autoFixable: false,
        });
      }
    }
  }

  return { content: lines.join("\n"), appliedFixes, unresolvedFatals };
}
```

**Rule:** `any` is never replaced with `object` or `{}`. These are nearly as unsafe. Valid replacements are: named interface, `unknown` (with downstream narrowing), a union type, or a generic parameter. If none can be inferred from local context, it is **always a FATAL** — the caller must provide the type.

---

## Step 5 — Apply Readability Improvements

Simplify verbose TypeScript patterns without changing semantics.

```ts
// typescript-enforcer/fixReadability.ts

export const READABILITY_TRANSFORMS: Array<{
  id: string;
  name: string;
  detect: RegExp;
  transform: (line: string) => string;
}> = [
  {
    // Boolean(x) → !!x  /  avoid double negation in conditions
    id: "simplify-boolean-cast",
    name: "Simplify Boolean() cast to boolean coercion",
    detect: /Boolean\((\w[\w.?]*)\)/,
    transform: (line) => line.replace(/Boolean\((\w[\w.?]*)\)/g, "!!$1"),
  },
  {
    // x !== null && x !== undefined → x != null
    id: "simplify-null-check",
    name: "Simplify explicit null+undefined check to != null",
    detect: /(\w+)\s*!==\s*null\s*&&\s*\1\s*!==\s*undefined/,
    transform: (line) =>
      line.replace(/(\w+)\s*!==\s*null\s*&&\s*\1\s*!==\s*undefined/g, "$1 != null"),
  },
  {
    // x === null || x === undefined → x == null
    id: "simplify-nullish-check",
    name: "Simplify explicit null+undefined check to == null",
    detect: /(\w+)\s*===\s*null\s*\|\|\s*\1\s*===\s*undefined/,
    transform: (line) =>
      line.replace(/(\w+)\s*===\s*null\s*\|\|\s*\1\s*===\s*undefined/g, "$1 == null"),
  },
  {
    // Array.isArray(x) ? x : [x]  → already wrapped pattern — flag as WARN not auto-fix
    id: "simplify-ternary-same-branch",
    name: "Ternary with identical true/false branches",
    detect: /\?([^:]+):\s*\1\s*$/,
    transform: (line) => line, // Just flags — identical branches can be replaced with the condition expression
  },
  {
    // interface Foo {} export type Bar = Foo → merge when single use
    // Cannot auto-detect single-use — flag as WARN only
    id: "redundant-type-alias",
    name: "Redundant type alias that re-exports an interface verbatim",
    detect: /export\s+type\s+\w+\s*=\s*\w+\s*;$/,
    transform: (line) => line, // Advisory only
  },
  {
    // .filter(Boolean) without type narrowing cast
    id: "filter-boolean-without-cast",
    name: "Array.filter(Boolean) loses undefined narrowing without explicit type cast",
    detect: /\.filter\(Boolean\)(?!\s*as\s)/,
    transform: (line) =>
      line.replace(/\.filter\(Boolean\)/g, ".filter((x): x is NonNullable<typeof x> => x != null)"),
  },
  {
    // var → const / let as appropriate (var is forbidden in strict TS)
    id: "no-var",
    name: "Replace 'var' with 'const' or 'let'",
    detect: /\bvar\s+\w+/,
    transform: (line) => line.replace(/\bvar\b/g, "const"),
  },
];

export function fixReadability(
  file: GeneratedFile
): { content: string; appliedFixes: string[] } {
  let lines = file.content.split("\n");
  const appliedFixes: string[] = [];

  for (const rule of READABILITY_TRANSFORMS) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(\/\/|\/\*|\*)/.test(lines[i])) continue;
      if (!rule.detect.test(lines[i])) continue;

      const transformed = rule.transform(lines[i]);
      if (transformed !== lines[i]) {
        appliedFixes.push(`Line ${i + 1}: [${rule.id}] ${rule.name}`);
        lines[i] = transformed;
      }
    }
  }

  return { content: lines.join("\n"), appliedFixes };
}
```

---

## Step 6 — Apply Performance Optimizations

Detect and rewrite known React Native render-time performance anti-patterns.

```ts
// typescript-enforcer/fixPerformance.ts

export const PERFORMANCE_PATTERNS: Array<{
  id: string;
  severity: "FATAL" | "WARN";
  name: string;
  detect: RegExp;
  autoFixable: boolean;
  suggestion: string;
}> = [
  {
    // Inline object literal as style prop: style={{ marginTop: 8 }}
    id: "inline-style-object",
    severity: "WARN",
    name: "Inline style object created on every render",
    detect: /style=\{\{[^}]+\}\}/,
    autoFixable: false,
    suggestion: "Move the style object to StyleSheet.create() outside the component body.",
  },
  {
    // Inline arrow function passed as prop: onPress={() => fn()}
    id: "inline-callback-prop",
    severity: "WARN",
    name: "Inline arrow function prop creates a new reference on every render",
    detect: /\bon\w+\s*=\s*\{\s*\([^)]*\)\s*=>/,
    autoFixable: false,
    suggestion: "Wrap with useCallback() and declare dependency array. Example: onPress={useCallback(() => fn(), [dep])}",
  },
  {
    // .map() inside JSX without key prop
    id: "map-missing-key",
    severity: "FATAL",
    name: ".map() inside JSX is missing a 'key' prop on the returned element",
    detect: /\.map\(\s*\([^)]*\)\s*=>\s*(?:<\w+|return\s+<\w+)(?![^>]*\bkey\s*=)/,
    autoFixable: false,
    suggestion: "Every element returned from .map() must have a unique 'key' prop.",
  },
  {
    // new Date() / Math.random() inside render
    id: "impure-render-expression",
    severity: "WARN",
    name: "Impure expression (new Date / Math.random) inside render body",
    detect: /\bnew Date\(\)|Math\.random\(\)/,
    autoFixable: false,
    suggestion: "Move to useMemo() or compute once outside the component.",
  },
  {
    // Large array sort/filter without useMemo
    id: "array-sort-without-memo",
    severity: "WARN",
    name: "Array .sort() or .filter() inside render without useMemo",
    detect: /(?<!\buseMemo\b[\s\S]{0,50})\.(sort|filter)\(/,
    autoFixable: false,
    suggestion: "Wrap expensive array operations with useMemo() to avoid re-computation on every render.",
  },
  {
    // JSON.stringify / JSON.parse inside render
    id: "json-in-render",
    severity: "WARN",
    name: "JSON.parse or JSON.stringify called inside render",
    detect: /JSON\.(parse|stringify)\(/,
    autoFixable: false,
    suggestion: "Move JSON operations to a useMemo() or outside the component. JSON operations in render are O(n) on every re-render.",
  },
  {
    // console.log left in production files
    id: "console-log",
    severity: "WARN",
    name: "console.log left in generated file",
    detect: /console\.log\(/,
    autoFixable: true,
    suggestion: "Remove console.log from production code.",
  },
  {
    // useSelector called inside a callback or effect dependency — causes re-renders
    id: "selector-in-callback",
    severity: "WARN",
    name: "useSelector called inside a useCallback or useEffect dependency — causes unnecessary re-renders",
    detect: /useCallback\s*\(\s*[^)]*useSelector|useEffect\s*\(\s*[^)]*useSelector/,
    autoFixable: false,
    suggestion: "Extract the useSelector call to the top level of the component. Store its result in a variable and reference that variable inside the callback/effect.",
  },
  {
    // Non-memoized selector passed as prop — creates new reference every render
    id: "non-memoized-selector-prop",
    severity: "WARN",
    name: "Derived data from useSelector passed as prop without memoization",
    detect: /useSelector\([^)]*\.map\(|useSelector\([^)]*\.filter\(|useSelector\([^)]*\.reduce\(/,
    autoFixable: false,
    suggestion: "Wrap the selector with createSelector() (reselect) or useMemo() to prevent a new array reference on every render. Raw .map()/.filter() in useSelector always produces a new reference.",
  },
  {
    // useState setter used directly as onPress/onChange prop without useCallback
    id: "setter-without-usecallback",
    severity: "WARN",
    name: "State setter passed directly as event prop creates stable reference but pattern is inconsistent",
    detect: /on(?:Press|Change(?:Text)?|Submit)\s*=\s*\{set\w+\}/,
    autoFixable: false,
    suggestion: "State setters are already stable references (React guarantees this). This pattern is acceptable, but if passing a composed function (e.g. () => setX(val)), wrap with useCallback.",
  },
  {
    // useEffect with empty deps but uses props/state inside — stale closure
    id: "stale-closure-effect",
    severity: "WARN",
    name: "useEffect with empty dependency array may have a stale closure over props or state",
    detect: /useEffect\s*\([^)]*=>[^}]*(?:dispatch|navigation|props\.|state\.)[^}]*\},\s*\[\s*\]\s*\)/,
    autoFixable: false,
    suggestion: "If the effect uses props, state, or dispatch, add them to the dependency array. An empty [] with external references is a stale closure bug.",
  },
];

export function fixPerformance(
  file: GeneratedFile
): { content: string; appliedFixes: string[]; remainingViolations: TypeViolation[] } {
  let lines = file.content.split("\n");
  const appliedFixes: string[] = [];
  const remainingViolations: TypeViolation[] = [];

  for (const rule of PERFORMANCE_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(\/\/|\/\*|\*)/.test(lines[i])) continue;
      const match = rule.detect.exec(lines[i]);
      if (!match) continue;

      if (rule.autoFixable) {
        if (rule.id === "console-log") {
          appliedFixes.push(`Line ${i + 1}: [${rule.id}] Removed console.log`);
          lines[i] = lines[i].replace(/\s*console\.log\([^)]*\);?/, "");
        }
      } else {
        remainingViolations.push({
          fileId: file.path,
          filePath: file.path,
          line: i + 1,
          column: match.index + 1,
          ruleId: rule.id,
          severity: rule.severity,
          description: `${rule.name}. ${rule.suggestion}`,
          snippet: lines[i].trim(),
          autoFixable: false,
        });
      }
    }
  }

  return { content: lines.join("\n"), appliedFixes, remainingViolations };
}
```

---

## Step 6b — Validate Module Resolution and Missing Type Definitions

After per-file fix passes, scan all generated import statements to detect paths that will fail to resolve and packages that lack type definitions.

```ts
// typescript-enforcer/validateModuleResolution.ts

export interface ModuleResolutionIssue {
  filePath: string;
  line: number;
  importPath: string;
  severity: "FATAL" | "WARN";
  issueType: "unresolved-alias" | "missing-index" | "untyped-package" | "circular-import" | "wrong-extension";
  message: string;
  remediation: string;
}

const KNOWN_UNTYPED_PACKAGES: Record<string, string> = {
  "react-native-config":      "@types/react-native-config is not available; use module augmentation or declare module",
  "react-native-vector-icons": "@types/react-native-vector-icons — install or add a local declare",
  "react-native-svg":          "@types/react-native-svg — verify package ships its own types",
  "react-native-charts-wrapper": "No @types available — add a local declare module in src/@types/",
};

const PATH_ALIAS_PATTERN = /from\s+['"](@\/|~\/|#\/|src\/)([^'"]+)['"]/;
const RELATIVE_TS_EXTENSION = /from\s+['"][./][^'"]*\.(ts|tsx)['"]/;
const CIRCULAR_HINT_PATTERN = /from\s+['"]\.\/index['"]/;

export function validateModuleResolution(
  generatedFiles: GeneratedFile[],
  tsconfig: Record<string, unknown> | null
): ModuleResolutionIssue[] {
  const issues: ModuleResolutionIssue[] = [];
  const filePaths = new Set(generatedFiles.map((f) => f.path));
  const pathAliases = extractPathAliases(tsconfig);

  for (const file of generatedFiles) {
    const lines = file.content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // ── Check 1: Path alias used but not declared in tsconfig.paths ─────────
      const aliasMatch = PATH_ALIAS_PATTERN.exec(line);
      if (aliasMatch) {
        const prefix = aliasMatch[1]; // e.g. "@/"
        if (!pathAliases.has(prefix)) {
          issues.push({
            filePath: file.path,
            line: i + 1,
            importPath: aliasMatch[0],
            severity: "FATAL",
            issueType: "unresolved-alias",
            message: `Path alias '${prefix}' used in '${file.path}' but not declared in tsconfig.compilerOptions.paths. Import will fail at runtime.`,
            remediation: `Add "${prefix}*": ["./src/*"] (or your project root equivalent) to tsconfig.compilerOptions.paths. Also add the same mapping to babel.config.js module-resolver if using Metro.`,
          });
        }
      }

      // ── Check 2: Import with explicit .ts/.tsx extension ─────────────────────
      if (RELATIVE_TS_EXTENSION.test(line)) {
        issues.push({
          filePath: file.path,
          line: i + 1,
          importPath: line.trim(),
          severity: "WARN",
          issueType: "wrong-extension",
          message: `Import in '${file.path}' specifies a .ts/.tsx extension. TypeScript module resolution does not require extensions for .ts files and some bundlers reject them.`,
          remediation: `Remove the file extension from the import path. Use 'import X from './file'' not 'import X from './file.tsx''.`,
        });
      }

      // ── Check 3: Known untyped third-party packages ───────────────────────────
      for (const [pkg, hint] of Object.entries(KNOWN_UNTYPED_PACKAGES)) {
        if (line.includes(`from '${pkg}'`) || line.includes(`from "${pkg}"`)) {
          issues.push({
            filePath: file.path,
            line: i + 1,
            importPath: pkg,
            severity: "WARN",
            issueType: "untyped-package",
            message: `Package '${pkg}' imported in '${file.path}' may lack type definitions.`,
            remediation: hint,
          });
        }
      }

      // ── Check 4: Self-index circular import ───────────────────────────────────
      if (CIRCULAR_HINT_PATTERN.test(line)) {
        const dirOfFile = file.path.split("/").slice(0, -1).join("/");
        const indexPath = `${dirOfFile}/index.ts`;
        if (filePaths.has(indexPath) && file.path !== indexPath) {
          issues.push({
            filePath: file.path,
            line: i + 1,
            importPath: "./index",
            severity: "WARN",
            issueType: "circular-import",
            message: `'${file.path}' imports from './index' which may re-export '${file.path}' itself, creating a circular dependency.`,
            remediation: "Import directly from the specific file rather than via the barrel index to avoid circular references.",
          });
        }
      }
    }
  }

  return issues;
}

function extractPathAliases(
  tsconfig: Record<string, unknown> | null
): Set<string> {
  const aliases = new Set<string>(["./", "../", "react", "react-native"]);
  if (!tsconfig) return aliases;
  const paths = ((tsconfig["compilerOptions"] as Record<string, unknown>)?.["paths"]) as Record<string, unknown> | undefined;
  if (paths) {
    for (const key of Object.keys(paths)) {
      aliases.add(key.replace(/\*/g, "")); // "@/components/*" → "@/components/"
    }
  }
  return aliases;
}
```

**Decision point:**
- FATAL module resolution issues (unresolved aliases) → added to `enforcedFiles.issues[]` and set `valid: false`
- WARN issues (untyped packages, wrong extensions, potential circular imports) → included in `enforcedFiles.issues[]` but do not affect `valid`
- If `tsconfig` was not provided → skip path alias checks and emit WARN: `"tsconfig not available — path alias resolution checks skipped."`

---

## Step 7 — Validate That No Unsafe Types Remain

After all fix passes, re-run the Step 2 scanner against the updated file content. Any FATAL violations that survived fix attempts must halt the skill with a FAIL verdict.

```ts
// typescript-enforcer/revalidate.ts

export function revalidateAfterFixes(
  files: GeneratedFile[],
  previousAppliedFixes: Map<string, string[]>
): { allClear: boolean; remainingFatals: TypeViolation[] } {
  const remaining: TypeViolation[] = [];

  for (const file of files) {
    const violations = scanUnsafeTypes([file]);
    const fatals = violations.filter((v) => v.severity === "FATAL");
    remaining.push(...fatals);
  }

  return {
    allClear: remaining.length === 0,
    remainingFatals: remaining,
  };
}
```

Run through this checklist before returning:

- [ ] Full scan completed before any fixes were applied (scan-first, fix-second)
- [ ] All `any` occurrences resolved or flagged FATAL
- [ ] All `Function` and `Object` bare types resolved or flagged FATAL
- [ ] All double-casts (`as unknown as T`) flagged FATAL
- [ ] `catch` blocks that use the caught value narrowed or flagged WARN
- [ ] All inline style objects and callbacks flagged WARN with `useCallback`/`useMemo` suggestion
- [ ] `.map()` without `key` prop flagged FATAL
- [ ] `console.log` auto-removed
- [ ] `var` replaced with `const`
- [ ] `useSelector` with `.map()`/`.filter()` inside selector function flagged WARN (memoize with createSelector)
- [ ] `useEffect` with empty deps but using external references flagged WARN (stale closure)
- [ ] All path aliases validated against tsconfig.compilerOptions.paths (Step 6b)
- [ ] All imports with explicit `.ts/.tsx` extensions flagged WARN
- [ ] Known untyped packages flagged WARN with @types remediation guidance
- [ ] Potential circular self-index imports flagged WARN
- [ ] Re-validation scan confirms no FATAL unsafe type patterns remain in updated content
- [ ] `tsconfig.json` checked for deprecated options (Step 7b)
- [ ] Output `valid: false` if any FATAL remains after fixes; `valid: true` only when zero FATALs remain

---

## Step 7b — Audit tsconfig.json for Deprecated and Problematic Options

After per-file enforcement, scan the project's `tsconfig.json` for configuration-level issues that will cause warnings or future breakage. This step runs once per pipeline invocation, not per file.

```ts
// typescript-enforcer/auditTsconfig.ts

export interface TsconfigIssue {
  option: string;
  severity: "FATAL" | "WARN";
  message: string;
  remediation: string;
}

const TSCONFIG_CHECKS: Array<{
  optionPath: string;           // dot-path into compilerOptions
  detect: (value: unknown, compilerOptions: Record<string, unknown>) => boolean;
  issue: TsconfigIssue;
}> = [
  {
    // baseUrl is deprecated in TypeScript 6.0; will stop working in TypeScript 7.0
    optionPath: "compilerOptions.baseUrl",
    detect: (value, opts) =>
      typeof value === "string" &&
      !opts["ignoreDeprecations"],
    issue: {
      option: "baseUrl",
      severity: "WARN",
      message: "Option 'baseUrl' is deprecated in TypeScript 6.0 and will stop functioning in TypeScript 7.0. " +
               "Current tsconfig.json uses \"baseUrl\": \"./src\" without 'ignoreDeprecations'.",
      remediation: "Add \"ignoreDeprecations\": \"6.0\" to compilerOptions to silence the warning for now, " +
                   "or migrate path aliases: replace 'baseUrl' + 'paths' with TypeScript 7.0 path alias approach.",
    },
  },
  {
    // noImplicitAny must be true (strict mode requirement)
    optionPath: "compilerOptions.noImplicitAny",
    detect: (value) => value === false,
    issue: {
      option: "noImplicitAny",
      severity: "FATAL",
      message: "compilerOptions.noImplicitAny is false. This allows implicit 'any' which this enforcer treats as FATAL in source files.",
      remediation: "Set \"noImplicitAny\": true in tsconfig.json. If using 'strict: true' this is already inherited — remove the explicit false override.",
    },
  },
  {
    // strictNullChecks must be true
    optionPath: "compilerOptions.strictNullChecks",
    detect: (value) => value === false,
    issue: {
      option: "strictNullChecks",
      severity: "FATAL",
      message: "compilerOptions.strictNullChecks is false. Null safety is mandatory.",
      remediation: "Set \"strictNullChecks\": true or enable it via 'strict: true'.",
    },
  },
  {
    // allowJs without checkJs is a type-safety hole
    optionPath: "compilerOptions.allowJs",
    detect: (value, opts) => value === true && !opts["checkJs"],
    issue: {
      option: "allowJs",
      severity: "WARN",
      message: "compilerOptions.allowJs is true but checkJs is not enabled. JavaScript files are included but not type-checked.",
      remediation: "Add \"checkJs\": true alongside allowJs, or restrict allowJs to only the necessary files.",
    },
  },
  {
    // skipLibCheck: false would slow down CI — warn if explicitly set to false
    optionPath: "compilerOptions.skipLibCheck",
    detect: (value) => value === false,
    issue: {
      option: "skipLibCheck",
      severity: "WARN",
      message: "compilerOptions.skipLibCheck is false. This causes TypeScript to type-check all .d.ts files in node_modules, significantly slowing compilation.",
      remediation: "Set \"skipLibCheck\": true unless you are authoring a library and need declaration file validation.",
    },
  },
];

export function auditTsconfig(
  tsconfigContent: string,
  tsconfigPath: string
): TsconfigIssue[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(tsconfigContent);
  } catch {
    return [{
      option: "parse",
      severity: "FATAL",
      message: `Could not parse tsconfig.json at '${tsconfigPath}'. JSON syntax error.`,
      remediation: "Fix the JSON syntax error in tsconfig.json.",
    }];
  }

  const compilerOptions = (parsed["compilerOptions"] as Record<string, unknown>) ?? {};
  const issues: TsconfigIssue[] = [];

  for (const check of TSCONFIG_CHECKS) {
    const optionKey = check.optionPath.replace("compilerOptions.", "");
    const value = compilerOptions[optionKey];
    if (value !== undefined && check.detect(value, compilerOptions)) {
      issues.push(check.issue);
    }
  }

  return issues;
}
```

**Decision point:**
- If `tsconfig.json` is not included in the skill input → add a WARN: `"tsconfig.json not provided. Configuration-level type safety checks were skipped."` — do not FAIL; the per-file scans still run.
- If `tsconfig.json` has a FATAL issue → it is added to the overall violations list and sets `valid: false`.
- If `tsconfig.json` has only WARN issues → they are included in the output but do not affect `valid`.
- `baseUrl` deprecation is always a WARN (not a FATAL) — it will not break the build until TypeScript 7.0, but it must be acted on before upgrading.

---

## Step 8 — Produce Output

```ts
// typescript-enforcer/index.ts

export interface TypeScriptEnforcerResult {
  valid: boolean;
  files: Array<{
    path: string;
    content: string;             // Updated content (or original if autoFix: false)
    appliedFixes: string[];      // List of fix descriptions applied
  }>;
  issues: TypeViolation[];       // All remaining violations (FATAL + WARN)
  summary: {
    totalFiles: number;
    fixesApplied: number;
    fatalsRemaining: number;
    warningsRemaining: number;
  };
}
```

**Rule:** `valid: false` if `fatalsRemaining > 0`. A result with warnings but no fatals is `valid: true`. Warnings are advisory — they must be reviewed but do not block the pipeline.

---

## File Layout Reference

```
typescript-enforcer/
├── index.ts                        ← Orchestrator: steps 1–8
├── scanUnsafeTypes.ts              ← Step 2: full violation inventory scan
├── fixNullSafety.ts                ← Step 3: optional chaining, catch narrowing, index access
├── fixAnyTypes.ts                  ← Step 4: any → concrete type inference rules
├── fixReadability.ts               ← Step 5: null checks, Boolean(), filter(Boolean), var
├── fixPerformance.ts               ← Step 6: inline styles, callbacks, map key, re-render patterns
├── validateModuleResolution.ts     ← Step 6b: import path aliases, .ts extensions, untyped packages
├── revalidate.ts                   ← Step 7: post-fix re-scan for surviving FATALs
├── auditTsconfig.ts                ← Step 7b: tsconfig deprecated/invalid options check
├── errors.ts                       ← TypeViolation, TypeScriptEnforcerResult types
└── __tests__/
    ├── scanUnsafeTypes.test.ts
    ├── fixAnyTypes.test.ts
    ├── fixNullSafety.test.ts
    ├── fixPerformance.test.ts
    └── validateModuleResolution.test.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Scan before fix | A complete violation inventory is built before any fix is applied — no interleaved scan-and-fix |
| `any` is always FATAL | `any` is never silently allowed. Every occurrence resolves to a concrete type or remains a FATAL until manually fixed |
| No behavior changes | Fixes change types and syntax only. No logic, control flow, or values are altered by this skill |
| `unknown` over `any` | When a type cannot be inferred, the safe replacement is always `unknown` — never `any`, `object`, or `{}` |
| Non-null assertions are WARN | `!` is flagged but not auto-removed — it may be intentional. The developer decides |
| Readability is additive | Readability transforms are applied only when the result is strictly equivalent — no heuristic simplifications |
| Performance warnings are advisory | Performance issues are WARN only — they do not set `valid: false` unless they are also type violations (e.g., `.map()` without `key`) |
| Re-renders are surfaced | Patterns that cause unnecessary re-renders (non-memoized selectors with map/filter, inline callbacks, stale closures in effects) are always flagged with specific remediation guidance |
| Module resolution is mandatory | Unresolved path aliases are FATAL — they cause runtime import failures that TypeScript alone cannot always catch |
| Re-validation gates the output | After all fix passes, a re-scan confirms no FATALs remain. `valid: true` is only emitted when the re-scan is clean |
