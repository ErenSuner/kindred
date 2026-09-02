import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Icon } from '@/components/Icon';

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

// The whole bar is the tap target, not just the input inside it — a 16px-tall
// caret is not something to ask anyone to aim at.
export function SearchBar({ value, onChange, placeholder }: Props) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      style={[styles.bar, { backgroundColor: c.surface, borderColor: c.line }]}
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="search"
      accessibilityLabel={placeholder ?? t('search')}
    >
      <Icon name="search" size={20} color={c.faint} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? t('search')}
        placeholderTextColor={c.faint}
        style={[styles.input, { color: c.text }]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        // Cleared by the button below instead, so the control looks and behaves
        // the same on both platforms.
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Animated.View entering={FadeIn.duration(150)}>
          <Pressable
            onPress={() => onChange('')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('clear')}
          >
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
