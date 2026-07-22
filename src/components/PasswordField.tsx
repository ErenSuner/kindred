import { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeContext';
import { fonts } from '@/theme/type';
import { Txt } from '@/components/Txt';
import { Icon } from '@/components/Icon';
import { PASSWORD_MIN, strength } from '@/utils/password';

type Purpose = 'current' | 'new' | 'confirm';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  // Decides the autofill hints, which is the whole reason this is one component:
  // a field the phone's password manager can't see is a field people reuse a
  // weak password in.
  purpose?: Purpose;
  showStrength?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
};

// Autofill hints, per platform. iOS reads textContentType, Android reads
// autoComplete; both are needed or one of the two silently does nothing.
const HINTS: Record<Purpose, { autoComplete: TextInputProps['autoComplete']; textContentType: TextInputProps['textContentType'] }> = {
  current: { autoComplete: 'current-password', textContentType: 'password' },
  new: { autoComplete: 'new-password', textContentType: 'newPassword' },
  confirm: { autoComplete: 'new-password', textContentType: 'newPassword' },
};

/**
 * A password field that can reveal itself, offers itself to the phone's password
 * manager, and optionally shows how strong what's typed looks.
 *
 * Typing a new password blind is the fastest way to lock yourself out of your
 * own account, so the reveal is not a nicety.
 */
export function PasswordField({
  value,
  onChange,
  placeholder,
  purpose = 'new',
  showStrength,
  autoFocus,
  editable = true,
  onSubmitEditing,
  returnKeyType,
}: Props) {
  const { t } = useTranslation();
  const { c } = useTheme();
  const [reveal, setReveal] = useState(false);

  const score = strength(value);
  const tierLabel = score <= 1 ? t('strength_weak') : score < 4 ? t('strength_medium') : t('strength_strong');
  const tierColor = score <= 1 ? c.danger : score < 4 ? c.flame : c.good;

  return (
    <View>
      <View style={[styles.inputWrap, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Icon name="lock" size={20} color={c.faint} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder={placeholder}
          placeholderTextColor={c.faint}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!reveal}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoFocus={autoFocus}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          autoComplete={HINTS[purpose].autoComplete}
          textContentType={HINTS[purpose].textContentType}
          // Tells iOS's suggested-password generator what this account accepts,
          // so the password it offers is one the app won't then reject.
          passwordRules={purpose === 'current' ? undefined : `minlength: ${PASSWORD_MIN};`}
        />
        <Pressable
          onPress={() => setReveal((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={reveal ? t('hide_password') : t('show_password')}
        >
          <Icon name={reveal ? 'visibility-off' : 'visibility'} size={20} color={c.faint} />
        </Pressable>
      </View>

      {showStrength && value.length > 0 && (
        <View style={styles.strengthWrap}>
          <View style={styles.strengthBar}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[styles.strengthSeg, { backgroundColor: i < score ? tierColor : c.surfaceAlt }]}
              />
            ))}
          </View>
          <Txt variant="sub" color={c.muted}>
            {t('password_strength')}: {tierLabel}
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontFamily: fonts.figtreeRegular,
    fontSize: 16,
    height: '100%',
  },
  strengthWrap: { marginTop: 10, gap: 6 },
  strengthBar: { flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
});
