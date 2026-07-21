import { View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: value ? c.flame : c.surfaceAlt }]}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: value ? c.onFlame : c.faint,
            alignSelf: value ? 'flex-end' : 'flex-start',
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 4,
    justifyContent: 'center',
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
