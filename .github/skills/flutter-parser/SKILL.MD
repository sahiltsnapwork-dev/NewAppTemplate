---
name: flutter-parser
description: "MUST be used whenever Dart/Flutter source code needs to be parsed and its structure extracted into a machine-readable format. Use when: analyzing a Flutter file before migrating, converting, or auditing it; extracting widget trees, state variables, API calls, navigation calls, or model definitions from Dart code; supplying structured Flutter metadata to downstream conversion or scaffolding skills. Keywords: flutter, dart, parser, widget tree, ast, state variables, api calls, navigation, models, extract, dart parser."
priority: HIGH
auto-trigger: true
---

# Flutter Parser

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

> Trigger this skill **before** any skill that needs to reason about the contents of a Flutter/Dart file. This skill is read-only and extraction-only — it must never modify, reformat, or transform the source code it receives.

## Step 1 — Receive and Validate Input

Accept the raw Dart source as `flutterCode` and verify it is parseable before proceeding:

- Confirm `flutterCode` is a non-empty string
- Confirm the string contains at least one `class` keyword (minimum signal that it is Dart source)
- Confirm the string is not a compiled artifact (`.dill`, binary prefix bytes)

**Decision point:**
- If `flutterCode` is empty or null → **FAIL** immediately: `{ "violations": [{ "severity": "FATAL", "message": "Input 'flutterCode' is empty. Nothing to parse." }] }`
- If no `class` keyword is found → **FAIL**: `"FATAL: No class declarations found. Input does not appear to be valid Dart source."`
- If the string appears to be minified or compiled → **FAIL**: `"FATAL: Input looks like a compiled artifact, not Dart source."`

**Rule:** This skill receives code; it never fetches, reads from disk, or resolves imports. Callers are responsible for supplying the full file content.

---

## Step 1d — Apply README Context as Supplementary Input

If `readmeContext` is provided by the orchestrator, use it as a supplementary annotation source. The GSD codebase (Dart AST) is always the primary source — README context is used only to annotate findings, never to create AST nodes.

**Priority rule (non-negotiable):**
- GSD data (Dart AST) present for a node → use GSD data, ignore README
- GSD data absent for a topic → use README insights as supplementary guidance only
- GSD and README conflict → use GSD; emit `"README CONFLICT: GSD states '{gsdValue}' for '{topic}' but README states '{readmeValue}'. Using GSD value — it is derived from the actual codebase."`

**README context application for this skill:**
- If `readmeContext.insights.uiComponentHints` lists PascalCase component names not found in the AST extraction, attach them to the parse output as `readmeMentionedComponents: string[]` — an annotation for the Component Classifier to consider. Never create AST nodes from README hints.
- If `readmeContext.insights.userFlows` describes screens or steps involving widget names found in the AST, annotate those widgets with `readmeFlow: string` to trace them back to user flows in the report.
- If `readmeContext.insights.source === "none"` → emit INFO: `"[README Context] No README insights available. Flutter Parser proceeds with AST extraction only."` and skip all annotation steps.

**What README context MUST NOT do in this skill:**
- Create, synthesize, or infer AST nodes
- Override any value derived from the Dart source
- Skip or defer any parsing step

---

## Step 2 — Build the AST

Parse the Dart source into an Abstract Syntax Tree using the `analyzer` package (preferred) or a structural regex fallback for environments where `analyzer` is unavailable.

```dart
// flutter_parser/ast_builder.dart
import 'package:analyzer/dart/analysis/utilities.dart';
import 'package:analyzer/dart/ast/ast.dart';

CompilationUnit buildAst(String source) {
  final result = parseString(content: source);

  if (result.errors.isNotEmpty) {
    // Surface parse errors as WARN violations — do not abort.
    // Partial ASTs are still useful; callers receive violations[].
    for (final error in result.errors) {
      emitViolation(severity: 'WARN', message: 'Parse error: ${error.message} at offset ${error.offset}');
    }
  }

  return result.unit;
}
```

**Quality checks:**
- Parse errors are WARN violations, not FAILs — a partially valid file may still yield extractable widgets and methods
- The raw `CompilationUnit` is the single source of truth for all subsequent extraction steps; no re-parsing of the string is permitted after this point
- The AST must not be mutated at any step

---

## Step 3 — Extract the Widget Tree

Traverse the AST to identify all `Widget`-returning constructs and reconstruct their parent-child hierarchy.

