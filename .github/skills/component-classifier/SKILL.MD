---
name: component-classifier
description: "MUST be used whenever parsed Flutter output needs to be mapped to clean architecture layers before any code generation, migration, or refactoring skill runs. Use when: classifying widgets, methods, state variables, API calls, and models into presentation/domain/data/state layers; detecting layer boundary violations such as business logic inside widgets or API calls inside domain classes; supplying a classified component map to downstream scaffolding or conversion skills. Keywords: component classifier, clean architecture, presentation layer, domain layer, data layer, state layer, flutter architecture, layer mapping, architecture classification, react native migration."
priority: HIGH
auto-trigger: true
---

# Component Classifier

> Trigger this skill **after** the Flutter Parser skill and **before** any skill that generates, scaffolds, or migrates code. The classification produced here defines which layer every component belongs to. Downstream skills must treat it as authoritative — they must never re-classify components independently.

## Step 1 — Receive and Validate Input

Accept the `parsedFlutter` object produced by the Flutter Parser skill and verify it is structurally complete before classifying anything:

- Confirm `parsedFlutter` is a non-null object
- Confirm at least one of `widgets`, `methods`, `stateVariables`, `apiCalls`, `navigation`, or `models` is a non-empty array
- Confirm the object contains no `violations[]` entries with `severity: "FATAL"` (a fatally incomplete parse must not be classified)
- Accept `existingComponentCatalog` from the pipeline context (Step 1b below) — this is the index of already-available RN components in the target project

**Decision point:**
- If `parsedFlutter` is null or missing → **FAIL**: `{ "violations": [{ "severity": "FATAL", "message": "Input 'parsedFlutter' is missing. Run the Flutter Parser skill first." }] }`
- If all six arrays are empty → **FAIL**: `"FATAL: All parsed arrays are empty. There is nothing to classify."`
- If `parsedFlutter.violations` contains any `FATAL` entries → **FAIL**: `"FATAL: Parser produced fatal violations. Resolve parsing errors before classifying."`
- If `parsedFlutter.violations` contains only `WARN` entries → continue, and carry those warnings forward into this skill's own `violations[]`

**Rule:** This skill is a pure classifier. It never calls the Flutter Parser skill itself, never reads source files, and never modifies the `parsedFlutter` input object.

---

## Step 1b — Load Existing Component Catalog

Before classifying any widget, check whether the target React Native project already contains reusable components that match the Flutter widgets being converted. This prevents unnecessary duplication of common UI components.

