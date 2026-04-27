---
name: flutter-parser
description: "MUST be used whenever Dart/Flutter source code needs to be parsed and its structure extracted into a machine-readable format. Use when: analyzing a Flutter file before migrating, converting, or auditing it; extracting widget trees, state variables, API calls, navigation calls, or model definitions from Dart code; supplying structured Flutter metadata to downstream conversion or scaffolding skills. Keywords: flutter, dart, parser, widget tree, ast, state variables, api calls, navigation, models, extract, dart parser."
priority: HIGH
auto-trigger: true
---

# Flutter Parser

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

## Step 5 — Extract State Variables

Identify all instance variables in `State<T>` subclasses and top-level `StatefulWidget` fields.

```dart
// flutter_parser/state_extractor.dart

class StateVariableNode {
  final String name;
  final String declaredType;  // raw type annotation, e.g. "List<String>", "bool"
  final String? initializer;  // raw initializer expression, null if absent
  final bool isFinal;
  final bool isPrivate;       // true if name starts with '_'
  final int declarationLine;
}
```

**Decision point:**
- Variables declared in a `StatelessWidget` are captured but tagged with a WARN: `"Variable '{name}' found in StatelessWidget — it cannot be reactive state."`
- `late` variables without initializers are captured with `initializer: null` — they are never speculatively resolved

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
  "stateVariables":    StateVariableNode[],
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

---

## File Layout Reference

```
flutter_parser/
├── index.dart                        ← Orchestrator: runs steps 1–9 in order
├── ast_builder.dart                  ← Step 2: source string → CompilationUnit
├── widget_extractor.dart             ← Step 3: AST → WidgetNode[]
├── method_extractor.dart             ← Step 4: AST → MethodNode[]
├── state_extractor.dart              ← Step 5: AST → StateVariableNode[]
├── api_extractor.dart                ← Step 6: AST → ApiCallNode[]
├── webview_response_detector.dart    ← Step 6c: detect responseUsage for each ApiCallNode
├── streaming_channel_extractor.dart  ← Step 6d: AST → StreamingChannelNode[]
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