```dart
// flutter_parser/widget_extractor.dart
import 'package:analyzer/dart/ast/visitor.dart';

class WidgetNode {
  final String name;           // e.g. "Scaffold", "Column", "MyCustomWidget"
  final String type;           // "core" | "custom" | "unknown"
  final List<WidgetNode> children;
  final Map<String, String> props; // prop name → raw value string (no evaluation)
  final int startLine;
  final int endLine;

  const WidgetNode({
    required this.name,
    required this.type,
    required this.children,
    required this.props,
    required this.startLine,
    required this.endLine,
  });
}

class WidgetTreeExtractor extends RecursiveAstVisitor<void> {
  final List<WidgetNode> roots = [];

  @override
  void visitInstanceCreationExpression(InstanceCreationExpression node) {
    // Identify Widget instantiations by checking return type context or
    // known Flutter widget class names
    if (_isWidget(node)) {
      roots.add(_buildNode(node));
    }
    super.visitInstanceCreationExpression(node);
  }
}
```

**Quality checks:**
- Deeply nested widgets must be captured with correct parent-child linkage — depth is unlimited
- Custom widgets (classes not in the Flutter SDK) are tagged `type: "custom"` and included as opaque leaf nodes; their internals are not inlined
- Prop values are stored as raw strings exactly as written in source — never evaluated or resolved
- If zero widgets are found in a file that contains a `build` method → **FAIL**: `"FATAL: 'build' method found but no widgets could be extracted. Widget tree structure is broken."`

---

## Step 4 — Extract Methods

Walk all class declarations and collect every method signature, including lifecycle hooks and `build`.

```dart
// flutter_parser/method_extractor.dart

class MethodNode {
  final String name;
  final String returnType;        // raw return type string, e.g. "Widget", "Future<void>"
  final List<String> parameters;  // raw parameter strings, preserving types
  final bool isAsync;
  final bool isOverride;
  final String body;              // verbatim source body — NOT transformed
  final int startLine;
  final int endLine;
}

// Lifecycle methods that must always be captured if present
const _lifecycleMethods = {
  'initState', 'dispose', 'didChangeDependencies',
  'didUpdateWidget', 'build', 'setState',
};
```

**Quality checks:**
- `body` must be the verbatim source slice between `{` and `}` — no reformatting
- Inline anonymous functions assigned to variables are captured under the variable name with `name: "<anonymous>"`
- Overridden lifecycle methods (`initState`, `dispose`, etc.) are flagged `isOverride: true` regardless of whether `@override` annotation is present in source

---

### Step 4b — Extract Mixins

Scan every class declaration for `with` clauses. Mixins carry behavioral contracts — animation lifecycle and keep-alive — that the Widget-to-JSX Converter must translate into RN hook boilerplate. Without this, animation-capable widgets silently become bare `<View>` shells.

```dart
// flutter_parser/mixin_extractor.dart

class MixinNode {
  final String name;             // e.g. "TickerProviderStateMixin"
  final String containingClass;  // name of the widget/state class using this mixin
  final bool impliesAnimation;   // true for SingleTickerProviderStateMixin, TickerProviderStateMixin
  final bool impliesKeepAlive;   // true for AutomaticKeepAliveClientMixin
}
```

**Detection rules:**
- Scan every class declaration for `with` clauses; create one `MixinNode` per mixin name in the clause
- `impliesAnimation: true` when the mixin name contains `"TickerProvider"` (covers `SingleTickerProviderStateMixin` and `TickerProviderStateMixin`)
- `impliesKeepAlive: true` when the mixin name is exactly `"AutomaticKeepAliveClientMixin"`
- Store `mixins: MixinNode[]` in the extraction result (empty array if none detected)

**Quality checks:**
- A widget class that uses a `TickerProvider` mixin but has no `AnimationController` detected in its state variables → add WARN: `"Class '{name}' uses TickerProviderStateMixin but no AnimationController was found in state variables. Animation hook wiring may be incomplete."`
- When `impliesAnimation: true`, the Widget-to-JSX Converter MUST emit `const anim = useRef(new Animated.Value(0)).current;` in the component body instead of a bare `<View>` placeholder — this is a converter-side rule triggered by the mixin flag
- When `impliesKeepAlive: true`, the converter must add `keepMounted` or equivalent to the generated route config

---

## Step 5 — Extract State Variables

Identify all instance variables in `State<T>` subclasses and top-level `StatefulWidget` fields.

