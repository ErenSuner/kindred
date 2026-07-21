import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeContext';

// A festive wash + scattered confetti for birthday cards. Sits absolutely
// behind the card's content — the host Card must set `overflow: 'hidden'`.
// Purely decorative and non-interactive; flecks hug the edges so the card's
// text stays legible over the middle.
const CONFETTI: {
  top: string;
  left: string;
  size: number;
  round: boolean;
  opacity: number;
  rot: string;
}[] = [
  { top: '10%', left: '86%', size: 8, round: true, opacity: 0.9, rot: '0deg' },
  { top: '24%', left: '70%', size: 6, round: false, opacity: 0.8, rot: '20deg' },
  { top: '7%', left: '54%', size: 5, round: true, opacity: 0.7, rot: '0deg' },
  { top: '68%', left: '92%', size: 7, round: false, opacity: 0.85, rot: '40deg' },
  { top: '82%', left: '74%', size: 5, round: true, opacity: 0.7, rot: '0deg' },
  { top: '46%', left: '95%', size: 6, round: false, opacity: 0.8, rot: '10deg' },
  { top: '88%', left: '38%', size: 5, round: true, opacity: 0.6, rot: '0deg' },
  { top: '58%', left: '82%', size: 5, round: false, opacity: 0.75, rot: '55deg' },
];

export function CelebrationBg({ tone = 'party' }: { tone?: 'party' | 'shared' }) {
  const { c } = useTheme();
  const gradient = tone === 'shared' ? c.sharedGradient : c.partyGradient;
  const dotColors =
    tone === 'shared'
      ? [c.sharedAccent, c.sharedDot, c.onInkMuted, c.flame]
      : [c.flame, c.partyDot, c.good, c.danger, c.onInkMuted];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={gradient as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.28 }]}
      />
      {CONFETTI.map((p, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: dotColors[i % dotColors.length],
              top: p.top as any,
              left: p.left as any,
              width: p.size,
              height: p.size,
              borderRadius: p.round ? p.size / 2 : 2,
              opacity: p.opacity,
              transform: [{ rotate: p.rot }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute' },
});
