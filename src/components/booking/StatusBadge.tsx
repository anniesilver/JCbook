/**
 * Status Badge Component
 * Displays booking status with appropriate color and styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  size?: 'small' | 'medium' | 'large';
}

const statusConfig = {
  pending: {
    color: '#FFA500', // Orange
    backgroundColor: '#FFF3CD',
    label: 'Pending',
    icon: '⏱️',
  },
  in_progress: {
    color: '#0066CC', // Blue
    backgroundColor: '#D6E9FF',
    label: 'Processing',
    icon: '⚙️',
  },
  success: {
    color: '#28A745', // Green
    backgroundColor: '#D4EDDA',
    label: 'Confirmed',
    icon: '✓',
  },
  failed: {
    color: '#DC3545', // Red
    backgroundColor: '#F8D7DA',
    label: 'Failed',
    icon: '✕',
  },
};

const sizeConfig = {
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'medium',
}) => {
  const config = statusConfig[status];
  const sizeStyle = sizeConfig[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: config.color,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {config.icon} {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
  },
});