```ts
// component-classifier/loadExistingComponentCatalog.ts

export interface ExistingComponent {
  name: string;
  path: string;
  type: "button" | "text" | "checkbox" | "input" | "modal" | "card" | "list-item" | "header" | "badge" | "other";
  props: string[];   // known prop names (if extractable from file content)
}

export interface ComponentCatalog {
  components: ExistingComponent[];
  isEmpty: boolean;
}

export function loadComponentCatalog(
  pipelineExistingComponents: Array<{ name: string; path: string; type: string }>,
  targetProjectRnFiles: Array<{ path: string; content: string }>
): ComponentCatalog {
  // Start with explicitly provided catalog from pipeline input
  const catalogMap = new Map<string, ExistingComponent>(
    pipelineExistingComponents.map((c) => [
      c.name.toLowerCase(),
      { name: c.name, path: c.path, type: c.type as ExistingComponent["type"], props: [] },
    ])
  );

  // Supplement with auto-detected components from scanned RN files
  for (const file of targetProjectRnFiles.filter((f) => f.path.endsWith(".tsx") || f.path.endsWith(".jsx"))) {
    const componentNameMatch = /export\s+(default\s+)?(?:function|const)\s+(\w+)/.exec(file.content);
    if (!componentNameMatch) continue;

    const name = componentNameMatch[2];
    const key = name.toLowerCase();

    if (!catalogMap.has(key)) {
      const type = inferComponentType(name, file.content);
      const props = extractPropNames(file.content);
      catalogMap.set(key, { name, path: file.path, type, props });
    }
  }

  const components = Array.from(catalogMap.values());
  if (components.length > 0) {
    console.info(`INFO: Existing component catalog loaded: ${components.length} components available for reuse.`);
  }
  return { components, isEmpty: components.length === 0 };
}

function inferComponentType(name: string, content: string): ExistingComponent["type"] {
  const lower = name.toLowerCase();
  if (lower.includes("button") || lower.includes("btn"))        return "button";
  if (lower.includes("text") || lower.includes("label"))        return "text";
  if (lower.includes("checkbox") || lower.includes("check"))    return "checkbox";
  if (lower.includes("input") || lower.includes("field"))       return "input";
  if (lower.includes("modal") || lower.includes("dialog"))      return "modal";
  if (lower.includes("card"))                                   return "card";
  if (lower.includes("listitem") || lower.includes("list-item")) return "list-item";
  if (lower.includes("header") || lower.includes("appbar"))     return "header";
  if (lower.includes("badge") || lower.includes("chip"))        return "badge";
  // Content-based heuristics
  if (content.includes("onPress") && content.includes("Text"))  return "button";
  if (content.includes("TextInput"))                            return "input";
  return "other";
}

function extractPropNames(content: string): string[] {
  const match = /interface\s+\w+Props\s*\{([^}]+)\}/.exec(content);
  if (!match) return [];
  return [...match[1].matchAll(/(\w+)[\?:]:/g)].map((m) => m[1]);
}
```

**Decision point:**
- If `existingComponentCatalog` is empty AND `targetProjectRnFiles` contains no TSX/JSX files → emit WARN: `"No existing components found in the target project. All components will be generated from scratch."` and set `catalog.isEmpty = true`.
- If `catalog.isEmpty` is `false` → store the catalog in `classifiedComponents.existingComponentCatalog` so the Widget-to-JSX Converter can perform reuse lookups during node conversion.
- Never FAIL on an empty catalog — it is a valid state for new or boilerplate projects.

**Rule:** The catalog is loaded **once** and passed downstream as a read-only reference. No skill modifies the catalog — they only read from it to decide whether to reuse or generate.

---

## Step 2 — Load the Architecture Rule Set

Retrieve layer definitions and dependency rules from the Constitution config (produced by the README / Constitution Reader skill). Classification decisions must be grounded in the project's declared rules, not in generic heuristics.

```ts
// component-classifier/loadArchitectureRules.ts
import type { ConstitutionConfig, LayerDefinition } from "../constitution-reader/assembleConfig";

export interface ClassifierRuleSet {
  layers: LayerDefinition[];           // ordered: presentation → domain → data → state
  forbiddenCrossings: ForbiddenCrossing[];
  designSystemTokensOnly: boolean;
}

export interface ForbiddenCrossing {
  fromLayer: string;
  toLayer: string;
  description: string; // verbatim from constitution
}

export function loadRuleSet(config: ConstitutionConfig): ClassifierRuleSet {
  const forbiddenCrossings = config.rules
    .filter((r) => r.severity === "MUST_NOT")
    .map((r) => parseForbiddenCrossing(r));

  return {
    layers: config.layers,
    forbiddenCrossings,
    designSystemTokensOnly: config.techStack.designSystem.tokensOnly,
  };
}
```

**Decision point:**
- If constitution config is unavailable → **FAIL**: `"FATAL: Architecture rule set not loaded. Run the README / Constitution Reader skill before classifying."`
- If `config.layers` is empty → **FAIL**: `"FATAL: No layers declared in constitution. Classification is impossible without layer definitions."`

---

## Step 3 — Classify Widgets into the Presentation Layer

Every `WidgetNode` from `parsedFlutter.widgets` belongs in the presentation layer by default. Inspect each node's props and children for layer-boundary violations.

