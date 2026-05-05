// SwotAnalysisTab — renders SWOT analysis via trendlyne WebView
// URL: https://huffman.trendlyne.com/clientapi/huffman/webview/singletab-stock-summary/{symbol}/#swot

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../styles/tokens';

interface Props {
  symbol: string;
  exchange: 'NSE' | 'BSE';
}

export function SwotAnalysisTab({ symbol }: Props) {
  const [loading, setLoading] = useState(true);
  const uri = `https://huffman.trendlyne.com/clientapi/huffman/webview/singletab-stock-summary/${encodeURIComponent(symbol)}/#swot`;

  console.log(`[SwotAnalysisTab] mount symbol="${symbol}" uri="${uri}"`);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.positive} />
        </View>
      )}
      <WebView
        source={{ uri }}
        style={styles.webview}
        onLoadStart={() => { console.log('[SwotWebView] loadStart'); setLoading(true); }}
        onLoadEnd={() => { console.log('[SwotWebView] loadEnd (success)'); setLoading(false); }}
        onError={e => { console.warn('[SwotWebView] error', e.nativeEvent); setLoading(false); }}
        onHttpError={e => console.warn('[SwotWebView] httpError', e.nativeEvent.statusCode, e.nativeEvent.url)}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        startInLoadingState={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loader: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
