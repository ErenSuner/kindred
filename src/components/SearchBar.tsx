import { useRef } from 'react';
import { StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, radius } from '@/theme/tokens';
import { Icon } from '@/components/Icon';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = 'Search' }: Props) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable style={styles.bar} onPress={() => inputRef.current?.focus()}>
      <Icon name="search" size={20} color={colors.onSurfaceVariant} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Animated.View entering={FadeIn.duration(150)}>
          <Pressable onPress={() => onChange('')} hitSlop={10}>
            <Icon name="close" size={18} color={colors.onSurfaceVariant} />
          </Pressable>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: colors.onSurface,
  },
});