```dart
// flutter_parser/state_extractor.dart

class StateVariableNode {
  final String name;
  final String declaredType;  // raw type annotation, e.g. "List<String>", "bool"
  final String? initializer;  // raw initializer expression, null if absent
  final bool isFinal;
  final bool isLate;          // true if declared with the 'late' keyword
  final bool isPrivate;       // true if name starts with '_'
  final int declarationLine;
}

// State management pattern used by the enclosing class — detected from class inheritance and imports
typedef StatePattern = "bloc" | "cubit" | "provider" | "getx" | "setState" | "unknown";

// Detection rules for StatePattern (checked in order; first match wins):
// "bloc"     → class extends Bloc<E,S> or HydratedBloc
// "cubit"    → class extends Cubit<S> or HydratedCubit
// "provider" → class extends ChangeNotifier, or file imports package:provider
// "getx"     → class extends GetxController, GetxService, or file imports package:get
// "setState" → class extends State<T> with no BLoC/Cubit/Provider/GetX ancestry
// "unknown"  → none of the above
```

**Decision point:**
- Variables declared in a `StatelessWidget` are captured but tagged with a WARN: `"Variable '{name}' found in StatelessWidget — it cannot be reactive state."`
- `late` variables are captured with `isLate: true` and `initializer: null`. They are never speculatively resolved. The `isLate` flag flows to `typescript-enforcer`, which adds a `// NOTE: was 'late' in Dart — ensure initialized before use` comment and blocks emission of `undefined` as the initial value.
- The `statePattern` for the enclosing class is stored at the class level and emitted alongside its `stateVariables[]` in the Step 9 output shape. The `redux-state-generator` uses `statePattern` to decide slice shape: `bloc` events → action discriminated union; `cubit` methods → direct reducers; `setState` → `useState`/`useReducer` recommendation.

---

## Step 6 — Extract API Calls

Identify network call patterns within method bodies. Match against known Flutter HTTP libraries and patterns.

```dart
// flutter_parser/api_extractor.dart

class ApiCallNode {
  final String library;       // e.g. "http", "dio", "retrofit", "graphql"
  final String method;        // "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "UNKNOWN"
  final String rawEndpoint;   // raw string argument — NOT resolved
  final String containingMethod;  // name of the enclosing method
  final int callLine;
  final String responseUsage; // "json" | "webview-url" | "html" | "unknown" — see Step 6c
}

// Patterns that signal an API call
const _apiPatterns = [
  'http.get', 'http.post', 'http.put', 'http.delete', 'http.patch',
  'dio.get', 'dio.post', 'dio.put', 'dio.delete', 'dio.patch',
  'client.get', 'client.post',
  '.fetch(', '.query(', '.mutate(',  // GraphQL
];
```

**Quality checks:**
- Endpoint strings that are variables (not string literals) are stored as the raw variable expression, e.g. `"$baseUrl/users"` — never resolved
- If an API pattern is detected but HTTP method cannot be determined → set `method: "UNKNOWN"` and add a WARN violation
- Non-network `Future`-returning calls (e.g. `SharedPreferences.getInstance()`) must not be classified as API calls

---

### Step 6b — Detect and Flag Request Envelope Nesting

When extracting API calls, also extract the **structure of the request body** being passed to each call. Flutter apps that talk to enterprise API gateways commonly wrap request data in a nested envelope (e.g. `{ mb: { rq: { reqdata: { ... } } } }`). This nesting level is not a convention the data-layer-builder can verify — it must be captured here so it can be flagged for manual API contract verification downstream.

```dart
// flutter_parser/request_envelope_extractor.dart

class RequestEnvelopeNode {
  final String containingMethod;  // name of the enclosing method
  final String? envelopePath;     // dot-path of nesting, e.g. "mb.rq.reqdata" or null if flat
  final List<String> payloadFields; // field names at the innermost level
  final int callLine;
}
```

**Extraction rules:**
- When an API call node has an associated map/object literal argument, walk that literal's key tree to determine the nesting structure.
- If the payload is nested more than one level (e.g. `{ mb: { rq: { ... } } }`) → record `envelopePath` as the dot-notation path to the innermost map (e.g. `"mb.rq.reqdata"`) and add a WARN: `"API call in '{containingMethod}' uses a nested request envelope '${envelopePath}'. The data-layer-builder will flag this for verification against the real API contract."`
- The `payloadFields` list must contain the **field names at the innermost level** — these are the fields the data-layer-builder will cross-check against the DTO.
- If a field at any nesting level has a value that is a session-bound variable (matches the session-bound prop names: `entityId`, `tradingAccountNo`, `clientCode`, `sessionId`, `userId`, `accountNo`, `clientId`) → add that field name to `ApiCallNode.sessionBoundFields` (a new field on `ApiCallNode`) and emit a WARN: `"Field '{fieldName}' in request envelope for '{containingMethod}' is session-bound. Downstream conversion must wire it from the auth context — not emit an empty default."`

**Output addition:** The `ApiCallNode` type gains two new optional fields:

