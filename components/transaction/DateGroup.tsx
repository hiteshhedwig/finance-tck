import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../../constants';
import { TransactionItem } from './TransactionItem';
import type { Transaction } from '../../types';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

interface DateGroupProps {
  date: string;
  transactions: Transaction[];
}

function formatGroupDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEE, d MMM');
}

export function DateGroup({ date, transactions }: DateGroupProps) {
  const dayTotal = transactions.reduce((sum, t) => {
    if (t.type === 'expense') return sum - t.amount;
    if (t.type === 'income') return sum + t.amount;
    return sum;
  }, 0);

  return (
    <View style={styles.group}>
      <View style={styles.header}>
        <Text style={styles.date}>{formatGroupDate(date)}</Text>
        {dayTotal !== 0 && (
          <Text
            style={[
              styles.dayTotal,
              { color: dayTotal > 0 ? Colors.success : Colors.danger },
            ]}
          >
            {dayTotal > 0 ? '+' : ''}
            {dayTotal < 0 ? '-₹' : '₹'}
            {Math.abs(dayTotal).toLocaleString('en-IN')}
          </Text>
        )}
      </View>

      <View style={styles.items}>
        {transactions.map((t, i) => (
          <View key={t.id}>
            {i > 0 && <View style={styles.divider} />}
            <TransactionItem transaction={t} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  date: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayTotal: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  items: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginHorizontal: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
});
