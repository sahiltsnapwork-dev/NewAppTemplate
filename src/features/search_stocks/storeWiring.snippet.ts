// ═══════════════════════════════════════════════════════════════════════════
// STORE WIRING SNIPPET — search_stocks feature
// Follow each numbered section to wire the feature into the app shell.
// Delete this file after wiring is complete.
// ═══════════════════════════════════════════════════════════════════════════

// ── Section 1: src/app/state/store.ts ────────────────────────────────────────
// import searchStocksReducer from '../../features/search_stocks/state/store/searchStocksSlice';
// import { createSearchStocksThunkExtra } from '../../features/search_stocks/diBootstrap';
//
// const rootReducer = combineReducers({
//   searchStocks: searchStocksReducer,
// });
//
// const thunkExtra = createSearchStocksThunkExtra();
//
// configureStore({
//   reducer: rootReducer,
//   middleware: (getDefaultMiddleware) =>
//     getDefaultMiddleware({ thunk: { extraArgument: thunkExtra } }),
// });


// ── Section 2: src/app/routing/RootNavigator.tsx ──────────────────────────────
// import { SearchStocksScreen } from '../../features/search_stocks/presentation/screens/SearchStocksScreen';
//
// <Stack.Screen
//   name="SearchStocksScreen"
//   component={SearchStocksScreen}
// />


// ── Section 3: Tab Navigator (if search is a tab) ─────────────────────────────
// Not applicable — SearchStocks is a push screen, not a root tab.


// ── Section 4: Navigation call from any screen ────────────────────────────────
// navigation.navigate('SearchStocksScreen', {
//   fromScreen: 'watchListScreen',
//   autoFocusSearchBox: true,
// });
