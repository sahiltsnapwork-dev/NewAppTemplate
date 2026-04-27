export type RootStackParamList = {
  Home: undefined;
  SearchStocksScreen: {
    fromScreen: string;
    autoFocusSearchBox?: boolean;
    _selectedWatchList?: string;
  };
};

/** @deprecated Use RootStackParamList */
export type SearchStocksStackParamList = RootStackParamList;
