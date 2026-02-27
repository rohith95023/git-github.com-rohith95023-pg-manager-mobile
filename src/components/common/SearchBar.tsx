import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, placeholder = 'Search' }) => (
  <View style={styles.container}>
    <Ionicons name="search-outline" size={20} color={Colors.TextSecondary} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={Colors.TextSecondary}
      value={value}
      onChangeText={onChangeText}
      returnKeyType="search"
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.Card,
    borderRadius: 14,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.Border,
    marginHorizontal: Spacing.lg,
  },
  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.TextPrimary,
    fontSize: 16,
  },
});

export default SearchBar;