```ts
// component-classifier/classifyWidgets.ts

export interface PresentationComponent {
  name: string;
  type: "screen" | "component" | "layout" | "unknown";
  widgetNode: WidgetNode;
  violations: Violation[];
}

const SCREEN_SUFFIXES = ["Screen", "Page", "View"];
const LAYOUT_WIDGETS = [
  "Scaffold", "Column", "Row", "Stack", "Flex", "SliverList",
  "DraggableScrollableSheet",  // mini-quote / bottom sheet pattern
  "TabBarView", "TabBar",       // tab-based screen pattern
];

export function classifyWidgets(
  widgets: WidgetNode[],
  methods: MethodNode[]
): PresentationComponent[] {
  return widgets.map((w) => {
    const type = inferWidgetType(w.name);
    const violations = detectPresentationViolations(w, methods);
    return { name: w.name, type, widgetNode: w, violations };
  });
}

function inferWidgetType(name: string): PresentationComponent["type"] {
  if (SCREEN_SUFFIXES.some((s) => name.endsWith(s))) return "screen";
  if (LAYOUT_WIDGETS.includes(name)) return "layout";
  if (name[0] === name[0].toUpperCase()) return "component"; // PascalCase = custom widget
  return "unknown";
}
```

**Quality checks:**
- A widget tagged `type: "unknown"` must produce a WARN: `"Widget '{name}' could not be typed as screen, component, or layout. Review manually."`
- Navigation calls found inside a widget's props are acceptable (presentation concern); navigation calls inside a `WidgetNode` that also contains direct API call nodes are flagged as a violation (see Step 6)

---

## Step 4 — Classify Methods into Domain or Presentation

Methods are the highest-risk classification target — they can legally exist in any layer. Apply rules in priority order: API signals → state mutation signals → pure business logic → UI lifecycle → unclassified.

```ts
// component-classifier/classifyMethods.ts

export type MethodLayer = "domain" | "presentation" | "data" | "state" | "unclassified";

export interface ClassifiedMethod {
  methodNode: MethodNode;
  assignedLayer: MethodLayer;
  signals: string[];    // human-readable reasons for the assignment
  violations: Violation[];
}

// Signal sets (order = priority)
const API_SIGNALS    = ["http.", "dio.", "client.", ".fetch(", ".query(", ".mutate(", "await fetch",
                        "EventChannel(", "MethodChannel(", "invokeMethod("];  // platform channels = data layer
const STATE_SIGNALS  = ["setState(", "emit(", "notifyListeners(", ".state =", "store.dispatch"];
const DOMAIN_SIGNALS = ["validate", "calculate", "compute", "transform", "map(", "filter(", "reduce("];
const UI_SIGNALS     = ["build(", "showDialog", "showModalBottomSheet", "ScaffoldMessenger", "Navigator.",
                        "Shimmer."];  // loading animation = presentation layer concern

export function classifyMethod(method: MethodNode): ClassifiedMethod {
  const body = method.body.toLowerCase();
  const signals: string[] = [];
  let assignedLayer: MethodLayer = "unclassified";

  if (API_SIGNALS.some((s) => body.includes(s.toLowerCase()))) {
    assignedLayer = "data";
    signals.push("Contains API call pattern");
  } else if (STATE_SIGNALS.some((s) => body.includes(s.toLowerCase()))) {
    assignedLayer = "state";
    signals.push("Contains state mutation pattern");
  } else if (DOMAIN_SIGNALS.some((s) => body.includes(s.toLowerCase()))) {
    assignedLayer = "domain";
    signals.push("Contains business logic pattern");
  } else if (UI_SIGNALS.some((s) => body.includes(s.toLowerCase()))) {
    assignedLayer = "presentation";
    signals.push("Contains UI interaction pattern");
  }

  const violations = detectMethodViolations(method, assignedLayer, body);
  return { methodNode: method, assignedLayer, signals, violations };
}
```

