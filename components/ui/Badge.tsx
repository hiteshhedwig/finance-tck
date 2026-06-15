import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontSize, Radius, Spacing } from '../../constants';

interface BadgeProps {
  label: string;
  color?: string;
  style?: ViewStyle;
}

export function Badge({ label, color = Colors.primary, style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
