// ─── Technical Analysis Tab (WebView only) ──────────────────────────────────

import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { WEBVIEW_URLS } from '../../constants/ApiConstants';
import { COLORS, FONT_SIZE, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

export const TechnicalAnalysisTab: React.FC<Props> = ({ symbol }) => {
  const techUrl = WEBVIEW_URLS.TRENDLYNE_TECHNICAL(symbol);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: techUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.webviewLoadingText}>Loading technical analysis…</Text>
          </View>
        )}
        onError={() => console.warn('[TechnicalAnalysisTab] WebView failed')}
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
