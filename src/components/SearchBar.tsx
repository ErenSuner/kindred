import { useRef } from 'react';
import { StyleSheet, Pressable, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Icon } from '@/components/Icon';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChange, placeholder = 'Search' }: Props) {
  const inputRef = useRef<TextInput>(null);
  const { c } = useTheme();

  return (
    <Pressable
      style={[styles.bar, { backgroundColor: c.surface, borderColor: c.line }]}
      onPress={() => inputRef.current?.focus()}
    >
      <Icon name="search" size={20} color={c.faint} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.faint}
        style={[styles.input, { color: c.text }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Animated.View entering={FadeIn.duration(150)}>
          <Pressable onPress={() => onChange('')} hitSlop={10}>
            <Icon name="close" size={18} color={c.muted} />
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
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    padding: 0,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
  },
});