**Decision point:**
- If a method matches signals from **two or more different layers** → assign the highest-priority layer (data > state > domain > presentation) AND add a WARN: `"Method '{name}' contains mixed-layer signals: [{signals}]. It should be decomposed."`
- If a method remains `"unclassified"` after all signal checks → add a WARN: `"Method '{name}' could not be assigned to any layer. Manual review required."`
- Never promote an unclassified method to domain or presentation by default

---

## Step 4b — Classify BLoC / Cubit Classes

Flutter applications using the BLoC pattern introduce classes that do not map to the standard widget/method/model categories. Without explicit classification, BLoC, Cubit, Event, and State classes are silently assigned to `"unclassified"`, producing incorrect or missing layer output in all downstream skills. This step runs immediately after method classification and before API call classification.

**Detection rules:** A class is a BLoC or Cubit if any of the following are true:
- Its name ends with `Bloc`, `Cubit`, `State`, or `Event`
- It extends `Bloc<E, S>`, `Cubit<S>`, `Equatable`, `HydratedBloc`, or `HydratedCubit`
- Its source file name ends with `_bloc.dart`, `_cubit.dart`, `_event.dart`, or `_state.dart`

```ts
// component-classifier/classifyBloc.ts

export type BlocRole = "bloc" | "cubit" | "event" | "state";

export interface BlocComponent {
  name: string;
  role: BlocRole;
  rnEquivalent: "redux-slice" | "async-thunk" | "action-type" | "state-interface";
  methods: ClassifiedMethod[];  // handler methods classified by Step 4 rules
  violations: Violation[];
}

const BLOC_SUFFIXES: Record<string, BlocRole> = {
  Bloc:  "bloc",
  Cubit: "cubit",
  Event: "event",
  State: "state",
};

const BLOC_BASE_CLASSES = ["Bloc", "Cubit", "HydratedBloc", "HydratedCubit", "Equatable"];

export function classifyBlocClasses(parsedFlutter: ParsedFlutter): BlocComponent[] {
  return parsedFlutter.classes
    .filter((cls) =>
      Object.keys(BLOC_SUFFIXES).some((suffix) => cls.name.endsWith(suffix)) ||
      BLOC_BASE_CLASSES.some((base) => cls.extendsName?.includes(base))
    )
    .map((cls) => {
      const role = inferBlocRole(cls);
      return {
        name: cls.name,
        role,
        rnEquivalent: mapBlocToRnEquivalent(role),
        methods: cls.methods.map(classifyMethod),
        violations: [],
      };
    });
}

function inferBlocRole(cls: ClassNode): BlocRole {
  for (const [suffix, role] of Object.entries(BLOC_SUFFIXES)) {
    if (cls.name.endsWith(suffix)) return role;
  }
  if (cls.extendsName?.includes("Cubit")) return "cubit";
  return "bloc";
}

function mapBlocToRnEquivalent(role: BlocRole): BlocComponent["rnEquivalent"] {
  if (role === "bloc" || role === "cubit") return "redux-slice";
  if (role === "event") return "action-type";
  if (role === "state") return "state-interface";
  return "redux-slice";
}
```

**Decision point:**
- If BLoC/Cubit classes are detected but `parsedFlutter.classes` is absent or empty → **FAIL**: `"FATAL: BLoC/Cubit classes found by signal matching but the parser did not produce a 'classes' array. Re-run the Flutter Parser with BLoC class extraction enabled."`
- BLoC classes containing `on<EventType>(handler)` registrations → classify each handler body using the standard method classifier (Step 4 rules); if API call signals are found inside a handler body → add a WARN: `"BLoC handler '{handlerName}' in '{blocName}' contains direct API call signals. BLoCs must delegate to repository methods, not call APIs directly."`
- If `BlocRole` cannot be determined → leave as `"bloc"` and add WARN: `"Class '{name}' could not be assigned a specific BLoC role. It will be treated as a BLoC (→ redux-slice) during conversion."`
- All detected BLoC components must be included in the classifier output as a dedicated `blocComponents[]` array alongside `widgets`, `methods`, and `models`. No BLoC component may remain `"unclassified"` in the final output.