```dart
class ApiCallNode {
  // ... existing fields ...
  final RequestEnvelopeNode? requestEnvelope;   // null if no body or flat body
  final List<String> sessionBoundFields;        // session-identity field names found in the request body
  final String responseUsage;                   // "json" | "webview-url" | "html" | "unknown" — populated by Step 6c
}
```

These fields flow through to the data-layer-builder's Step 4 (`generateApiDataSource`) and Step 4b (envelope verification), enabling it to emit accurate request envelope guards and session-bound field warnings.

---

---

### Step 6c — Detect API Response Usage (WebView vs Structured JSON)

After extracting API call nodes, determine **how the response is consumed** in the enclosing method. The `data-layer-builder` needs this signal to decide whether to generate a DTO + mapper (for structured JSON) or a plain `string`-returning method (for a WebView URL).

```dart
// flutter_parser/webview_response_detector.dart

// Response usage signals — checked in order; first match wins.
const _WEBVIEW_SIGNALS = [
  // Response assigned to a variable, then passed to WebView.url or WebView(url:)
  RegExp(r'WebView\s*\(\s*url\s*:', caseSensitive: false),
  RegExp(r'\.url\s*=\s*\w'),              // url = responseVar
  RegExp(r'WebViewController\b'),
  RegExp(r'InAppWebView\b'),
  RegExp(r'webViewUrl\s*='),
];

const _HTML_SIGNALS = [
  RegExp(r'WebView.*initialFile', caseSensitive: false),
  RegExp(r'loadHtml\s*\('),
  RegExp(r'loadUrl.*html', caseSensitive: false),
];

String detectResponseUsage(String containingMethodSource) {
  for (final pattern in _WEBVIEW_SIGNALS) {
    if (pattern.hasMatch(containingMethodSource)) return 'webview-url';
  }
  for (final pattern in _HTML_SIGNALS) {
    if (pattern.hasMatch(containingMethodSource)) return 'html';
  }
  return 'json'; // Default — downstream skills treat this as structured JSON
}
```

**Detection rules:**
- Search the **entire source of the method that contains the API call** (not just the call line) for WebView consumption signals.
- If the response variable is returned from the method rather than consumed locally, inspect every **call site** of that method in the same file for WebView signals.
- If consumption cannot be determined (e.g. the result is returned upward through multiple layers) → set `responseUsage: "unknown"` and emit a WARN: `"API call in '{containingMethod}' — response consumption pattern could not be determined. Downstream skills will treat it as JSON. If this endpoint returns a WebView URL, set responseUsage to 'webview-url' manually."`

**Decision points:**
- `responseUsage: "webview-url"` → `data-layer-builder` skips DTO + mapper. Generates a `Promise<string>` data source method. The `widget-to-jsx-converter` wires the result to a `<WebView source={{ uri: url }} />` component.
- `responseUsage: "html"` → same as `"webview-url"` but the WebView component uses `source={{ html: content }}` instead of `uri`.
- `responseUsage: "json"` → normal DTO + mapper pipeline (default behaviour).
- `responseUsage: "unknown"` → treated as `"json"` downstream, with a WARN propagated to `data-layer-builder`.

**Quality check:** If a Flutter file imports `webview_flutter`, `flutter_inappwebview`, or `webview_windows` → pre-scan the entire file for WebView widget usages before classifying any API call as `"json"`. Any API call in the same method or same class as a WebView widget construction defaults to `"webview-url"` unless a more specific JSON-consumption pattern is found.

---

### Step 6d — Extract Platform Streaming Channels

Identify all `EventChannel` and `MethodChannel` usages within method bodies. Platform channels are the Flutter equivalent of a real-time data subscription (e.g. live price feeds) and must be captured as a distinct node type — they are not HTTP calls and must never be classified as `ApiCallNode` entries.

```dart
// flutter_parser/streaming_channel_extractor.dart

class StreamingChannelNode {
  final String channelName;      // e.g. "com.hdfcsec.trade/gqEquityStream"
  final String channelType;      // "EventChannel" | "MethodChannel"
  final String containingMethod; // name of the enclosing method
  final int callLine;
}

// Patterns that signal a platform channel registration or invocation
const _streamingPatterns = [
  'EventChannel(',
  'MethodChannel(',
  'invokeMethod(',
  '.receiveBroadcastStream(',
];
```

**Detection rules:**
- A `StreamingChannelNode` is created for every string-literal channel name passed to `EventChannel(...)` or `MethodChannel(...)`.
- `invokeMethod(` calls on an already-declared channel are linked to the nearest enclosing `MethodChannel` variable in scope — they do not create a new `StreamingChannelNode`.
- If the channel name is a variable (not a string literal) → record `channelName` as the raw variable expression and add a WARN: `"Channel name in '{containingMethod}' is not a string literal. Downstream documentation will use the variable name as-is."`

