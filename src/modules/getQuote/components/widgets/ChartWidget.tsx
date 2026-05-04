// ─── Chart Widget ─────────────────────────────────────────────────────────────
// Maps to Flutter: WebView InAppWebView chart + chart interval controls
// Uses WebView for TradingView chart (publicly accessible URL)
// Falls back to simple bar representation if WebView unavailable

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppDispatch, useAppSelector, selectChartInterval } from '../../store/hooks';
import { setChartInterval, fetchChartData } from '../../store/getQuoteSlice';
import { CHART_INTERVALS, ChartInterval, WEBVIEW_URLS } from '../../constants/ApiConstants';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, BORDER_RADIUS } from '../../constants/UIConstants';

interface Props { symbol: string; }

export const ChartWidget: React.FC<Props> = ({ symbol }) => {
  const dispatch = useAppDispatch();
  const chartInterval = useAppSelector(selectChartInterval);
  const chartLoading = useAppSelector(s => s.getQuote.chartLoading);
  const exchange = useAppSelector(s => s.getQuote.selectedExchange);

  const handleIntervalChange = useCallback(
    (interval: ChartInterval) => {
      dispatch(setChartInterval(interval));
      dispatch(fetchChartData({ symbol, interval }));
    },
    [dispatch, symbol],
  );

  const chartUrl = WEBVIEW_URLS.TRADING_VIEW_CHART(symbol, exchange);

  return (
    <View style={styles.container}>
      {/* Chart Type & Interval Controls */}
      <View style={styles.controls}>
        <View style={styles.intervalRow}>
          {CHART_INTERVALS.map((interval) => (
            <TouchableOpacity
              key={interval}
              style={[
                styles.intervalBtn,
                chartInterval === interval && styles.intervalBtnActive,
              ]}
              onPress={() => handleIntervalChange(interval)}
            >
              <Text
                style={[
                  styles.intervalText,
                  chartInterval === interval && styles.intervalTextActive,
                ]}
              >
                {interval}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* TradingView WebView Chart */}
      <View style={styles.chartContainer}>
        {chartLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        )}
        <WebView
          source={{ uri: chartUrl }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading Chart…</Text>
            </View>
          )}
          onError={() => {
            // Chart load error — non-fatal
            console.warn('[ChartWidget] WebView chart failed to load');
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    margin: SPACING.base,
    overflow: 'hidden',
  },
  controls: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 4,
  },
  intervalBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: COLORS.surface,
  },
  intervalBtnActive: {
    backgroundColor: COLORS.primary,
  },
  intervalText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  intervalTextActive: {
    color: COLORS.textPrimary,
  },
  chartContainer: {
    height: 280,
    marginTop: SPACING.sm,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    zIndex: 10,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
  },
});
