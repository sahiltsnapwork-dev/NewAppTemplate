// Component: OrderBookShimmer
// Loading skeleton placeholder for Order Book list rows

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const ShimmerRow: React.FC<{ opacity: Animated.Value }> = ({ opacity }) => (
  <View style={styles.row}>
    <Animated.View style={[styles.shimmerCircle, { opacity }]} />
    <View style={styles.rowContent}>
      <Animated.View style={[styles.shimmerTitle, { opacity }]} />
      <Animated.View style={[styles.shimmerSubtitle, { opacity }]} />
    </View>
    <View style={styles.rowRight}>
      <Animated.View style={[styles.shimmerBadge, { opacity }]} />
      <Animated.View style={[styles.shimmerPrice, { opacity }]} />
    </View>
  </View>
);

const OrderBookShimmer: React.FC<{ rowCount?: number }> = ({ rowCount = 5 }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      {Array.from({ length: rowCount }, (_, i) => (
        <ShimmerRow key={i} opacity={opacity} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  shimmerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  rowContent: { flex: 1 },
  shimmerTitle: {
    width: '60%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginBottom: 6,
  },
  shimmerSubtitle: {
    width: '40%',
    height: 10,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  shimmerBadge: {
    width: 64,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E0E0E0',
  },
  shimmerPrice: {
    width: 56,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
});

export default OrderBookShimmer;
