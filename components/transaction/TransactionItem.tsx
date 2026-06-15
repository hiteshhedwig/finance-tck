import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { Transaction } from '../../types';
import { Colors, FontSize, Radius, Spacing, TRANSACTION_TYPE_COLORS, TRANSACTION_TYPE_LABELS } from '../../constants';
import { formatCurrency } from '../../lib/utils/cycle';

interface TransactionItemProps {
  transaction: Transaction;
}

function getAmountPrefix(t: Transaction): string {
  switch (t.type) {
    case 'income': return '+';
    case 'expense':
    case 'investment':
    case 'debt_payment':
    case 'cc_payment': return '-';
    case 'transfer': return '→';
    default: return '';
  }
}

function getAmountColor(t: Transaction): string {
  return TRANSACTION_TYPE_COLORS[t.type] ?? Colors.text;
}

export function TransactionItem({ transaction: t }: TransactionItemProps) {
  const router = useRouter();
  const color = getAmountColor(t);
  const prefix = getAmountPrefix(t);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/transaction/${t.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.iconText, { color }]}>
          {iconToEmoji(t.category?.icon) ?? typeIcon(t.type)}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{t.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {t.from_account?.name ?? ''}
          {t.type === 'transfer' && t.to_account ? ` → ${t.to_account.name}` : ''}
          {t.category ? ` · ${t.category.name}` : ''}
        </Text>
      </View>

      <View style={styles.amountBlock}>
        <Text style={[styles.amount, { color }]}>
          {prefix}
          {formatCurrency(t.amount)}
        </Text>
        <Text style={styles.type}>{TRANSACTION_TYPE_LABELS[t.type] ?? t.type}</Text>
      </View>
    </TouchableOpacity>
  );
}

const ICON_EMOJI: Record<string, string> = {
  briefcase: '💼',
  restaurant: '🍽️',
  cart: '🛒',
  car: '🚗',
  lightning: '⚡',
  bag: '🛍️',
  heart: '❤️',
  play: '🎬',
  airplane: '✈️',
  refresh: '🔄',
  person: '👤',
  people: '👥',
  calendar: '📅',
  'trending-up': '📈',
  cash: '💵',
  ellipsis: '•••',
  'credit-card': '💳',
  bank: '🏦',
};

function iconToEmoji(icon: string | null | undefined): string | undefined {
  if (!icon) return undefined;
  return ICON_EMOJI[icon];
}

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    income: '↓',
    expense: '↑',
    transfer: '→',
    investment: '◈',
    debt_payment: '⊙',
    cc_payment: '◉',
  };
  return map[type] ?? '•';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconText: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  amountBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  type: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