**Rule:** The `blocComponents[]` array is passed to the Redux State Generator as its primary input. The Redux State Generator converts each `bloc`/`cubit` into a Redux slice, each `event` class into a discriminated union of action types, and each `state` class into a typed Redux state interface.

---

## Step 4c — Classify Controller Classes

Flutter MVC and GetX applications use `Controller` classes that are neither BLoC nor Cubit. Without explicit classification, any class ending in `Controller` that does not extend a BLoC/Cubit base class falls through all Step 4 signal checks and lands as `"unclassified"` — producing missing scaffolding in the converted output where controllers have no matching Redux or hook equivalent.

**Detection rules:** A class is a Controller if any of the following are true:
- Its name ends with `Controller`
- It extends `GetxController`, `GetxService`, `SuperController`, or `DisposableInterface`
- Its source file name ends with `_controller.dart`
- Its method list includes `onInit()`, `onReady()`, or `onClose()` (GetX lifecycle signals)

```ts
// component-classifier/classifyControllers.ts

export type ControllerType = "getx" | "mvc" | "unknown";

export interface ControllerComponent {
  name: string;
  controllerType: ControllerType;
  rnEquivalent: "redux-slice-with-thunks" | "custom-hook" | "unknown";
  methods: ClassifiedMethod[];   // each method classified by Step 4 rules
  violations: Violation[];
}

const GETX_BASE_CLASSES = ["GetxController", "GetxService", "SuperController", "DisposableInterface"];
const GETX_LIFECYCLE_METHODS = ["onInit", "onReady", "onClose"];

export function classifyControllerClasses(parsedFlutter: ParsedFlutter): ControllerComponent[] {
  return parsedFlutter.classes
    .filter((cls) =>
      cls.name.endsWith("Controller") ||
      GETX_BASE_CLASSES.some((base) => cls.extendsName?.includes(base))
    )
    .map((cls) => {
      const controllerType = inferControllerType(cls);
      return {
        name: cls.name,
        controllerType,
        rnEquivalent: controllerType === "getx" ? "redux-slice-with-thunks" : "custom-hook",
        methods: cls.methods.map(classifyMethod),
        violations: [],
      };
    });
}

function inferControllerType(cls: ClassNode): ControllerType {
  if (GETX_BASE_CLASSES.some((base) => cls.extendsName?.includes(base))) return "getx";
  if (cls.methods.some((m) => GETX_LIFECYCLE_METHODS.includes(m.name))) return "getx";
  if (cls.name.endsWith("Controller")) return "mvc";
  return "unknown";
}
```

**Decision point:**
- If Controller classes are detected but `parsedFlutter.classes` is empty → **FAIL**: `"FATAL: Controller classes found by file-name signal but the parser did not produce a 'classes' array. Re-run the Flutter Parser with class extraction enabled."`
- A Controller method that calls `Get.find<T>()` or `Get.put<T>()` → add a WARN: `"GetX dependency injection in '{methodName}' of '{controllerName}' uses Get.find/put. Replace with constructor injection in the converted Redux thunk or custom hook (see dependency-injector skill)."`
- A Controller method that calls `update()` (GetX UI rebuild trigger) → add a WARN: `"Method '{methodName}' calls update() — a GetX-specific rebuild trigger. Map to a Redux state mutation + useAppSelector in the converted code."`
- All detected Controller components must appear in the classification output as a `controllerComponents[]` array. No `Controller`-suffix class may remain `"unclassified"`.

**Rule:** GetX controllers (`controllerType: "getx"`) map to `"redux-slice-with-thunks"` — `onInit` maps to slice initialization, observable state fields map to Redux state fields, and reactive methods map to thunks. MVC controllers (`controllerType: "mvc"`) map to `"custom-hook"`. Both the Redux State Generator and the Widget-to-JSX Converter must receive `controllerComponents[]` alongside `blocComponents[]` to produce correct output.

---

## Step 5 — Classify API Calls into the Data Layer