**Quality check:** If a Flutter file contains an `EventChannel` or `MethodChannel` alongside HTTP API calls, both node types must be captured independently. Do not discard streaming channels on the assumption that only HTTP calls matter — streaming channels are part of the feature's runtime API surface area.

---

### Step 6e — Detect BuildContext-Dependent Calls

Identify all calls that read data from `BuildContext` within method bodies. These are **not** API calls and must never appear in `apiCalls[]`. They are Flutter framework lookups that map 1:1 to RN hooks — capturing them here lets the Widget-to-JSX Converter substitute them automatically instead of emitting invalid Dart expressions as JSX prop values.

```dart
// flutter_parser/context_call_extractor.dart

class ContextCallNode {
  final String expression;      // raw Dart expression, e.g. "Theme.of(context).primaryColor"
  final String containingMethod; // name of the enclosing method
  final int callLine;
  final String rnEquivalent;    // best-effort RN substitution ("TODO" if no table match)
}

// Substitution table — checked as prefix matches (longest match wins)
const _contextSubstitutions = {
  'MediaQuery.of(context).size.width':  'useWindowDimensions().width',
  'MediaQuery.of(context).size.height': 'useWindowDimensions().height',
  'MediaQuery.of(context).padding.top': 'useSafeAreaInsets().top',
  'MediaQuery.of(context)':             'useWindowDimensions()',
  'Theme.of(context).primaryColor':     'useTheme().colors.primary',
  'Theme.of(context).textTheme':        'useTheme().fonts',
  'Theme.of(context)':                  'useTheme()',
  'FocusScope.of(context).unfocus()':   'Keyboard.dismiss()',
  'Navigator.of(context)':              'useNavigation()',
  'Localizations.localeOf(context)':    'useLocale()',
};
```

**Detection rules:**
- Scan each method body for any expression containing `.of(context)` or `context.` prefix
- Match against the substitution table using longest-prefix-wins; create a `ContextCallNode` with `rnEquivalent` from the table
- If the expression contains `.of(context)` but has no table match → create a `ContextCallNode` with `rnEquivalent: "TODO"` and add WARN: `"BuildContext call '{expression}' in '{containingMethod}' has no automatic RN substitution. Replace manually."`
- Store all detected nodes as `contextCalls: ContextCallNode[]` in the Step 9 output (empty array if none)

**Quality check:** A method that returns a `Widget` (i.e. the `build` method) and contains more than 5 unique BuildContext lookup expressions → add WARN: `"build() in '{className}' has {n} BuildContext lookups. Consider extracting theme/media values into local variables before the return statement to improve RN hook placement."`

---

## Step 7 — Extract Navigation Calls

Identify all `Navigator` and `GoRouter` call sites within method bodies.

```dart
// flutter_parser/navigation_extractor.dart

class NavigationNode {
  final String type;           // "push" | "pop" | "replace" | "pushNamed" | "go" | "unknown"
  final String? destination;   // raw route name/path string or widget constructor, null if dynamic
  final bool passeArguments;   // true if arguments/extra map is supplied
  final String containingMethod;
  final int callLine;
}

// Recognizable navigation calls
const _navPatterns = [
  'Navigator.push', 'Navigator.pop', 'Navigator.pushReplacement',
  'Navigator.pushNamed', 'Navigator.popAndPushNamed',
  'context.go', 'context.push', 'context.replace',  // GoRouter
];
```

---

## Step 8 — Extract Models

Identify plain data classes — classes that are not `Widget`, `State`, `Bloc`, `Cubit`, or `ChangeNotifier` subclasses — and extract their fields.

```dart
// flutter_parser/model_extractor.dart

class ModelNode {
  final String name;
  final List<ModelField> fields;
  final bool hasFromJson;   // true if fromJson factory/constructor present
  final bool hasToJson;     // true if toJson method present
  final bool isFreezed;     // true if @freezed annotation present
}

class ModelField {
  final String name;
  final String type;
  final bool isRequired;
  final bool isNullable;   // true if type ends with '?'
}
```

**Quality check:** A class is classified as a model only if it has no `build` method and does not extend a Flutter framework base class. When classification is ambiguous, add a WARN: `"Class '{name}' could not be definitively classified as a model. Inspect manually."`

---

## Step 8b — Extract Feature Flag References

Flutter apps that gate rendering branches on runtime feature flags (e.g. `PortfolioFeatureFlags.isJuliusBaerHoldingEnabled`) must have those flags extracted explicitly. Without this step, conditional rendering blocks are parsed as ordinary widget tree branches and the flag evaluation logic is silently dropped. The converted JSX will then expose gated UI unconditionally to all users.

