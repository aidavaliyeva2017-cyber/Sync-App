import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search conversations...',
  onClear,
  style,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        isFocused && styles.focused,
        style,
      ]}
    >
      <Feather
        name="search"
        size={15}
        color={Colors.text.label}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.label}
        style={styles.input}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={15} color={Colors.text.label} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glass.default,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.glass.border,
    paddingHorizontal: 12,
    height: 40,
  },
  focused: {
    borderColor: Colors.teal.main,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.body,
    paddingVertical: 0,
  },
});