Every `ApiCallNode` from `parsedFlutter.apiCalls` belongs in the data layer. Verify they are not embedded in presentation or domain methods.

```ts
// component-classifier/classifyApiCalls.ts

export interface DataComponent {
  name: string;             // constructed as "{containingMethod}::{library}.{method}"
  apiCallNode: ApiCallNode;
  containingLayer: MethodLayer; // layer of the method that houses this call
  violations: Violation[];
}

export function classifyApiCalls(
  apiCalls: ApiCallNode[],
  classifiedMethods: ClassifiedMethod[]
): DataComponent[] {
  return apiCalls.map((call) => {
    const containingMethod = classifiedMethods.find(
      (m) => m.methodNode.name === call.containingMethod
    );
    const containingLayer = containingMethod?.assignedLayer ?? "unclassified";
    const violations: Violation[] = [];

    if (containingLayer === "presentation") {
      violations.push({
        severity: "WARN",
        message: `API call in '${call.containingMethod}' is inside a presentation-layer method. Move to a repository or service.`,
      });
    }

    if (containingLayer === "domain") {
      violations.push({
        severity: "WARN",
        message: `API call in '${call.containingMethod}' is inside a domain-layer method. Domain must not depend on data sources directly.`,
      });
    }

    return {
      name: `${call.containingMethod}::${call.library}.${call.method}`,
      apiCallNode: call,
      containingLayer,
      violations,
    };
  });
}
```

**Rule:** An API call physically located inside a widget's `build` method or an event handler is always a violation — even if the method was classified as `"presentation"` only because it contains no other signals.

---

## Step 6 — Classify State Variables into the State Layer

Every `StateVariableNode` tagged to a `State<T>` class belongs in the state layer. Apply additional checks for variables that should be constants or that escape their scope.

```ts
// component-classifier/classifyStateVariables.ts

export interface StateComponent {
  name: string;
  stateVariableNode: StateVariableNode;
  classification: "reactive-state" | "constant" | "derived" | "unknown";
  violations: Violation[];
}

export function classifyStateVariable(v: StateVariableNode): StateComponent {
  const violations: Violation[] = [];
  let classification: StateComponent["classification"] = "reactive-state";

  if (v.isFinal && v.initializer !== null) {
    classification = "constant";
    violations.push({
      severity: "WARN",
      message: `Variable '${v.name}' is final with an initializer — it is a constant, not reactive state. Consider moving to a config or constants file.`,
    });
  }

  return { name: v.name, stateVariableNode: v, classification, violations };
}
```

---

## Step 7 — Classify Models

Every `ModelNode` from `parsedFlutter.models` is assigned to the data layer if it has `fromJson`/`toJson` methods, or to the domain layer if it is a pure value object with no serialization logic.

```ts
// component-classifier/classifyModels.ts

export interface ClassifiedModel {
  modelNode: ModelNode;
  assignedLayer: "data" | "domain";
  reason: string;
  violations: Violation[];
}

export function classifyModel(model: ModelNode): ClassifiedModel {
  const violations: Violation[] = [];

  if (model.hasFromJson || model.hasToJson) {
    return { modelNode: model, assignedLayer: "data", reason: "Has JSON serialization methods", violations };
  }

  if (!model.hasFromJson && !model.hasToJson) {
    return { modelNode: model, assignedLayer: "domain", reason: "Pure value object — no serialization", violations };
  }

  violations.push({
    severity: "WARN",
    message: `Model '${model.name}' classification is ambiguous. Inspect manually.`,
  });
  return { modelNode: model, assignedLayer: "data", reason: "Defaulted to data layer (ambiguous)", violations };
}
```

---

## Step 8 — Detect Cross-Layer Violations

After individual classification, run a global pass to find any component whose location violates the forbidden crossings declared in the constitution.

