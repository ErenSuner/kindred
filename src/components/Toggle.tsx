import { View, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: value ? colors.primaryContainer : colors.surfaceVariant }]}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: value ? colors.onPrimaryContainer : colors.outline,
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