```dart
// flutter_parser/feature_flag_extractor.dart

class FeatureFlagNode {
  final String flagName;           // e.g. "isJuliusBaerHoldingEnabled"
  final String? flagClass;         // e.g. "PortfolioFeatureFlags"; null if standalone variable
  final String containingWidget;   // name of the widget or method where the flag is referenced
  final String conditionBranch;    // "if-true" | "if-false" | "ternary-true" | "ternary-false"
  final int callLine;
}
```

**Detection rules:** A flag reference is any boolean expression that:
- Accesses a property on a class whose name ends with `FeatureFlags`, `Features`, `FeatureConfig`, or `ToggleConfig`
- Is used as the condition of an `if` statement or ternary (`?:`) inside a `build` method or a presentation-layer method
- Matches the naming pattern `isXxx`, `enableXxx`, `showXxx`, or `useXxx` as a boolean property

**Extraction rules:**
- For each detected flag reference, record the flag name, the enclosing widget/method name, and which branch (`if-true` vs `if-false`) the gated code lives in
- If the gated branch renders a widget → link the `FeatureFlagNode` to the `WidgetNode` that is conditionally rendered and annotate that `WidgetNode` with `flagGated: true`
- If the flag variable cannot be resolved to a recognizable FeatureFlag class → record `flagClass: null` and add a WARN: `"Feature flag '{flagName}' in '{containingWidget}' is not bound to a recognized FeatureFlag class. Downstream conversion must verify the flag source manually."`

**Decision point:**
- If flag references are detected but no `featureFlags[]` array was initialized → create it now; never silently discard flag references
- If a condition contains two or more flag references joined by `&&` or `||` (compound condition) → emit one `FeatureFlagNode` per distinct flag name and add a WARN: `"Compound feature flag condition in '{containingWidget}': [{flags}]. Each flag is emitted as an independent node. The downstream converter must preserve the logical AND/OR relationship between them."`

**Output addition:** The extraction result gains one new field:

```ts
{
  "widgets":           WidgetNode[],            // WidgetNodes may now carry flagGated: true
  "methods":           MethodNode[],
  "stateVariables":    StateVariableNode[],
  "apiCalls":          ApiCallNode[],
  "navigation":        NavigationNode[],
  "models":            ModelNode[],
  "featureFlags":      FeatureFlagNode[],       // empty array if no flags detected
  "streamingChannels": StreamingChannelNode[], // empty array if no platform channels detected
  "blocNodes":         BlocNode[],              // empty array if no BLoC classes detected
  "violations":        Violation[]
}
```

**Rule:** A non-empty `featureFlags[]` is a mandatory input signal to the Widget-to-JSX Converter. When `featureFlags[]` is non-empty, the Widget-to-JSX Converter MUST wrap each flagged widget in a conditional expression using the flag name as the condition identifier. It MUST NOT flatten conditional branches into always-rendered JSX.

---

### Step 8c — Extract BLoC Structure

Identify BLoC class hierarchies within the source file. BLoC artefacts (`Bloc`, `Event`, `State` classes) map directly to Redux Toolkit slices and thunks and must be captured before the orchestrator hands off to the Redux State Generator.

```dart
// flutter_parser/bloc_extractor.dart

class BlocNode {
  final String blocName;         // e.g. "GetQuoteDetailsBloc"
  final List<String> events;     // e.g. ["GetNewsDetailsApiEvent", "GetNewsBulkBlockApiEvent"]
  final List<String> states;     // e.g. ["LoadingGetQuoteDetailsState", "LoadGetQuoteDetailsState", "ErrorGetQuoteDetailsState"]
}
```

**Detection rules:**
- A class is a BLoC class if it extends `Bloc<E, S>`, `Cubit<S>`, or its name ends with `Bloc`.
- A class is a BLoC event if it extends another class whose name ends with `Event`, or its own name ends with `Event`.
- A class is a BLoC state if it extends another class whose name ends with `State`, or its own name ends with `State`.
- Group events and states under their BLoC by shared name prefix (e.g. `GetQuoteDetails` links `GetQuoteDetailsBloc`, `GetQuoteDetailsEvent` subclasses, and `GetQuoteDetailsState` subclasses).
- If no clear prefix match is found → attach the event/state to the nearest BLoC class declared in the same file and add a WARN: `"Event/State '{name}' could not be matched to a BLoC by name prefix. Attached to '{blocName}' by proximity. Verify the grouping is correct."`

**Quality check:** An uninitialized `BlocNode` (a BLoC class with no detected events or states) is not a FAIL — it is a WARN: `"BLoC '{blocName}' has no events or states detected. It may rely on events/states declared in a separate file. Downstream Redux State Generator will produce an empty thunk list for this BLoC."`