```ts
// component-classifier/detectCrossLayerViolations.ts

export function detectCrossLayerViolations(
  classifiedMethods: ClassifiedMethod[],
  dataComponents: DataComponent[],
  ruleSet: ClassifierRuleSet
): Violation[] {
  const violations: Violation[] = [];

  for (const rule of ruleSet.forbiddenCrossings) {
    // Find methods in `fromLayer` whose bodies reference components in `toLayer`
    const offenders = classifiedMethods.filter(
      (m) =>
        m.assignedLayer === rule.fromLayer &&
        m.signals.some((s) => s.toLowerCase().includes(rule.toLayer))
    );

    for (const offender of offenders) {
      violations.push({
        severity: "WARN",
        message: `Method '${offender.methodNode.name}' in '${rule.fromLayer}' layer crosses into '${rule.toLayer}' layer. Rule: "${rule.description}"`,
      });
    }
  }

  return violations;
}
```

**Rule:** Cross-layer violations are always WARN at this stage — they are surfaced to the caller for resolution. This skill does not auto-reassign components to fix violations; it reports them faithfully.

---

## Step 9 — Assemble and Return the Classification Result

Combine all classified artefacts, merge all violation arrays, and run completeness validation before returning.

```ts
// component-classifier/assembleClassification.ts

export interface ClassificationResult {
  presentation: PresentationComponent[];
  domainLogic:  ClassifiedMethod[];        // methods assigned to "domain" layer
  apiLayer:     DataComponent[];           // API calls + data-layer methods + data models
  stateLogic:   StateComponent[];
  existingComponentCatalog: ExistingComponent[];  // populated from Step 1b; empty for new projects
  componentReuseMap: Map<string, ExistingComponent>; // flutter widget name → reusable RN component
  violations:   Violation[];
}

export function assembleClassification(parts: {
  presentation: PresentationComponent[];
  classifiedMethods: ClassifiedMethod[];
  dataComponents: DataComponent[];
  stateComponents: StateComponent[];
  classifiedModels: ClassifiedModel[];
  crossLayerViolations: Violation[];
  catalog: ComponentCatalog;
}): ClassificationResult {
  const allViolations = [
    ...parts.presentation.flatMap((p) => p.violations),
    ...parts.classifiedMethods.flatMap((m) => m.violations),
    ...parts.dataComponents.flatMap((d) => d.violations),
    ...parts.stateComponents.flatMap((s) => s.violations),
    ...parts.classifiedModels.flatMap((m) => m.violations),
    ...parts.crossLayerViolations,
  ];

  const fatalViolations = allViolations.filter((v) => v.severity === "FATAL");
  if (fatalViolations.length > 0) {
    throw new ClassificationFatalError(fatalViolations);
  }

  // Build a reuse map: for each presentation widget, check if the catalog has a matching component
  const componentReuseMap = new Map<string, ExistingComponent>();
  for (const widget of parts.presentation) {
    const match = findMatchingCatalogComponent(widget.name, parts.catalog.components);
    if (match) {
      componentReuseMap.set(widget.name, match);
      allViolations.push({
        severity: "WARN" as const,
        message: `INFO: Widget '${widget.name}' maps to existing component '${match.name}' at '${match.path}'. Widget-to-JSX Converter will reuse this component instead of generating a new one.`,
      } as Violation);
    }
  }

  return {
    presentation: parts.presentation,
    domainLogic: parts.classifiedMethods.filter((m) => m.assignedLayer === "domain"),
    apiLayer: [
      ...parts.dataComponents,
      ...parts.classifiedModels.filter((m) => m.assignedLayer === "data"),
    ],
    stateLogic: parts.stateComponents,
    existingComponentCatalog: parts.catalog.components,
    componentReuseMap,
    violations: allViolations,
  };
}

function findMatchingCatalogComponent(
  widgetName: string,
  catalog: ExistingComponent[]
): ExistingComponent | null {
  const lower = widgetName.toLowerCase();
  // Exact name match (case-insensitive)
  const exact = catalog.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact;

  // Type-based fuzzy match
  const typeGuesses: Record<string, ExistingComponent["type"][]> = {
    elevatedbutton: ["button"], textbutton: ["button"], outlinebutton: ["button"], iconbutton: ["button"],
    checkbox:       ["checkbox"],
    textfield:      ["input"], textformfield: ["input"],
    text:           ["text"],
    card:           ["card"],
    listview:       ["list-item"], listitem: ["list-item"],
    appbar:         ["header"],
    dialog:         ["modal"], alertdialog: ["modal"],
  };
  const guessed = typeGuesses[lower];
  if (guessed) {
    const match = catalog.find((c) => guessed.includes(c.type));
    if (match) return match;
  }

  return null;
}
```

