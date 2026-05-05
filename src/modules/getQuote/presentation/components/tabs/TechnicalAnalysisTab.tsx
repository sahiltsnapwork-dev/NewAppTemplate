// TechnicalAnalysisTab — renders technical analysis via trendlyne WebView
// URL: https://huffman.trendlyne.com/clientapi/huffman/webview/singletab-stock-summary/{symbol}/#technical

import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../styles/tokens';
import type { ResistanceSupportEntity } from '../../../domain/entities/ResistanceSupportEntity';

interface Props {
  symbol: string;
  exchange: 'NSE' | 'BSE';
  // resistanceSupport kept for interface compatibility but not used (WebView renders its own data)
  resistanceSupport?: ResistanceSupportEntity[];
}

export function TechnicalAnalysisTab({ symbol }: Props) {
  const [loading, setLoading] = useState(true);
  const uri = `https://huffman.trendlyne.com/clientapi/huffman/webview/singletab-stock-summary/${encodeURIComponent(symbol)}/#technical`;

  console.log(`[TechnicalAnalysisTab] mount symbol="${symbol}" uri="${uri}"`);

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
        onLoadStart={() => { console.log('[TechnicalWebView] loadStart'); setLoading(true); }}
        onLoadEnd={() => { console.log('[TechnicalWebView] loadEnd (success)'); setLoading(false); }}
        onError={e => { console.warn('[TechnicalWebView] error', e.nativeEvent); setLoading(false); }}
        onHttpError={e => console.warn('[TechnicalWebView] httpError', e.nativeEvent.statusCode, e.nativeEvent.url)}
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