---

## Step 9 — Assemble and Return the Extraction Result

Combine all extracted artefacts into the canonical output shape and run final validation before returning.

```ts
// Output shape (language-agnostic contract for downstream skills)
{
  "widgets":           WidgetNode[],
  "methods":           MethodNode[],
  "stateVariables":    StateVariableNode[],      // each entry carries isLate: boolean
  "statePattern":      StatePattern,             // class-level pattern: "bloc"|"cubit"|"provider"|"getx"|"setState"|"unknown"
  "mixins":            MixinNode[],              // empty array if no mixins detected
  "contextCalls":      ContextCallNode[],        // empty array if no BuildContext lookups detected
  "apiCalls":          ApiCallNode[],
  "navigation":        NavigationNode[],
  "models":            ModelNode[],
  "featureFlags":      FeatureFlagNode[],        // empty array if no flags detected
  "streamingChannels": StreamingChannelNode[],   // empty array if no platform channels detected
  "blocNodes":         BlocNode[],               // empty array if no BLoC classes detected
  "violations":        Violation[]               // FATAL | WARN entries from all steps
}
```

Run this validation before returning:

- [ ] `widgets[]` is non-empty if the file contains a `build` method — otherwise **FAIL**
- [ ] Every `WidgetNode` in `widgets[]` has a non-empty `name`
- [ ] No `MethodNode.body` field has been reformatted (spot-check: line count must match source slice)
- [ ] `stateVariables[]` only contains variables from `State` or `StatefulWidget` classes (plus optional WARN entries for others)
- [ ] No `apiCalls[]` entry has an empty `rawEndpoint` without an accompanying WARN violation
- [ ] Every `apiCalls[]` entry has a non-empty `responseUsage` value — `"unknown"` is acceptable but must be accompanied by a WARN violation
- [ ] `violations[]` contains no `FATAL` entries — if any exist, throw before returning
- [ ] Source code string passed in equals the source code string used for AST construction (no mutation)
- [ ] No input file whose path does **not** contain `/domain/` is named `*_domain.dart` — if any such file exists, emit a WARN in `violations[]`: `"File '{filePath}' is named '*_domain.dart' but resides outside a '/domain/' directory (current location: '{folder}'). A domain-named file outside the domain layer will be misclassified as a data model by the Component Classifier. Move it to 'features/<name>/domain/entities/' before running conversion."`
- [ ] **Extraction `.md` file generated** (see Step 10 below) — every parser run MUST produce a `<featureName>_extraction.md` file

---

## Step 10 — Auto-Generate Extraction Documentation (Mandatory)

This step is **non-optional**. After Step 9 assembles the parser output, the Flutter Parser MUST write a structured `<featureName>_extraction.md` file documenting everything it extracted. This file serves as the reference for future validation, debugging, and auditing of the conversion. The file is always generated — even when the extraction has violations.

**Output path:** `<basePath>/docs/<featureName>_extraction.md` (defaults to `docs/<featureName>_extraction.md` when `basePath` is null)

**File must be generated atomically after Step 9 completes.** Never defer or skip this step. If writing the file fails (e.g. I/O error), emit WARN and continue — a missing documentation file is never a FATAL.

### Extraction `.md` Template (strict — do not omit any section)

