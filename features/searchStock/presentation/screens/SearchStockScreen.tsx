import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {getSearchStocks, Datum} from '../../repository/searchRepository';

export default function SearchStockScreen(): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Datum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query || query.trim().length === 0) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      getSearchStocks(query)
        .then((r) => setResults(r))
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        placeholder="Search for stocks..."
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        accessibilityLabel="search-input"
      />
      {loading && <ActivityIndicator style={styles.loader} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && results.length === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Start searching...</Text>
        </View>
      ) : null}
      <FlatList
        data={results}
        keyExtractor={(item, index) => item.instrumentId ?? item.symbol ?? String(index)}
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => console.log('Selected', item)}>
            <View style={styles.item}>
              <Text style={styles.title}>{item.companyName ?? item.displayName}</Text>
              <Text style={styles.subtitle}>{item.symbol ?? ''}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16},
  input: {height: 44, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 12, marginBottom: 12},
  loader: {marginVertical: 8},
  error: {color: 'red', marginBottom: 8},
  emptyContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {color: '#666'},
  item: {paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee'},
  title: {fontSize: 16, fontWeight: '600'},
  subtitle: {fontSize: 12, color: '#666'},
});
