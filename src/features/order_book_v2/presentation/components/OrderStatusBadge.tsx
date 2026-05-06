// Component: OrderStatusBadge
// Color-coded status chip (Pending/Traded/Cancelled/etc.)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#FFF3CD', text: '#856404' },
  Traded: { bg: '#D4EDDA', text: '#155724' },
  Cancelled: { bg: '#F8D7DA', text: '#721C24' },
  'Partially Traded': { bg: '#CCE5FF', text: '#004085' },
  Rejected: { bg: '#F8D7DA', text: '#721C24' },
  Modified: { bg: '#E2D9F3', text: '#432874' },
  Default: { bg: '#E8E8E8', text: '#444444' },
};

const OrderStatusBadge: React.FC<Props> = ({ status }) => {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.Default;

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default OrderStatusBadge;