```markdown
# Flutter Extraction Report — <featureName>

> Auto-generated by Flutter Parser after AST extraction.  
> Source: `<sourceFilePath>`  
> Generated at: `<ISO timestamp>`  
> Violations: <fatalCount> FATAL, <warnCount> WARN

---

## 1. Widget Tree

| Widget Name | Type | Children Count | Line Range |
|-------------|------|---------------|------------|
| <name>      | core / custom / unknown | <n> | <start>–<end> |
<!-- One row per WidgetNode in the extraction result -->

### Widget Hierarchy (nested)
<!-- Indented tree showing parent-child relationships -->
- <RootWidget>
  - <ChildWidget>
    - <GrandchildWidget>

---

## 2. Methods

| Method | Return Type | Async | Override | Line Range |
|--------|------------|-------|----------|------------|
| <name> | <type>     | yes/no | yes/no | <start>–<end> |

---

## 3. State Variables

| Variable | Type | Initial Value | Final | Late | Private |
|----------|------|--------------|-------|------|---------|
| <name>   | <type> | <value>    | yes/no | yes/no | yes/no |

**State Pattern Detected:** `<bloc | cubit | provider | getx | setState | unknown>`

---

## 4. API Calls

| ID | Method | Endpoint | Response Type | Containing Method | Line |
|----|--------|----------|--------------|-------------------|------|
| <id> | GET/POST/... | <path> | json / webview-url / html / unknown | <methodName> | <line> |

> ⚠️ Any entry with `responseType: unknown` must be manually classified before conversion.

---

## 5. Navigation Calls

| Target Route | Type | Containing Method | Line |
|-------------|------|-------------------|------|
| <route>     | push / replace / pop | <methodName> | <line> |

---

## 6. Models / Entities

| Model Name | Field Count | Source Layer | Line Range |
|-----------|------------|-------------|------------|
| <name>    | <n>        | domain / data / unknown | <start>–<end> |

---

## 7. BLoC / Cubit Nodes

| Name | Type | Events / Methods | State Class | Line Range |
|------|------|-----------------|-------------|------------|
| <name> | Bloc / Cubit | <n> | <stateClass> | <start>–<end> |

---

## 8. Streaming Channels

| Channel Name | Type | Containing Method |
|-------------|------|-------------------|
| <name>      | EventChannel / MethodChannel | <methodName> |

---

## 9. Mixins

| Mixin | Containing Class | Implies Animation | Implies Keep-Alive |
|-------|-----------------|------------------|-------------------|
| <name> | <class>         | yes/no           | yes/no            |

---

## 10. Violations

| Severity | Message |
|----------|---------|
| FATAL / WARN | <message> |

<!-- If no violations: "No violations detected." -->

---

## 11. Extraction Summary

- **Total Widgets:** <n>
- **Total API Calls:** <n> (<webviewCount> WebView, <jsonCount> JSON, <unknownCount> unknown)
- **Total State Variables:** <n>
- **Total Models:** <n>
- **State Pattern:** <pattern>
- **Recommended Conversion Complexity:** low / medium / high
  - high: BLoC with multiple events, deeply nested widget tree (>5 levels), or >3 API calls
  - medium: setState or Cubit, widget tree 2–5 levels, 1–3 API calls
  - low: StatelessWidget, flat widget tree, 0–1 API calls
```

**Generation rules:**
- Every section MUST appear in the output even if empty — use "No entries detected." for empty sections.
- API calls with `responseType: "webview-url"` or `"html"` are flagged with `⚠️ WebView` in the table.
- The extraction `.md` is written alongside the parser output, not instead of it. The parser JSON output is unchanged.
- The file is referenced in the pipeline's `Skill_info.md` as: `- Extraction report: [docs/<featureName>_extraction.md](docs/<featureName>_extraction.md)`

---

## File Layout Reference

```
flutter_parser/
├── index.dart                        ← Orchestrator: runs steps 1–9 in order
├── ast_builder.dart                  ← Step 2: source string → CompilationUnit
├── widget_extractor.dart             ← Step 3: AST → WidgetNode[]
├── method_extractor.dart             ← Step 4: AST → MethodNode[]
├── mixin_extractor.dart              ← Step 4b: AST → MixinNode[]
├── state_extractor.dart              ← Step 5: AST → StateVariableNode[] (with isLate, statePattern)
├── api_extractor.dart                ← Step 6: AST → ApiCallNode[]
├── webview_response_detector.dart    ← Step 6c: detect responseUsage for each ApiCallNode
├── streaming_channel_extractor.dart  ← Step 6d: AST → StreamingChannelNode[]
├── context_call_extractor.dart       ← Step 6e: AST → ContextCallNode[]
├── navigation_extractor.dart         ← Step 7: AST → NavigationNode[]
├── model_extractor.dart              ← Step 8: AST → ModelNode[]
├── bloc_extractor.dart               ← Step 8c: AST → BlocNode[]
├── assembler.dart                    ← Step 9: assembly + fatal gate
├── violations.dart                   ← Violation type, severity constants
└── test/
    ├── widget_extractor_test.dart
    ├── api_extractor_test.dart
    └── assembler_test.dart
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| Extraction only | This skill reads and extracts — it never rewrites, reformats, or transforms any part of the source |
| AST-first | All extraction is driven from the parsed `CompilationUnit`; string manipulation is a last resort only when `analyzer` is unavailable |
| Verbatim values | Prop values, method bodies, endpoint strings, and initializers are stored exactly as written — no evaluation, interpolation, or resolution |
| Hierarchy preservation | Parent-child widget relationships must be preserved to unlimited depth; flattening the tree is never acceptable |
| Fail on broken structure | A `build` method with no extractable widgets is a FATAL — it signals a parsing failure, not an empty screen |
| WARN, don't drop | Ambiguous classifications (model vs. widget, unknown API method) produce WARN violations in output, never silent omissions |
| No import resolution | This skill does not follow imports or resolve symbols from other files; custom widgets are opaque leaf nodes |
