// ─── SWOT Analysis Tab (WebView only) ────────────────────────────────────────

import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEBVIEW_URLS } from '../../constants/ApiConstants';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

export const SwotAnalysisTab: React.FC<Props> = ({ symbol }) => {
  const swotUrl = WEBVIEW_URLS.TRENDLYNE_SWOT(symbol);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: swotUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.webviewLoadingText}>Loading…</Text>
          </View>
        )}
        onError={() => console.warn('[SwotAnalysisTab] WebView failed')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  webview: { flex: 1, backgroundColor: COLORS.card },
  webviewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
  },
  webviewLoadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
});