Run this checklist before returning:

- [ ] `presentation[]` is non-empty if `parsedFlutter.widgets` was non-empty — otherwise **FAIL**
- [ ] No component appears in more than one output array
- [ ] Every `ClassifiedMethod` has a non-`"unclassified"` layer, or carries a WARN violation explaining why
- [ ] Every inline API call found in a presentation or domain method has a corresponding WARN violation
- [ ] `violations[]` contains no `FATAL` entries before returning
- [ ] Classification decisions are traceable: every component has at least one entry in `signals[]` or `reason`
- [ ] Cross-layer violation check was executed using the constitution rule set, not hard-coded heuristics
- [ ] `existingComponentCatalog` is populated (may be empty for new projects — that is valid)
- [ ] `componentReuseMap` entries are set for every presentation widget that has a matching catalog component
- [ ] Every `componentReuseMap` match emits an INFO violation so downstream skills log the reuse decision

---

## File Layout Reference

```
component-classifier/
├── index.ts                          ← Orchestrator: runs steps 1–9 in order
├── loadArchitectureRules.ts          ← Step 2: constitution config → ClassifierRuleSet
├── loadExistingComponentCatalog.ts   ← Step 1b: scan target project for reusable components
├── classifyWidgets.ts                ← Step 3: WidgetNode[] → PresentationComponent[]
├── classifyMethods.ts                ← Step 4: MethodNode[] → ClassifiedMethod[]
├── classifyApiCalls.ts               ← Step 5: ApiCallNode[] → DataComponent[]
├── classifyStateVariables.ts         ← Step 6: StateVariableNode[] → StateComponent[]
├── classifyModels.ts                 ← Step 7: ModelNode[] → ClassifiedModel[]
├── detectCrossLayerViolations.ts     ← Step 8: global cross-layer violation pass
├── assembleClassification.ts         ← Step 9: assembly + fatal gate + reuse map
├── errors.ts                         ← ClassificationFatalError, Violation types
└── __tests__/
    ├── classifyMethods.test.ts
    ├── classifyApiCalls.test.ts
    ├── detectCrossLayerViolations.test.ts
    ├── loadExistingComponentCatalog.test.ts
    └── assembleClassification.test.ts
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Constitution-grounded | All layer rules and forbidden crossings come from the constitution config — never from hard-coded assumptions |
| No mixed-layer components | A component is assigned to exactly one layer; mixed signals produce a WARN and a priority-order assignment, never a dual entry |
| Violations, not silent fixes | Cross-layer problems are reported in `violations[]`; this skill never auto-relocates a component to "fix" a violation |
| Traceable decisions | Every classification carries `signals[]` or `reason` so downstream skills and humans can audit the assignment |
| Presentation default for widgets | Widgets are always presentation; the only exception is detecting violations within them |
| Data default for serializable models | Models with `fromJson`/`toJson` belong in data; pure value objects belong in domain |
| FAIL on incomplete classification | If the output lacks a `presentation[]` when widgets were present, the skill fails rather than returning a partial result |
| Reuse before generation | When an existing component matches a Flutter widget, the reuse map entry is set — the Widget-to-JSX Converter must respect it and not generate a duplicate |
| Catalog is always emitted | `existingComponentCatalog` and `componentReuseMap` are always present in the output — empty collections for new projects, populated ones for existing codebases |
