import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface TagProps {
  label: string;
  style?: ViewStyle;
}

export function Tag({ label, style }: TagProps) {
  return (
    <View style={[styles.tag, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: Colors.teal.tagBgAlpha,
    borderWidth: 0.5,
    borderColor: Colors.teal.tagBorderAlpha,
  },
  text: {
    fontSize: Typography.size.tag,
    fontWeight: Typography.weight.tag,
    color: Colors.teal.light,
  },
});
