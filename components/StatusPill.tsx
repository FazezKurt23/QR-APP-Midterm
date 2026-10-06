import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';

const COLOR_MAP: Record<string, string> = {
  present: COLORS.success,
  open: COLORS.success,
  late: '#FB923C',
  excused: COLORS.warning,
  absent: COLORS.danger,
  closed: COLORS.danger,
};

export default function StatusPill({ status }: { status: string }) {
  const key = status.toLowerCase();
  const color = COLOR_MAP[key] ?? COLORS.textSecondary;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
